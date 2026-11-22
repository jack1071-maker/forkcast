import { useState } from 'react';
import { LayoutChangeEvent, Platform, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { Button, Card, Field, Headline, num, s } from '@/components/bits';
import { AppState, addDays, dayKey, entriesOn, kgToLb, lbToKg, parseDay, showWeight, totals } from '@/lib/food';
import { C } from '@/lib/ui';

export function Progress({
  state,
  onWeigh,
  onEditGoals,
  onReset,
}: {
  state: AppState;
  onWeigh: (kg: number) => void;
  onEditGoals: () => void;
  onReset: () => void;
}) {
  const units = state.profile?.units ?? 'imperial';
  const [w, setW] = useState('');
  const [width, setWidth] = useState(300);
  const weights = [...state.weights].sort((a, b) => a.day.localeCompare(b.day));
  const start = weights[0];
  const latest = weights[weights.length - 1];
  const toShow = (kg: number) => (units === 'imperial' ? kgToLb(kg) : kg);

  // Last 7 days of calories for the bar chart.
  const today = dayKey();
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, kcal: totals(entriesOn(state, day)).calories };
  });
  const goal = state.goals?.calories ?? 2000;
  const logged = week.filter((d) => d.kcal > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : 0;

  const save = () => {
    const v = num(w);
    const kg = units === 'imperial' ? lbToKg(v) : v;
    if (kg < 30 || kg > 300) return;
    onWeigh(kg);
    setW('');
  };

  const confirmReset = () => {
    const msg = 'This deletes all your food, weights and goals on this device. It cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) onReset();
      return;
    }
    Alert.alert('Start over?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: onReset },
    ]);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <Headline>PROGRESS</Headline>

      <Card>
        <Text style={s.fieldLabel}>WEIGHT</Text>
        <View style={st.stats}>
          <Stat label="Start" value={start ? showWeight(start.kg, units) : '—'} />
          <Stat label="Now" value={latest ? showWeight(latest.kg, units) : '—'} />
          <Stat
            label="Change"
            value={
              start && latest
                ? `${toShow(latest.kg) - toShow(start.kg) > 0 ? '+' : ''}${(toShow(latest.kg) - toShow(start.kg)).toFixed(1)}`
                : '—'
            }
          />
        </View>
        <View onLayout={onLayout}>
          {weights.length >= 2 ? (
            <WeightChart values={weights.map((x) => toShow(x.kg))} width={width} />
          ) : (
            <Text style={s.muted}>Log your weight on two different days to see your trend line.</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field
            label="Today's weight"
            value={w}
            onChange={setW}
            suffix={units === 'imperial' ? 'lb' : 'kg'}
            style={{ flex: 1 }}
          />
          <Button title="Save" onPress={save} disabled={!num(w)} style={{ paddingVertical: 13 }} />
        </View>
      </Card>

      <Card>
        <Text style={s.fieldLabel}>LAST 7 DAYS</Text>
        <WeekBars week={week} goal={goal} width={width} />
        <Text style={s.muted}>
          {logged.length ? `Average ${avg.toLocaleString()} kcal on days you logged (goal ${goal.toLocaleString()}).` : 'No food logged this week yet.'}
        </Text>
      </Card>

      <Card>
        <Text style={s.fieldLabel}>DAILY TARGET</Text>
        <Text style={s.body}>
          {state.goals
            ? `${state.goals.calories.toLocaleString()} kcal · P ${state.goals.protein} g · C ${state.goals.carbs} g · F ${state.goals.fat} g`
            : '—'}
        </Text>
        <Button title="Edit goals" kind="secondary" onPress={onEditGoals} />
      </Card>

      <Button title="Start over (delete all data)" kind="danger" onPress={confirmReset} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.muted}>{label}</Text>
      <Text style={st.stat}>{value}</Text>
    </View>
  );
}

function WeightChart({ values, width }: { values: number[]; width: number }) {
  const h = 140;
  const pad = 12;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={h}>
      <Line x1={0} x2={width} y1={h - 1} y2={h - 1} stroke={C.line} strokeWidth={1} />
      <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.accent} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={5} fill={C.accent} />
    </Svg>
  );
}

function WeekBars({ week, goal, width }: { week: { day: string; kcal: number }[]; goal: number; width: number }) {
  const h = 120;
  const max = Math.max(goal * 1.2, ...week.map((d) => d.kcal));
  const slot = width / 7;
  const goalY = h - (goal / max) * h;
  return (
    <View>
      <Svg width={width} height={h}>
        {week.map((d, i) => {
          const bh = (d.kcal / max) * h;
          return (
            <Rect
              key={d.day}
              x={i * slot + slot * 0.2}
              y={h - bh}
              width={slot * 0.6}
              height={Math.max(bh, 2)}
              rx={6}
              fill={d.kcal === 0 ? C.line : d.kcal > goal * 1.05 ? C.over : C.accent}
            />
          );
        })}
        <Line x1={0} x2={width} y1={goalY} y2={goalY} stroke={C.muted} strokeWidth={1} strokeDasharray="4 4" />
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {week.map((d) => (
          <Text key={d.day} style={st.barLabel}>
            {parseDay(d.day).toLocaleDateString([], { weekday: 'narrow' })}
          </Text>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  barLabel: { flex: 1, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
});
