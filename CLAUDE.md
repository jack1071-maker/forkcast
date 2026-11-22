# Forkcast (cal-tracker)

Snap a photo of your food, see its calories and macros, log it toward a daily goal.
Expo SDK 58 + React Native + TypeScript + expo-router. Machine setup rules are in `../CLAUDE.md` (use `npx.cmd`/`npm.cmd`, `expo start --tunnel`, git no-reply email, `git commit -F <file>`).

## Plan (agreed with the user, 5-step framework)

1. Core function: snap your food and see its calories and macros.
2. Core loop: Snap → photo → AI estimate (editable) → Add → today's ring fills (< 30 s).
3. Accessory features: setup that computes a calorie target (Mifflin-St Jeor), manual add, recent foods, weight log + chart, calendar history.
4. Screens (5): Setup, Today, Snap & Review, History, Progress.
5. Retention hook: daily logging streak + "X kcal left" nudge. Meal reminders later.

Look (Ro-inspired, light; not a copy): warm off-white `#F6F5F2` background, white cards, near-black text and buttons, soft pastels for data (periwinkle ring `C.ring`, sage `C.good` / peach `C.over` with darker `goodText`/`overText` for text, sky/butter/lilac macros). Fonts: Barlow Condensed (headlines, big numbers, `F.head`) + Inter (everything else); custom fonts ignore `fontWeight`, so always use `F.*` families. No emojis in the UI: line icons in `src/components/icons.tsx`. Food is shown grouped by meal (`src/components/meals.tsx`, used by Today and History). Goal-aware colors: `dayResult()` in `src/lib/food.ts` (lose = at/under is good, gain = at/over is good, maintain = within 10%; today falling short is "pending") + `resultColor()` in `ui.ts`. Launch animation in `src/components/logo.tsx` (periwinkle ring fills around a dark fork; native splash shows only the fork at imageWidth 200). Web: status bar style `default` and `#root` padded with `env(safe-area-inset-*)` so nothing sits under the iPhone status bar / home bar. Name "Forkcast" is the user's own; never copy Cal AI's, WHOOP's or Ro's name, branding or exact screens.

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

- Supabase project `forkcast` (ref jutyqwzqjhdvndxzmpkz, ca-central-1) in the jack1071-maker org. Email accounts (confirm email OFF, anonymous sign-ins OFF), site URL = the live web app; all pushed from `supabase/config.toml` with `npx.cmd supabase config push --yes`. DB password in `.db-password` (gitignored).
- Photo AI needs an email account AND the invite code (secret `FORKCAST_INVITE_CODE`, also saved in `.invite-code`, gitignored). Accounts that entered it are in `ai_access`. To change it: `npx.cmd supabase secrets set FORKCAST_INVITE_CODE=new-code --yes`.
- Accounts + sync work like habit-tracker: `user_state` (one JSON row per user, RLS), `delete_my_account()`, `src/lib/cloud.ts`, `src/lib/use-account.ts`, `src/components/screens/auth.tsx`, sync logic in `src/app/index.tsx`. Account card + privacy link live on the Progress tab. Update `src/app/privacy.tsx` if the app starts collecting anything new.
- Barcodes: Claude returns any readable barcode digits; the function checks the checksum and looks it up in Open Food Facts (only the number is sent). A match uses the label's per-serving values (or per 100 g) and the app shows a "found in Open Food Facts" banner; otherwise the AI estimate is used.
- Limits: 10 photos per user, 50 total per UTC day (constants at the top of the function). The user chose these for a demo.
- `ANTHROPIC_API_KEY` is a Supabase function secret. The user's key is a personal key (`sk-ant-usr-...`, "forkcast-3") that **expires Dec 22, 2026**; when photos stop working, make a new key and replace the secret. $5 prepaid credit, no auto-reload.
- Never type or paste the key yourself. Copying from the in-app browser pane does NOT reach the user's clipboard, so have them copy/paste in their normal browser.
- Deploy: `npx.cmd supabase functions deploy analyze-food --use-api --yes`. DB changes: new file in `supabase/migrations`, then `npx.cmd supabase db push --remote --password <.db-password> --yes`. Logs: `npx.cmd supabase logs --remote --since 30m --output-format text`.
- `.env` holds the public URL + publishable key (gitignored). For `eas update` they must also be EAS env vars.

## Publishing

- GitHub (public): https://github.com/jack1071-maker/forkcast
- Web: the Home Screen white band was fixed by the `forkcast-fit` style that `scripts/add-web-tags.js` injects (black page pinned full screen). `npm.cmd run deploy:web` (exports, adds Home Screen tags with scripts/add-web-tags.js, deploys) → https://jack1071-forkcast.expo.app. Never add `src/app/+html.tsx`. Before deploying, check `dist/index.html` has 5 `<script` tags with `src=`.
- Phone (Expo Go): `npx.cmd eas-cli@latest update --branch main --environment production --message "..." --non-interactive`. EAS project @jack1071/forkcast (c36aaba3-4062-45e8-8ff2-ff923378e666); Supabase URL + publishable key are EAS production env vars (`eas update` ignores `.env`). Expo Go link: `exp://u.expo.dev/c36aaba3-4062-45e8-8ff2-ff923378e666?channel-name=main`. Keep `runtimeVersion.policy` = `sdkVersion`.
- Icons: `python scripts/make-icons.py` redraws every icon size.
- After a change works: commit + push, then phone update + web deploy so all three match.

## Next steps

- Ideas: meal reminders (notifications), README for the portfolio, security audit, delete the unused `forkcast`/`forkcast-2` Anthropic keys.

## Testing

- Browser: `npx.cmd expo start --web --port 8082`. The browser pane attaches via `../.claude/launch.json` ("forkcast-web"). In the web build the photo picker uses a hidden `input[type=file]`; tests can set its `files` and dispatch `change`.
- Phone: `npx.cmd expo start --tunnel`, scan the QR with the iPhone Camera app (opens Expo Go).
