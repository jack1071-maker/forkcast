# Forkcast (cal-tracker)

Snap a photo of your food, see its calories and macros, log it toward a daily goal.
Expo SDK 58 + React Native + TypeScript + expo-router. Machine setup rules are in `../CLAUDE.md` (use `npx.cmd`/`npm.cmd`, `expo start --tunnel`, git no-reply email, `git commit -F <file>`).

## Plan (agreed with the user, 5-step framework)

1. Core function: snap your food and see its calories and macros.
2. Core loop: Snap → photo → AI estimate (editable) → Add → today's ring fills (< 30 s).
3. Accessory features: setup that computes a calorie target (Mifflin-St Jeor), manual add, recent foods, weight log + chart, calendar history.
4. Screens (5): Setup, Today, Snap & Review, History, Progress.
5. Retention hook: daily logging streak + "X kcal left" nudge. Meal reminders later.

Look: dark navy + aqua (`src/lib/ui.ts`), Anton headlines. Name "Forkcast" is the user's own; never copy Cal AI's name, branding or look.

## Code map

- `src/app/index.tsx`: the brain. Holds the whole app state, picks the screen (tabs + overlays), saves to the device.
- `src/lib/food.ts`: data model, calorie/macro maths, streak, dates/units, AsyncStorage load/save (key `forkcast-state-v1`). Weights stored in kg, heights in cm; `profile.units` decides display.
- `src/lib/analyze.ts`: photo → estimate. Shrinks the photo (1024 px JPEG), signs in silently, calls the `analyze-food` Edge Function. Falls back to sample meals only when `.env` is missing (`demo: true` banner).
- `src/lib/supabase.ts`: Supabase client + `ensureSignedIn()` (anonymous sign-in, no email screens).
- `supabase/functions/analyze-food/index.ts`: checks the user, enforces limits, calls Claude (`claude-opus-5-5`, effort low, JSON schema output, server-side fallbacks), refunds the count on failure.
- `supabase/migrations/*_ai_usage.sql`: `ai_usage` table (RLS on, no policies) + `claim_ai_analysis` / `refund_ai_analysis` (service role only).
- `src/components/bits.tsx`: Ring, MacroBar, Button, Card, Choice, Field.
- `src/components/screens/*`: setup, today, review, history, progress.

## AI setup (done)

- Supabase project `forkcast` (ref jutyqwzqjhdvndxzmpkz, ca-central-1) in the jack1071-maker org. Anonymous sign-ins ON (pushed from `supabase/config.toml`). DB password in `.db-password` (gitignored).
- Limits: 10 photos per user, 50 total per UTC day (constants at the top of the function). The user chose these for a demo.
- `ANTHROPIC_API_KEY` is a Supabase function secret. The user's key is a personal key (`sk-ant-usr-...`, "forkcast-3") that **expires Dec 22, 2026**; when photos stop working, make a new key and replace the secret. $5 prepaid credit, no auto-reload.
- Never type or paste the key yourself. Copying from the in-app browser pane does NOT reach the user's clipboard, so have them copy/paste in their normal browser.
- Deploy: `npx.cmd supabase functions deploy analyze-food --use-api --yes`. DB changes: new file in `supabase/migrations`, then `npx.cmd supabase db push --remote --password <.db-password> --yes`. Logs: `npx.cmd supabase logs --remote --since 30m --output-format text`.
- `.env` holds the public URL + publishable key (gitignored). For `eas update` they must also be EAS env vars.

## Next steps

- Later: email accounts + sync (anonymous users can be upgraded), GitHub, EAS Update + web deploy (reuse habit-tracker's `scripts/add-web-tags.js`; never add `src/app/+html.tsx`), privacy page (photos go to Anthropic), README.

## Testing

- Browser: `npx.cmd expo start --web --port 8082`. The browser pane attaches via `../.claude/launch.json` ("forkcast-web"). In the web build the photo picker uses a hidden `input[type=file]`; tests can set its `files` and dispatch `change`.
- Phone: `npx.cmd expo start --tunnel`, scan the QR with the iPhone Camera app (opens Expo Go).
