import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Headline, MacroBar, Ring, s } from '@/components/bits';
import { CameraIcon, CopyIcon, FlameIcon, GlassIcon, StarIcon, mealFor } from '@/components/icons';
import { MealList } from '@/components/meals';
import {
  AppState,
  Entry,
  GoalType,
  ML_PER_GLASS,
  SavedFood,
  addDays,
  dayKey,
  dayResult,
  entriesOn,
  logStreak,
  parseDay,
  totals,
  weekDays,
} from '@/lib/food';
import { C, F, R, resultColor, tapBuzz } from '@/lib/ui';

export function Today({
  state,
  onSnap,
  onManual,
  onEdit,
  onQuickAdd,
  onCopyMeal,
  onWater,
  onOpenDay,
}: {
  state: AppState;
  onSnap: () => void;
  onManual: () => void;
  onEdit: (entry: Entry) => void;
  /** One-tap add of a starred food. */
  onQuickAdd: (food: SavedFood) => void;
  /** Copy a past meal's foods into today. */
  onCopyMeal: (items: Entry[]) => void;
  onWater: (glasses: number) => void;
  /** Open a past day in History. */
  onOpenDay: (day: string) => void;
}) {
  const goals = state.goals!;
  const today = dayKey();
  const list = entriesOn(state, today);
  const t = totals(list);
  const left = goals.calories - t.calories;
  const over = left < 0;
  const goalType = state.profile?.goal ?? 'lose';
  const result = dayResult(t.calories, goals.calories, goalType, true);
  // Red only when the day went the wrong way for your goal; green once a gain/maintain goal is reached.
  const ringColor = result === 'missed' ? C.over : result === 'good' && goalType !== 'lose' ? C.good : C.ring;
  const pctColor = result === 'missed' ? C.overText : result === 'good' && t.calories > 0 ? C.goodText : C.text;
  const streak = logStreak(state);
  const pct = Math.round((t.calories / goals.calories) * 100);
  const dateLabel = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  // Quick add: yesterday's meals that aren't logged yet today, then starred foods.
  const loggedMeals = new Set(list.map((e) => mealFor(new Date(e.time)).label));
  const yesterdayMeals: { label: string; items: Entry[]; calories: number }[] = [];
  for (const e of entriesOn(state, addDays(today, -1))) {
    const label = mealFor(new Date(e.time)).label;
    if (loggedMeals.has(label)) continue;
    let g = yesterdayMeals.find((m) => m.label === label);
    if (!g) yesterdayMeals.push((g = { label, items: [], calories: 0 }));
    g.items.push(e);
    g.calories += e.calories;
  }
  const favorites = state.favorites ?? [];

  return (
    <ScrollView contentContainerStyle={st.wrap}>
      <View style={st.top}>
        <View>
          <Text style={st.date}>{dateLabel}</Text>
          <Headline size={36}>Today</Headline>
        </View>
        <View style={st.streak}>
          <FlameIcon size={16} color={streak > 0 ? C.carbs : C.muted} />
          <Text style={st.streakText}>
            {streak}
            <Text style={st.streakUnit}> DAY{streak === 1 ? '' : 'S'}</Text>
          </Text>
        </View>
      </View>

      <WeekStrip state={state} today={today} onOpenDay={onOpenDay} />

      <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
        <Text style={st.label}>Calories</Text>
        <Ring progress={t.calories / goals.calories} color={ringColor} size={220} stroke={14}>
          <Text style={st.big}>{Math.abs(left).toLocaleString()}</Text>
          <Text style={st.bigUnit}>{!over ? 'CAL LEFT' : goalType === 'gain' ? 'CAL ABOVE GOAL' : 'CAL OVER'}</Text>
        </Ring>
        <View style={st.statsRow}>
          <Stat value={t.calories.toLocaleString()} label="Eaten" />
          <View style={st.divider} />
          <Stat value={goals.calories.toLocaleString()} label="Goal" />
          <View style={st.divider} />
          <Stat value={`${pct}%`} label="Of goal" color={pctColor} />
        </View>
      </Card>

      <Card>
        <Text style={st.label}>Macros</Text>
        <View style={st.macros}>
          <MacroBar label="Protein" value={t.protein} goal={goals.protein} color={C.protein} />
          <MacroBar label="Carbs" value={t.carbs} goal={goals.carbs} color={C.carbs} />
          <MacroBar label="Fat" value={t.fat} goal={goals.fat} color={C.fat} />
        </View>
      </Card>

      <Water
        glasses={state.water?.[today] ?? 0}
        goal={state.waterGoal ?? 8}
        metric={state.profile?.units === 'metric'}
        onChange={onWater}
      />

      <Text style={st.nudge}>{nudge(list.length, left, goalType)}</Text>

      <Button title="Snap your food" icon={(c) => <CameraIcon size={20} color={c} />} onPress={onSnap} />
      <Button title="Add without a photo" kind="secondary" onPress={onManual} />

      {yesterdayMeals.length > 0 || favorites.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[st.label, { marginTop: 4 }]}>Quick add</Text>
          <View style={st.quickWrap}>
            {yesterdayMeals.map((m) => (
              <QuickChip
                key={m.label}
                icon={<CopyIcon size={14} color={C.text} />}
                text={`Yesterday's ${m.label.toLowerCase()}`}
                cal={m.calories}
                label={`Copy yesterday's ${m.label.toLowerCase()} to today`}
                onPress={() => onCopyMeal(m.items)}
              />
            ))}
            {favorites.map((f) => (
              <QuickChip
                key={f.name}
                icon={<StarIcon size={14} color={C.star} filled />}
                text={f.name}
                cal={f.calories}
                label={`Add ${f.name} to today`}
                onPress={() => onQuickAdd(f)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Text style={[st.label, { marginTop: 10 }]}>Today&apos;s food</Text>
      {list.length === 0 ? (
        <Text style={s.muted}>Nothing logged yet. Your first meal starts the day&apos;s count.</Text>
      ) : (
        <MealList entries={list} onEdit={onEdit} />
      )}
    </ScrollView>
  );
}

/** The last 7 days: a small ring per day, filled by calories and colored by the goal result. */
function WeekStrip({ state, today, onOpenDay }: { state: AppState; today: string; onOpenDay: (day: string) => void }) {
  const goal = state.goals?.calories ?? 2000;
  const type = state.profile?.goal ?? 'lose';
  return (
    <View style={st.week}>
      {weekDays(today).map((d) => {
        const cal = totals(entriesOn(state, d)).calories;
        const result = dayResult(cal, goal, type, d === today);
        const isToday = d === today;
        const future = d > today;
        const date = parseDay(d);
        return (
          <Pressable
            key={d}
            disabled={future || isToday}
            onPress={() => {
              tapBuzz();
              onOpenDay(d);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${date.toLocaleDateString([], { weekday: 'long' })}: ${cal ? `${cal} cal` : 'nothing logged'}`}
            style={[st.weekDay, isToday && st.weekToday, future && { opacity: 0.35 }]}>
            <Text style={[st.weekLetter, isToday && { color: C.text }]}>
              {date.toLocaleDateString([], { weekday: 'short' }).slice(0, 1)}
            </Text>
            <Ring size={34} stroke={3.5} progress={cal / goal} color={resultColor(result)}>
              <Text style={st.weekNum}>{date.getDate()}</Text>
            </Ring>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Water: one glass per tap. Tapping the last filled glass empties it again. */
function Water({
  glasses,
  goal,
  metric,
  onChange,
}: {
  glasses: number;
  goal: number;
  metric: boolean;
  onChange: (n: number) => void;
}) {
  const shown = Math.max(goal, glasses);
  const amount = metric ? `${Math.round(glasses * ML_PER_GLASS) / 1000} L` : `${glasses * 8} oz`;
  return (
    <Card>
      <View style={st.waterTop}>
        <Text style={st.label}>Water</Text>
        <Text style={st.waterCount}>
          {glasses}
          <Text style={st.waterGoal}> / {goal} GLASSES · {amount.toUpperCase()}</Text>
        </Text>
      </View>
      <View style={st.glasses}>
        {Array.from({ length: shown }, (_, i) => {
          const full = i < glasses;
          return (
            <Pressable
              key={i}
              hitSlop={4}
              onPress={() => {
                tapBuzz();
                onChange(glasses === i + 1 ? i : i + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel={full ? `Remove glass ${i + 1}` : `Log glass ${i + 1}`}
              style={({ pressed }) => [st.glass, pressed && { transform: [{ scale: 0.9 }] }]}>
              <GlassIcon size={26} level={full ? 0.8 : 0} fill={C.water} color={full ? C.text : C.muted} />
            </Pressable>
          );
        })}
        {glasses >= goal ? (
          <Pressable
            hitSlop={4}
            onPress={() => {
              tapBuzz();
              onChange(glasses + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Log another glass"
            style={[st.glass, st.morePill]}>
            <Text style={st.more}>+1</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function QuickChip({
  icon,
  text,
  cal,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  text: string;
  cal: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [st.chip, pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] }]}>
      {icon}
      <Text style={st.chipText} numberOfLines={1}>
        {text}
      </Text>
      <Text style={st.chipCal}>{cal.toLocaleString()}</Text>
    </Pressable>
  );
}

function Stat({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[st.statValue, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function nudge(count: number, left: number, goal: GoalType) {
  if (count === 0) return 'Log your first meal to keep your streak going.';
  const n = Math.abs(left).toLocaleString();
  if (goal === 'gain') {
    if (left <= 0) return `Goal reached, ${n} cal above it. Great for gaining.`;
    return `Eat ${n} more cal to hit your gain goal today.`;
  }
  if (Math.abs(left) < 150) return 'Right on target. Nicely done.';
  if (left < 0) return `You're ${n} cal over today. Tomorrow's a fresh start.`;
  return `You have ${n} cal left today.`;
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  date: { color: C.muted, fontFamily: F.semi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  streakText: { color: C.text, fontFamily: F.head, fontSize: 18 },
  streakUnit: { color: C.muted, fontFamily: F.headSemi, fontSize: 13, letterSpacing: 0.8 },
  label: {
    color: C.muted,
    fontFamily: F.semi,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  big: { fontFamily: F.head, color: C.text, fontSize: 64, lineHeight: 70, letterSpacing: 0.5 },
  bigUnit: { fontFamily: F.headSemi, color: C.muted, fontSize: 15, letterSpacing: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 8 },
  divider: { width: 1, height: 30, backgroundColor: C.line },
  statValue: { fontFamily: F.head, fontSize: 24 },
  statLabel: { color: C.muted, fontFamily: F.semi, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  macros: { flexDirection: 'row', gap: 16, alignSelf: 'stretch' },
  nudge: { color: C.muted, fontSize: 14, fontFamily: F.medium, textAlign: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 3, borderRadius: R.md, minWidth: 42 },
  weekToday: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  weekLetter: { color: C.muted, fontFamily: F.semi, fontSize: 11, letterSpacing: 1 },
  weekNum: { color: C.text, fontFamily: F.semi, fontSize: 12 },
  waterTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  waterCount: { color: C.text, fontFamily: F.head, fontSize: 22 },
  waterGoal: { color: C.muted, fontFamily: F.headSemi, fontSize: 13, letterSpacing: 0.8 },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignItems: 'center' },
  glass: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  morePill: { borderRadius: 999, backgroundColor: C.cardHi, width: 38, height: 30 },
  more: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 9,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  chipText: { color: C.text, fontFamily: F.semi, fontSize: 14, flexShrink: 1 },
  chipCal: { color: C.muted, fontFamily: F.medium, fontSize: 13 },
});
