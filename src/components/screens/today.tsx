import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Headline, MacroBar, Ring, s } from '@/components/bits';
import { CameraIcon, CloseIcon, FlameIcon, mealFor } from '@/components/icons';
import { AppState, Entry, dayKey, entriesOn, logStreak, totals } from '@/lib/food';
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
        <Ring progress={t.calories / goals.calories} color={over ? C.over : C.good} size={220} stroke={14}>
          <Text style={st.big}>{Math.abs(left).toLocaleString()}</Text>
          <Text style={st.bigUnit}>{over ? 'KCAL OVER' : 'KCAL LEFT'}</Text>
        </Ring>
        <View style={st.statsRow}>
          <Stat value={t.calories.toLocaleString()} label="Eaten" />
          <View style={st.divider} />
          <Stat value={goals.calories.toLocaleString()} label="Goal" />
          <View style={st.divider} />
          <Stat value={`${pct}%`} label="Of goal" color={over ? C.over : C.good} />
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

      <Text style={st.nudge}>{nudge(list.length, left)}</Text>

      <Button title="Snap your food" icon={(c) => <CameraIcon size={20} color={c} />} onPress={onSnap} />
      <Button title="Add without a photo" kind="secondary" onPress={onManual} />

      <Text style={[st.label, { marginTop: 10 }]}>Today&apos;s food</Text>
      {list.length === 0 ? (
        <Text style={s.muted}>Nothing logged yet. Your first meal starts the day&apos;s count.</Text>
      ) : (
        list.map((e) => <FoodRow key={e.id} entry={e} onDelete={() => confirmDelete(e, onDelete)} />)
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

function nudge(count: number, left: number) {
  if (count === 0) return 'Log your first meal to keep your streak going.';
  if (left < 0) return `You're ${Math.abs(left)} kcal over today. Tomorrow's a fresh start.`;
  if (left < 150) return 'Right on target. Nicely done.';
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

/** One logged food: meal-time icon, name, macros and calories. */
export function FoodRow({ entry, onDelete }: { entry: Entry; onDelete?: () => void }) {
  const when = new Date(entry.time);
  const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const { label, Icon } = mealFor(when);
  return (
    <Pressable
      onLongPress={onDelete}
      accessibilityHint={onDelete ? 'Long press to remove' : undefined}
      style={st.row}>
      <View style={st.iconTile} accessibilityLabel={label}>
        <Icon size={20} color={C.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowName} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={st.rowSub}>
          {label.toUpperCase()} · {time}
        </Text>
        <View style={st.macroDots}>
          <Dot color={C.protein} text={`${entry.protein}P`} />
          <Dot color={C.carbs} text={`${entry.carbs}C`} />
          <Dot color={C.fat} text={`${entry.fat}F`} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={st.rowKcal}>{entry.calories}</Text>
        <Text style={st.rowUnit}>KCAL</Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Remove ${entry.name}`} style={{ paddingLeft: 2 }}>
          <CloseIcon size={16} color={C.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Dot({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={st.dotText}>{text}</Text>
    </View>
  );
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: '#1A1B1F',
    padding: 14,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.cardHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { color: C.text, fontSize: 15, fontFamily: F.semi },
  rowSub: { color: C.muted, fontFamily: F.semi, fontSize: 10, letterSpacing: 1, marginTop: 3 },
  macroDots: { flexDirection: 'row', gap: 10, marginTop: 6 },
  dotText: { color: C.muted, fontFamily: F.medium, fontSize: 12 },
  rowKcal: { color: C.text, fontSize: 24, fontFamily: F.head, lineHeight: 26 },
  rowUnit: { color: C.muted, fontFamily: F.headSemi, fontSize: 11, letterSpacing: 1 },
});
