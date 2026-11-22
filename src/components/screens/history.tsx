import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Headline, s } from '@/components/bits';
import { FoodRow } from '@/components/screens/today';
import { AppState, dayKey, entriesOn, parseDay, totals } from '@/lib/food';
import { C, tapBuzz } from '@/lib/ui';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month calendar: aqua = on target, orange = over, empty = nothing logged. Tap a day to see it. */
export function History({ state }: { state: AppState }) {
  const today = dayKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);
  const goal = state.goals?.calories ?? 2000;

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
            <Text style={st.arrow}>‹</Text>
          </Pressable>
          <Text style={st.month}>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</Text>
          <Pressable
            onPress={() => !isFutureMonth && shift(1)}
            hitSlop={12}
            accessibilityLabel="Next month"
            style={{ opacity: isFutureMonth ? 0.25 : 1 }}>
            <Text style={st.arrow}>›</Text>
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
            const kcal = perDay.get(c);
            const bg = kcal == null ? 'transparent' : kcal > goal * 1.05 ? C.over : C.accent;
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
                    c === today && kcal == null && { borderColor: C.accent, borderWidth: 1.5 },
                    isSel && { borderColor: C.text, borderWidth: 2 },
                  ]}>
                  <Text style={[st.dayNum, kcal != null && { color: C.onAccent }, future && { opacity: 0.3 }]}>
                    {parseDay(c).getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={st.legend}>
          <Legend color={C.accent} label="On target" />
          <Legend color={C.over} label="Over" />
          <Text style={s.muted}>{loggedThisMonth} day{loggedThisMonth === 1 ? '' : 's'} logged</Text>
        </View>
      </Card>

      <Text style={st.section}>
        {parseDay(selected).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
      </Text>
      {list.length === 0 ? (
        <Text style={s.muted}>Nothing logged this day.</Text>
      ) : (
        <>
          <Text style={s.body}>
            {t.calories.toLocaleString()} / {goal.toLocaleString()} kcal · P {t.protein} · C {t.carbs} · F {t.fat}
          </Text>
          {list.map((e) => (
            <FoodRow key={e.id} entry={e} />
          ))}
        </>
      )}
    </ScrollView>
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
  arrow: { color: C.accent, fontSize: 32, fontWeight: '600', paddingHorizontal: 8 },
  month: { color: C.text, fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '700', paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: '82%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.text, fontSize: 14, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' },
  section: { color: C.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
});
