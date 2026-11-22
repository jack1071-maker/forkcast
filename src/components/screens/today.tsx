import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Headline, MacroBar, Ring, s } from '@/components/bits';
import { AppState, Entry, dayKey, entriesOn, logStreak, totals } from '@/lib/food';
import { C, HEADLINE, R } from '@/lib/ui';

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
  const streak = logStreak(state);

  return (
    <ScrollView contentContainerStyle={st.wrap}>
      <View style={st.top}>
        <Headline>FORKCAST</Headline>
        <View style={st.streak}>
          <Text style={st.streakText}>🔥 {streak} day{streak === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Ring progress={t.calories / goals.calories} color={over ? C.over : C.accent} size={210}>
          <Text style={st.big}>{Math.abs(left).toLocaleString()}</Text>
          <Text style={s.muted}>{over ? 'kcal over' : 'kcal left'}</Text>
        </Ring>
        <Text style={s.muted}>
          {t.calories.toLocaleString()} eaten of {goals.calories.toLocaleString()} kcal
        </Text>
        <View style={st.macros}>
          <MacroBar label="Protein" value={t.protein} goal={goals.protein} color={C.protein} />
          <MacroBar label="Carbs" value={t.carbs} goal={goals.carbs} color={C.carbs} />
          <MacroBar label="Fat" value={t.fat} goal={goals.fat} color={C.fat} />
        </View>
      </Card>

      <Text style={st.nudge}>{nudge(list.length, left)}</Text>

      <Button title="📸  Snap your food" onPress={onSnap} />
      <Button title="Add without a photo" kind="secondary" onPress={onManual} />

      <Text style={st.section}>TODAY&apos;S FOOD</Text>
      {list.length === 0 ? (
        <Text style={s.muted}>Nothing logged yet. Your first meal starts the day&apos;s count.</Text>
      ) : (
        list.map((e) => <FoodRow key={e.id} entry={e} onDelete={() => confirmDelete(e, onDelete)} />)
      )}
    </ScrollView>
  );
}

function nudge(count: number, left: number) {
  if (count === 0) return 'Log your first meal to keep your streak going.';
  if (left < 0) return `You're ${Math.abs(left)} kcal over today. Tomorrow's a fresh start.`;
  if (left < 150) return 'Right on target. Nicely done!';
  return `You have ${left.toLocaleString()} kcal left today.`;
}

function confirmDelete(e: Entry, onDelete: (id: string) => void) {
  const msg = `Remove "${e.name}" from today?`;
  // Alert with buttons doesn't exist on the web, so use the browser's confirm box there.
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) onDelete(e.id);
    return;
  }
  Alert.alert('Remove food', msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => onDelete(e.id) },
  ]);
}

export function FoodRow({ entry, onDelete }: { entry: Entry; onDelete?: () => void }) {
  const time = new Date(entry.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <Pressable
      onLongPress={onDelete}
      accessibilityHint={onDelete ? 'Long press to remove' : undefined}
      style={st.row}>
      <Text style={st.emoji}>{entry.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={st.rowName} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={st.rowSub}>
          {time} · P {entry.protein} · C {entry.carbs} · F {entry.fat}
        </Text>
      </View>
      <Text style={st.rowKcal}>{entry.calories}</Text>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Remove ${entry.name}`}>
          <Text style={st.x}>✕</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streak: { backgroundColor: C.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  streakText: { color: C.accent, fontWeight: '700', fontSize: 15 },
  big: { fontFamily: HEADLINE, color: C.text, fontSize: 52, lineHeight: 62 },
  macros: { flexDirection: 'row', gap: 14, alignSelf: 'stretch', marginTop: 6 },
  nudge: { color: C.accent, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  section: { color: C.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 14,
  },
  emoji: { fontSize: 28 },
  rowName: { color: C.text, fontSize: 16, fontWeight: '700' },
  rowSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  rowKcal: { color: C.text, fontSize: 18, fontWeight: '800' },
  x: { color: C.muted, fontSize: 16, paddingLeft: 4 },
});
