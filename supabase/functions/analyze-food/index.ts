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
  },
  required: ['is_food', 'name', 'emoji', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
  additionalProperties: false,
};

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method', message: 'Use POST.' });

  // 1. Who is asking? Must be a signed-in Forkcast user (anonymous sign-in counts).
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = token ? await admin.auth.getUser(token) : { data: null, error: true };
  const user = auth?.user;
  if (authError || !user) return reply(401, { error: 'auth', message: 'Please reopen the app and try again.' });

  // 2. Is the photo sensible?
  let body: { image?: unknown; mediaType?: unknown };
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

  // 3. Under today's limits? (Counts this analysis if so.)
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

  // 4. Ask Claude.
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
    return reply(200, {
      isFood: true,
      name: String(out.name).slice(0, 60),
      emoji: String(out.emoji).slice(0, 8) || '🍽️',
      calories: n(out.calories),
      protein: n(out.protein),
      carbs: n(out.carbs),
      fat: n(out.fat),
      confidence: out.confidence,
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
