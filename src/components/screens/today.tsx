import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Headline, MacroBar, Ring, s } from '@/components/bits';
import { CameraIcon, FlameIcon } from '@/components/icons';
import { MealList } from '@/components/meals';
import { AppState, GoalType, dayKey, dayResult, entriesOn, logStreak, totals } from '@/lib/food';
import { C, F, R } from '@/lib/ui';

export function Today({
  state,
  onSnap,
  onManual,
  onDelete,
}: {
  state: AppState;
  onSnap: () => void;
  onManual: () => void;
  onDelete: (id: string) => void;
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

      <Text style={st.nudge}>{nudge(list.length, left, goalType)}</Text>

      <Button title="Snap your food" icon={(c) => <CameraIcon size={20} color={c} />} onPress={onSnap} />
      <Button title="Add without a photo" kind="secondary" onPress={onManual} />

      <Text style={[st.label, { marginTop: 10 }]}>Today&apos;s food</Text>
      {list.length === 0 ? (
        <Text style={s.muted}>Nothing logged yet. Your first meal starts the day&apos;s count.</Text>
      ) : (
        <MealList entries={list} onDelete={onDelete} />
      )}
    </ScrollView>
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
});
