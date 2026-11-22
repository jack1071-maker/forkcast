import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Headline, MacroBar, s } from '@/components/bits';
import { MealList } from '@/components/meals';
import { AppState, DayResult, Entry, GoalType, Macros, dayKey, dayResult, entriesOn, parseDay, totals } from '@/lib/food';
import { ChevronIcon } from '@/components/icons';
import { C, F, resultColor, tapBuzz } from '@/lib/ui';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month calendar: aqua = on target, orange = over, empty = nothing logged. Tap a day to see it. */
export function History({
  state,
  initialDay,
  onEdit,
  onCopy,
}: {
  state: AppState;
  /** Open on this day instead of today. */
  initialDay?: string | null;
  onEdit: (entry: Entry) => void;
  /** Copy a meal from a past day into today. */
  onCopy: (items: Entry[]) => void;
}) {
  const today = dayKey();
  const [month, setMonth] = useState(() => {
    const d = initialDay ? parseDay(initialDay) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(initialDay ?? today);
  const goal = state.goals?.calories ?? 2000;
  const goalType = state.profile?.goal ?? 'lose';

  // Calories per day, so each calendar square knows its color.
  const perDay = new Map<string, number>();
  for (const e of state.entries) perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.calories);

  const first = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(first).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    tapBuzz();
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };
  const isFutureMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1) > new Date();

  const list = entriesOn(state, selected);
  const t = totals(list);
  const loggedThisMonth = cells.filter((c) => c && perDay.has(c)).length;

  return (
    <ScrollView contentContainerStyle={st.wrap}>
      <Headline>HISTORY</Headline>
      <Card>
        <View style={st.monthRow}>
          <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityLabel="Previous month">
            <ChevronIcon dir="left" size={22} color={C.text} />
          </Pressable>
          <Text style={st.month}>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
          <Pressable
            onPress={() => !isFutureMonth && shift(1)}
            hitSlop={12}
            accessibilityLabel="Next month"
            style={{ opacity: isFutureMonth ? 0.25 : 1 }}>
            <ChevronIcon size={22} color={C.text} />
          </Pressable>
        </View>
        <View style={st.grid}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={st.weekday}>
              {w}
            </Text>
          ))}
          {cells.map((c, i) => {
            if (!c) return <View key={i} style={st.cell} />;
            const cal = perDay.get(c);
            const bg = resultColor(dayResult(cal ?? 0, goal, goalType, c === today));
            const future = c > today;
            const isSel = c === selected;
            return (
              <Pressable
                key={i}
                disabled={future}
                onPress={() => {
                  tapBuzz();
                  setSelected(c);
                }}
                style={st.cell}>
                <View
                  style={[
                    st.dot,
                    { backgroundColor: bg },
                    c === today && cal == null && { borderColor: C.text, borderWidth: 1.5 },
                    isSel && { borderColor: C.text, borderWidth: 2 },
                  ]}>
                  <Text style={[st.dayNum, cal != null && { color: C.text }, future && { opacity: 0.3 }]}>
                    {parseDay(c).getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={st.legend}>
          <Legend color={C.good} label="On target" />
          <Legend color={C.over} label={goalType === 'gain' ? 'Under' : goalType === 'lose' ? 'Over' : 'Off target'} />
          <Legend color={C.ring} label="In progress" />
          <Text style={s.muted}>{loggedThisMonth} day{loggedThisMonth === 1 ? '' : 's'} logged</Text>
        </View>
      </Card>

      <Text style={st.section}>
        {parseDay(selected).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
      </Text>
      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={s.muted}>Nothing logged this day.</Text>
        </Card>
      ) : (
        <>
          <DaySummary
            totals={t}
            goals={state.goals ?? { calories: goal, protein: 0, carbs: 0, fat: 0 }}
            result={dayResult(t.calories, goal, goalType, selected === today)}
            goalType={goalType}
            items={list.length}
          />
          <MealList entries={list} onEdit={onEdit} onCopy={selected === today ? undefined : onCopy} />
        </>
      )}
    </ScrollView>
  );
}

/** The selected day at a glance: calories vs goal with a result badge, then each macro vs its target. */
function DaySummary({
  totals: t,
  goals,
  result,
  goalType,
  items,
}: {
  totals: Macros;
  goals: Macros;
  result: DayResult;
  goalType: GoalType;
  items: number;
}) {
  const badge =
    result === 'good'
      ? { text: 'On target', bg: C.good, fg: C.goodText }
      : result === 'missed'
        ? { text: goalType === 'gain' ? 'Under goal' : goalType === 'lose' ? 'Over goal' : 'Off target', bg: C.over, fg: C.overText }
        : { text: 'In progress', bg: C.ring, fg: C.text };
  const diff = t.calories - goals.calories;
  return (
    <Card>
      <View style={st.sumTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Calories</Text>
          <Text style={st.sumBig}>
            {t.calories.toLocaleString()}
            <Text style={st.sumGoal}> / {goals.calories.toLocaleString()} CAL</Text>
          </Text>
        </View>
        <View style={[st.badge, { backgroundColor: badge.bg + '55' }]}>
          <Text style={[st.badgeText, { color: badge.fg }]}>{badge.text}</Text>
        </View>
      </View>
      <View style={st.track}>
        <View
          style={[st.fill, { width: `${Math.min(1, t.calories / Math.max(1, goals.calories)) * 100}%`, backgroundColor: resultColor(result) }]}
        />
      </View>
      <Text style={s.muted}>
        {diff === 0 ? 'Exactly on goal' : `${Math.abs(diff).toLocaleString()} cal ${diff > 0 ? 'above' : 'below'} goal`} · {items} food
        {items === 1 ? '' : 's'}
      </Text>
      <View style={st.divider} />
      <View style={st.macros}>
        <MacroBar label="Protein" value={t.protein} goal={goals.protein} color={C.protein} />
        <MacroBar label="Carbs" value={t.carbs} goal={goals.carbs} color={C.carbs} />
        <MacroBar label="Fat" value={t.fat} goal={goals.fat} color={C.fat} />
      </View>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={s.muted}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { color: C.accent, fontSize: 32, fontFamily: F.semi, paddingHorizontal: 8 },
  month: { color: C.text, fontSize: 18, fontFamily: F.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: C.muted, fontSize: 12, fontFamily: F.bold, paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: '82%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.text, fontSize: 14, fontFamily: F.bold },
  legend: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' },
  section: { color: C.muted, fontSize: 12, fontFamily: F.semi, letterSpacing: 1.4, marginTop: 6 },
  sumTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sumBig: { color: C.text, fontFamily: F.head, fontSize: 36, marginTop: 2 },
  sumGoal: { color: C.muted, fontFamily: F.headSemi, fontSize: 16, letterSpacing: 0.5 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  badgeText: { fontFamily: F.semi, fontSize: 12, letterSpacing: 0.4 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 2 },
  macros: { flexDirection: 'row', gap: 16 },
});
