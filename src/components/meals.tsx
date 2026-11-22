import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CopyIcon, mealFor } from '@/components/icons';
import { Entry } from '@/lib/food';
import { C, F, R, tapBuzz } from '@/lib/ui';

/**
 * A day's food, organised into meal cards (Breakfast, Lunch, Snack, Dinner) in the order they were eaten.
 * Each card shows its own calorie total, then one clean line per food.
 */
export function MealList({
  entries,
  onDelete,
  onEdit,
  onCopy,
  copyLabel = 'Copy to today',
}: {
  entries: Entry[];
  onDelete?: (id: string) => void;
  /** Tap a food to change it. */
  onEdit?: (entry: Entry) => void;
  /** Shows a button on each meal card that copies the whole meal (e.g. into today). */
  onCopy?: (items: Entry[]) => void;
  copyLabel?: string;
}) {
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
              <FoodLine
                key={e.id}
                entry={e}
                onEdit={onEdit ? () => onEdit(e) : undefined}
                onDelete={onDelete ? () => confirmDelete(e, onDelete) : undefined}
              />
            ))}
            {onCopy ? (
              <Pressable
                onPress={() => {
                  tapBuzz();
                  onCopy(g.items);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${copyLabel}: ${g.label}`}
                style={({ pressed }) => [st.copy, pressed && { opacity: 0.6 }]}>
                <CopyIcon size={16} color={C.text} />
                <Text style={st.copyText}>{copyLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * One food, kept simple: its name on the left and calories on the right, lined up under the meal total.
 * Tap it to see the full details (macros, servings) and to edit or remove it.
 */
function FoodLine({ entry, onEdit, onDelete }: { entry: Entry; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      disabled={!onEdit && !onDelete}
      accessibilityRole={onEdit ? 'button' : undefined}
      accessibilityHint={onEdit ? 'Tap to see details and edit' : undefined}
      style={({ pressed }) => [st.line, pressed && onEdit ? { opacity: 0.6 } : null]}>
      <Text style={st.name} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={st.cal}>
        {entry.calories.toLocaleString()}
        <Text style={st.unit}> CAL</Text>
      </Text>
    </Pressable>
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
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.line },
  name: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 15 },
  cal: { color: C.text, fontFamily: F.head, fontSize: 20 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  copyText: { color: C.text, fontFamily: F.semi, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
});
