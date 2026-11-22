import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { C, F, R, tapBuzz } from '@/lib/ui';

/** Big round progress ring with the number in the middle. */
export function Ring({
  size = 200,
  stroke = 16,
  progress,
  color = C.accent,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          // Start at the top instead of the right-hand side.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Thin horizontal bar, e.g. "Protein 42 / 140 g". */
export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const p = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.macroLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${p * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.macroValue}>
        {Math.round(value)}
        <Text style={s.macroGoal}> / {goal} g</Text>
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  /** Optional icon drawn before the label, in the label's color. */
  icon?: (color: string) => ReactNode;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? C.accent : kind === 'secondary' ? C.cardHi : 'transparent';
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.danger : kind === 'ghost' ? C.muted : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      {icon ? icon(fg) : null}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Headline({ children, size = 34 }: { children: ReactNode; size?: number }) {
  return <Text style={[s.headline, { fontSize: size, lineHeight: size * 1.1 }]}>{children}</Text>;
}

/** A row of pill buttons where exactly one is chosen. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.choiceRow}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tapBuzz();
              onChange(o.value);
            }}
            style={[s.choice, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
            <Text style={[s.choiceText, on && { color: C.onAccent }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Labelled text box for numbers (or text when `text` is set). */
export function Field({
  label,
  value,
  onChange,
  suffix,
  text,
  placeholder,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  text?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldBox}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(text ? t : t.replace(/[^0-9.]/g, ''))}
          keyboardType={text ? 'default' : 'decimal-pad'}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          style={s.fieldInput}
          selectTextOnFocus={!text}
          returnKeyType="done"
        />
        {suffix ? <Text style={s.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** Turns text from a number box into a number (blank or junk → 0). */
export function num(v: string) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export const s = StyleSheet.create({
  headline: { fontFamily: F.head, color: C.text, letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18, gap: 12, borderWidth: 1, borderColor: '#1A1B1F' },
  macroLabel: { color: C.muted, fontSize: 11, fontFamily: F.semi, letterSpacing: 1.2, textTransform: 'uppercase' },
  macroValue: { color: C.text, fontSize: 20, fontFamily: F.head, letterSpacing: 0.3 },
  macroGoal: { color: C.muted, fontFamily: F.headSemi, fontSize: 14 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  button: { borderRadius: R.md, paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  buttonText: { fontSize: 15, fontFamily: F.bold, letterSpacing: 1.4, textTransform: 'uppercase' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  choiceText: { color: C.text, fontSize: 14, fontFamily: F.semi },
  fieldLabel: { color: C.muted, fontSize: 11, fontFamily: F.semi, letterSpacing: 1.2, textTransform: 'uppercase' },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardHi,
    borderRadius: R.sm,
    paddingHorizontal: 14,
  },
  fieldInput: { flex: 1, color: C.text, fontSize: 18, fontFamily: F.semi, paddingVertical: 12, minWidth: 0 },
  fieldSuffix: { color: C.muted, fontFamily: F.body, fontSize: 15, marginLeft: 6 },
  muted: { color: C.muted, fontFamily: F.body, fontSize: 15 },
  body: { color: C.text, fontFamily: F.body, fontSize: 16 },
});
