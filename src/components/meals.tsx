import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CloseIcon, mealFor } from '@/components/icons';
import { Entry } from '@/lib/food';
import { C, F, R } from '@/lib/ui';

/**
 * A day's food, organised into meal cards (Breakfast, Lunch, Snack, Dinner) in the order they were eaten.
 * Each card shows its own calorie total, then one clean line per food.
 */
export function MealList({ entries, onDelete }: { entries: Entry[]; onDelete?: (id: string) => void }) {
  const groups: { label: string; Icon: ReturnType<typeof mealFor>['Icon']; items: Entry[] }[] = [];
  for (const e of [...entries].sort((a, b) => a.time.localeCompare(b.time))) {
    const { label, Icon } = mealFor(new Date(e.time));
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, Icon, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <View style={{ gap: 12 }}>
      {groups.map((g) => {
        const total = g.items.reduce((t, e) => t + e.calories, 0);
        return (
          <View key={g.label} style={st.card}>
            <View style={st.head}>
              <View style={st.iconTile}>
                <g.Icon size={18} color={C.text} />
              </View>
              <Text style={st.meal}>{g.label}</Text>
              <Text style={st.count}>
                {g.items.length} item{g.items.length === 1 ? '' : 's'}
              </Text>
              <Text style={st.mealCal}>
                {total.toLocaleString()}
                <Text style={st.unit}> CAL</Text>
              </Text>
            </View>
            {g.items.map((e) => (
              <FoodLine key={e.id} entry={e} onDelete={onDelete ? () => confirmDelete(e, onDelete) : undefined} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** One food: name and time on the left, its macros underneath, calories on the right. */
function FoodLine({ entry, onDelete }: { entry: Entry; onDelete?: () => void }) {
  const time = new Date(entry.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <Pressable onLongPress={onDelete} accessibilityHint={onDelete ? 'Long press to remove' : undefined} style={st.line}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={st.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <View style={st.macros}>
          <Text style={st.time}>{time}</Text>
          <Macro color={C.protein} grams={entry.protein} label="P" />
          <Macro color={C.carbs} grams={entry.carbs} label="C" />
          <Macro color={C.fat} grams={entry.fat} label="F" />
        </View>
      </View>
      <Text style={st.cal}>{entry.calories.toLocaleString()}</Text>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={12} accessibilityLabel={`Remove ${entry.name}`} style={st.remove}>
          <CloseIcon size={14} color={C.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Macro({ color, grams, label }: { color: string; grams: number; label: string }) {
  return (
    <View style={st.macro}>
      <View style={[st.dot, { backgroundColor: color }]} />
      <Text style={st.macroText}>
        {grams}g {label}
      </Text>
    </View>
  );
}

function confirmDelete(e: Entry, onDelete: (id: string) => void) {
  const msg = `Remove "${e.name}"?`;
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

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, paddingBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  iconTile: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  meal: { color: C.text, fontFamily: F.head, fontSize: 20, letterSpacing: 0.6, textTransform: 'uppercase' },
  count: { flex: 1, color: C.muted, fontFamily: F.medium, fontSize: 12 },
  mealCal: { color: C.text, fontFamily: F.head, fontSize: 20 },
  unit: { color: C.muted, fontFamily: F.headSemi, fontSize: 12, letterSpacing: 0.8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  name: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  macros: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  time: { color: C.muted, fontFamily: F.medium, fontSize: 12, minWidth: 58 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  macroText: { color: C.muted, fontFamily: F.medium, fontSize: 12 },
  cal: { color: C.text, fontFamily: F.head, fontSize: 22 },
  remove: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
});
