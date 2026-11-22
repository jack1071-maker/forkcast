// Forkcast: analyze-food Edge Function.
// Takes a food photo from a signed-in user, checks the daily limits,
// asks Claude for a calorie/macro estimate and returns it.
// The Anthropic API key lives only here, as the ANTHROPIC_API_KEY secret.

import Anthropic from 'npm:@anthropic-ai/sdk@1.12.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

/** Photos each person can analyze per day (UTC), and for everyone together. */
const USER_DAILY_LIMIT = 10;
const TOTAL_DAILY_LIMIT = 50;
/** About 5 MB of photo once decoded. The app shrinks photos well below this. */
const MAX_BASE64_LENGTH = 7_000_000;
/** Shared code you give to friends; set with `supabase secrets set FORKCAST_INVITE_CODE=...`. */
const INVITE_CODE = (Deno.env.get('FORKCAST_INVITE_CODE') ?? '').trim().toLowerCase();
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const SYSTEM = `You estimate the nutrition of food in a photo for a calorie-tracking app.
Identify the food and estimate the portion actually shown, using plates, hands, cutlery and packaging for scale.
Give totals for everything visible as one serving: calories (kcal) and grams of protein, carbs and fat, as whole numbers.
Keep the name short and plain (under 40 characters), like "Chicken burrito bowl" or "2 slices pepperoni pizza".
Pick one emoji that fits the food.
If a product barcode (EAN or UPC) is clearly readable, copy its digits exactly into barcode (digits only). If you can't read every digit with confidence, leave barcode empty; never guess digits.
A photo of just a packaged food or its barcode counts as food: estimate one serving from the label if you can read it.
If the photo shows no food or drink, set is_food to false and use 0 for the numbers.`;

const SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    name: { type: 'string' },
    emoji: { type: 'string' },
    calories: { type: 'integer' },
    protein: { type: 'integer' },
    carbs: { type: 'integer' },
    fat: { type: 'integer' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    barcode: { type: 'string' },
  },
  required: ['is_food', 'name', 'emoji', 'calories', 'protein', 'carbs', 'fat', 'confidence', 'barcode'],
  additionalProperties: false,
};

/** True if the digits are a real EAN-8, UPC-A (12) or EAN-13 code (the last digit is a checksum). */
function validBarcode(code: string) {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((t, d, i) => t + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

type Label = { name: string; calories: number; protein: number; carbs: number; fat: number; serving: string };

/**
 * Looks a barcode up in Open Food Facts (openfoodfacts.org), a free public database of packaged foods.
 * Only the barcode number is sent. Returns the label's numbers for one serving, or null if not found.
 */
async function lookupBarcode(code: string): Promise<Label | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity`,
      { headers: { 'User-Agent': 'Forkcast/1.0 (calorie tracker)' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.product;
    const nut = p?.nutriments;
    if (data?.status !== 1 || !p?.product_name || !nut) return null;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v));
    // Prefer the label's "per serving" numbers; otherwise scale "per 100 g" by the serving size.
    const servingG = num(p.serving_quantity);
    const per = (key: string) => {
      const serving = num(nut[`${key}_serving`]);
      if (Number.isFinite(serving)) return serving;
      const per100 = num(nut[`${key}_100g`]);
      if (!Number.isFinite(per100)) return NaN;
      return Number.isFinite(servingG) && servingG > 0 ? (per100 * servingG) / 100 : per100;
    };
    const calories = per('energy-kcal');
    if (!Number.isFinite(calories)) return null;
    const hasServing = Number.isFinite(num(nut['energy-kcal_serving'])) || (Number.isFinite(servingG) && servingG > 0);
    const brand = String(p.brands ?? '').split(',')[0].trim();
    const name = String(p.product_name).trim();
    const r = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
    return {
      // Add the brand only if the name doesn't already include it ("Coca-Cola Original" stays as is).
      name: (brand && !name.toLowerCase().includes(brand.toLowerCase().split(/\s+/)[0]) ? `${brand} ${name}` : name).slice(0, 60),
      calories: r(calories),
      protein: r(per('proteins')),
      carbs: r(per('carbohydrates')),
      fat: r(per('fat')),
      serving: hasServing ? String(p.serving_size || `${servingG} g`) : '100 g',
    };
  } catch {
    return null; // Database slow or down: fall back to the AI estimate.
  }
}

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });

  // 1. Who is asking? Must be signed in with a real (email) Forkcast account.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = token ? await admin.auth.getUser(token) : { data: null, error: true };
  const user = auth?.user;
  if (authError || !user || user.is_anonymous) {
    return reply(401, { error: 'auth', message: 'Sign in to your Forkcast account to use photo estimates.' });
  }

  // 2. Is the photo sensible?
  let body: { image?: unknown; mediaType?: unknown; inviteCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_request', message: 'No photo was sent.' });
  }
  const image = typeof body.image === 'string' ? body.image : '';
  const mediaType = (MEDIA_TYPES as readonly string[]).includes(String(body.mediaType))
    ? (body.mediaType as MediaType)
    : null;
  if (!image || !mediaType) return reply(400, { error: 'bad_request', message: 'No photo was sent.' });
  if (image.length > MAX_BASE64_LENGTH) return reply(413, { error: 'too_big', message: 'That photo is too large.' });

  // 3. Has this account unlocked the photo AI with the invite code?
  const { data: access } = await admin.from('ai_access').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!access) {
    const tried = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toLowerCase() : '';
    if (!tried) {
      return reply(403, { error: 'invite_needed', message: 'Enter your invite code to unlock photo estimates.' });
    }
    if (!INVITE_CODE || tried !== INVITE_CODE) {
      return reply(403, { error: 'invite_wrong', message: "That invite code isn't right. Check it and try again." });
    }
    await admin.from('ai_access').upsert({ user_id: user.id });
  }

  // 4. Under today's limits? (Counts this analysis if so.)
  const { data: claim, error: claimError } = await admin.rpc('claim_ai_analysis', {
    p_user: user.id,
    p_user_limit: USER_DAILY_LIMIT,
    p_total_limit: TOTAL_DAILY_LIMIT,
  });
  if (claimError) {
    console.error('claim failed', claimError);
    return reply(500, { error: 'server', message: 'Something went wrong. Please try again.' });
  }
  if (claim === 'user_limit') {
    return reply(429, {
      error: 'user_limit',
      message: `You've used all ${USER_DAILY_LIMIT} photo estimates for today. You can still add food by hand.`,
    });
  }
  if (claim === 'total_limit') {
    return reply(429, {
      error: 'total_limit',
      message: 'Forkcast has hit its photo limit for today. You can still add food by hand.',
    });
  }

  // 5. Ask Claude.
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the main model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Estimate the nutrition for this meal.' },
          ],
        },
      ],
    } as never);

    // deno-lint-ignore no-explicit-any
    const res = response as any;
    if (res.stop_reason === 'refusal') {
      await admin.rpc('refund_ai_analysis', { p_user: user.id });
      return reply(422, { error: 'refused', message: "Couldn't analyze that photo. Try another, or add it by hand." });
    }
    // deno-lint-ignore no-explicit-any
    const text = (res.content as any[]).find((b) => b.type === 'text')?.text;
    const out = JSON.parse(text);

    if (!out.is_food) {
      return reply(200, { isFood: false, message: "That doesn't look like food. Try another photo." });
    }
    const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

    // Barcode in the photo? Use the product's real label numbers from the online database.
    const code = String(out.barcode ?? '').replace(/\D/g, '');
    if (validBarcode(code)) {
      const label = await lookupBarcode(code);
      if (label) {
        return reply(200, {
          isFood: true,
          name: label.name,
          emoji: String(out.emoji).slice(0, 8) || '🍽️',
          calories: label.calories,
          protein: label.protein,
          carbs: label.carbs,
          fat: label.fat,
          confidence: 'high',
          from: 'database',
          barcode: code,
          serving: label.serving,
        });
      }
    }

    return reply(200, {
      isFood: true,
      name: String(out.name).slice(0, 60),
      emoji: String(out.emoji).slice(0, 8) || '🍽️',
      calories: n(out.calories),
      protein: n(out.protein),
      carbs: n(out.carbs),
      fat: n(out.fat),
      confidence: out.confidence,
      from: 'ai',
      barcode: validBarcode(code) ? code : undefined,
    });
  } catch (err) {
    await admin.rpc('refund_ai_analysis', { p_user: user.id });
    if (err instanceof Anthropic.AuthenticationError) {
      console.error(`Anthropic key missing or wrong (${err.status}):`, err.message);
    } else if (err instanceof Anthropic.RateLimitError) {
      console.error('Anthropic rate limit');
    } else if (err instanceof Anthropic.APIError) {
      console.error(`Anthropic error ${err.status}:`, err.message);
    } else {
      console.error('analyze failed', err);
    }
    return reply(502, { error: 'ai', message: "The food AI isn't available right now. You can add this by hand." });
  }
});
