import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- The data model ----------

export type Sex = 'male' | 'female';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type Units = 'imperial' | 'metric';

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Activity multiplier: 1.2 (desk job) up to 1.725 (very active). */
  activity: number;
  goal: GoalType;
  units: Units;
};

export type Macros = { calories: number; protein: number; carbs: number; fat: number };

export type Entry = Macros & {
  id: string;
  /** Local date the food was eaten, like "2026-11-22". */
  day: string;
  /** Exact time it was logged (ISO string). */
  time: string;
  name: string;
  emoji: string;
  source: 'photo' | 'manual';
};

export type WeighIn = { day: string; kg: number };

export type AppState = {
  version: 1;
  profile: Profile | null;
  goals: Macros | null;
  entries: Entry[];
  weights: WeighIn[];
};

export const EMPTY_STATE: AppState = { version: 1, profile: null, goals: null, entries: [], weights: [] };

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Mostly sitting', hint: 'Desk job, little exercise' },
  { value: 1.375, label: 'Lightly active', hint: 'Exercise 1–3 days a week' },
  { value: 1.55, label: 'Active', hint: 'Exercise 3–5 days a week' },
  { value: 1.725, label: 'Very active', hint: 'Hard exercise 6–7 days a week' },
];

// ---------- The maths ----------

/**
 * Daily calorie and macro targets.
 * Calories: Mifflin-St Jeor equation for resting burn (BMR), times activity,
 * then -500 to lose about 0.5 kg (1 lb) a week, or +300 to gain slowly.
 * Macros: protein 1.8 g per kg of body weight, fat 27% of calories, carbs fill the rest.
 */
export function computeGoals(p: Profile): Macros {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const adjust = p.goal === 'lose' ? -500 : p.goal === 'gain' ? 300 : 0;
  const calories = Math.max(1200, Math.round((bmr * p.activity + adjust) / 10) * 10);
  const protein = Math.round(Math.min(p.weightKg * 1.8, (calories * 0.35) / 4));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

/**
 * Did this day go the way the goal wants?
 * - lose: staying at or under the target is good (up to 5% over is close enough).
 * - gain: reaching or beating the target is good (within 5% short is close enough).
 * - maintain: within 10% either side is good.
 * Today isn't finished, so falling short today is 'pending' rather than a miss.
 */
export type DayResult = 'good' | 'missed' | 'pending' | 'empty';

export function dayResult(calories: number, goal: number, type: GoalType, isToday = false): DayResult {
  if (calories <= 0 || goal <= 0) return 'empty';
  const r = calories / goal;
  const ok = type === 'lose' ? r <= 1.05 : type === 'gain' ? r >= 0.95 : r >= 0.9 && r <= 1.1;
  if (ok) return 'good';
  const short = type === 'gain' ? r < 0.95 : type === 'maintain' && r < 0.9;
  return isToday && short ? 'pending' : 'missed';
}

export function totals(entries: Entry[]): Macros {
  return entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function entriesOn(state: AppState, day: string) {
  return state.entries.filter((e) => e.day === day).sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Days in a row with at least one food logged.
 * If today has nothing yet, count from yesterday, so the streak isn't lost until a whole day is missed.
 */
export function logStreak(state: AppState, today = dayKey()) {
  const logged = new Set(state.entries.map((e) => e.day));
  let day = logged.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** The most recent distinct foods, for one-tap re-logging. */
export function recentFoods(state: AppState, limit = 8): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const e of [...state.entries].sort((a, b) => b.time.localeCompare(a.time))) {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Dates and units ----------

/** Local date as "YYYY-MM-DD". */
export function dayKey(d = new Date()) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

export function showWeight(kg: number, units: Units) {
  return units === 'imperial' ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Saving on the device ----------

const KEY = 'forkcast-state-v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: AppState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: keep going; the app still works for this session.
  }
}
