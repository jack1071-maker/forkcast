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
- `src/lib/analyze.ts`: photo → estimate. **Currently a stub** returning sample meals (`demo: true` shows a banner).
- `src/components/bits.tsx`: Ring, MacroBar, Button, Card, Choice, Field.
- `src/components/screens/*`: setup, today, review, history, progress.

## Next steps

- AI: Supabase Edge Function holds the Claude API key as a secret, checks the signed-in user, rate-limits analyses per user per day, calls Claude with the photo. The key must never be in the app. The user creates the Anthropic API key and pastes it into Supabase secrets themselves. Resize/compress photos before upload.
- Later: accounts + sync (own Supabase project, reuse habit-tracker's `src/lib/supabase.ts`/`cloud.ts` patterns), GitHub, EAS Update + web deploy (reuse `scripts/add-web-tags.js`; never add `src/app/+html.tsx`), privacy page, README.

## Testing

- Browser: `npx.cmd expo start --web --port 8082`. The browser pane attaches via `../.claude/launch.json` ("forkcast-web"). In the web build the photo picker uses a hidden `input[type=file]`; tests can set its `files` and dispatch `change`.
- Phone: `npx.cmd expo start --tunnel`, scan the QR with the iPhone Camera app (opens Expo Go).
