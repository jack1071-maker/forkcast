import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { Button, Card, Field, Headline, num, s } from '@/components/bits';
import {
  addDays,
  AppState,
  dayKey,
  dayResult,
  entriesOn,
  GoalType,
  kgToLb,
  lbToKg,
  parseDay,
  periodStats,
  projectGoal,
  showWeight,
  totals,
} from '@/lib/food';
import { C, F, resultColor } from '@/lib/ui';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type AccountInfo = {
  /** False when the app was built without Supabase (accounts hidden). */
  enabled: boolean;
  email: string | null;
  sync: SyncStatus;
  onSignUp: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  /** Returns an error message, or null when the account was deleted. */
  onDelete: () => Promise<string | null>;
};

/** Yes/no question that works on phones and on the web. */
function ask(title: string, msg: string, okLabel: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) onOk();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onOk },
  ]);
}

export function Progress({
  state,
  account,
  onWeigh,
  onSetTarget,
  onEditGoals,
  onReset,
}: {
  state: AppState;
  account: AccountInfo;
  onWeigh: (kg: number) => void;
  onSetTarget: (kg: number | null) => void;
  onEditGoals: () => void;
  onReset: () => void;
}) {
  const [accountError, setAccountError] = useState<string | null>(null);
  const units = state.profile?.units ?? 'imperial';
  const [w, setW] = useState('');
  const [goalText, setGoalText] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
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
  const thisWeek = periodStats(state, week.map((d) => d.day));
  const lastWeek = periodStats(state, week.map((d) => addDays(d.day, -7)));

  // Goal weight: how far along you are, and when you'll get there.
  const target = state.targetKg ?? null;
  const projection = projectGoal(state, today);
  const goalProgress =
    target && start && latest && start.kg !== target
      ? Math.max(0, Math.min(1, (start.kg - latest.kg) / (start.kg - target)))
      : 0;
  const saveGoal = () => {
    const v = num(goalText);
    const kg = units === 'imperial' ? lbToKg(v) : v;
    if (kg < 30 || kg > 300) return;
    onSetTarget(kg);
    setGoalText('');
    setEditingGoal(false);
  };

  const save = () => {
    const v = num(w);
    const kg = units === 'imperial' ? lbToKg(v) : v;
    if (kg < 30 || kg > 300) return;
    onWeigh(kg);
    setW('');
  };

  const confirmReset = () =>
    ask(
      'Start over?',
      account.email
        ? 'This deletes all your food, weights and goals, on this device and in your account. It cannot be undone.'
        : 'This deletes all your food, weights and goals on this device. It cannot be undone.',
      'Delete everything',
      onReset,
    );

  const confirmDeleteAccount = () =>
    ask(
      'Delete account?',
      'This permanently deletes your Forkcast account and everything saved in it. It cannot be undone.',
      'Delete account',
      async () => {
        setAccountError(await account.onDelete());
      },
    );

  const syncText =
    account.sync === 'syncing'
      ? 'Backing up…'
      : account.sync === 'error'
        ? 'Couldn’t back up right now. It’s saved on this device and will retry.'
        : 'Backed up';

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <Headline>PROGRESS</Headline>

      <Card>
        <Text style={s.fieldLabel}>WEIGHT</Text>
        <View style={st.stats}>
          <Stat label="Start" value={start ? showWeight(start.kg, units) : '—'} />
          <Stat label="Now" value={latest ? showWeight(latest.kg, units) : '—'} />
          {target ? (
            <Stat label="Goal" value={showWeight(target, units)} />
          ) : (
            <Stat
              label="Change"
              value={
                start && latest
                  ? `${toShow(latest.kg) - toShow(start.kg) > 0 ? '+' : ''}${(toShow(latest.kg) - toShow(start.kg)).toFixed(1)}`
                  : '—'
              }
            />
          )}
        </View>
        {target && latest ? (
          <View style={{ gap: 8 }}>
            <View style={st.track}>
              <View style={[st.trackFill, { width: `${goalProgress * 100}%` }]} />
            </View>
            <Text style={st.goalLine}>{goalSentence(projection, target, latest.kg, goalProgress, units)}</Text>
          </View>
        ) : null}
        <View onLayout={onLayout}>
          {weights.length >= 2 ? (
            <WeightChart values={weights.map((x) => toShow(x.kg))} goal={target ? toShow(target) : null} width={width} />
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
        {!target || editingGoal ? (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <Field
              label="Goal weight"
              value={goalText}
              onChange={setGoalText}
              suffix={units === 'imperial' ? 'lb' : 'kg'}
              placeholder={units === 'imperial' ? 'e.g. 165' : 'e.g. 75'}
              style={{ flex: 1 }}
            />
            <Button title="Set" kind="secondary" onPress={saveGoal} disabled={!num(goalText)} style={{ paddingVertical: 13 }} />
          </View>
        ) : (
          <View style={st.goalLinks}>
            <Pressable onPress={() => setEditingGoal(true)} accessibilityRole="button" hitSlop={8}>
              <Text style={st.smallLink}>Change goal weight</Text>
            </Pressable>
            <Pressable onPress={() => onSetTarget(null)} accessibilityRole="button" hitSlop={8}>
              <Text style={[st.smallLink, { color: C.muted }]}>Remove goal</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <Card>
        <Text style={s.fieldLabel}>LAST 7 DAYS</Text>
        <WeekBars week={week} goal={goal} goalType={state.profile?.goal ?? 'lose'} width={width} />
        {thisWeek.loggedDays ? (
          <>
            <View style={st.summary}>
              <Summary
                label="Avg calories"
                value={thisWeek.calories.toLocaleString()}
                change={lastWeek.loggedDays ? thisWeek.calories - lastWeek.calories : null}
              />
              <Summary
                label="Days on target"
                value={`${thisWeek.onTarget} of 7`}
                change={lastWeek.loggedDays ? thisWeek.onTarget - lastWeek.onTarget : null}
                higherIsGood
              />
              <Summary
                label="Avg protein"
                value={`${thisWeek.protein} g`}
                change={lastWeek.loggedDays ? thisWeek.protein - lastWeek.protein : null}
                unit=" g"
                higherIsGood
              />
              <Summary
                label="Avg water"
                value={thisWeek.water ? `${thisWeek.water} glasses` : '—'}
                change={lastWeek.water && thisWeek.water ? Math.round((thisWeek.water - lastWeek.water) * 10) / 10 : null}
                higherIsGood
              />
            </View>
            <Text style={s.muted}>{insight(thisWeek, lastWeek, goal, state.goals?.protein ?? 0)}</Text>
          </>
        ) : (
          <Text style={s.muted}>No food logged this week yet.</Text>
        )}
      </Card>

      <Card>
        <Text style={s.fieldLabel}>DAILY TARGET</Text>
        <Text style={s.body}>
          {state.goals
            ? `${state.goals.calories.toLocaleString()} cal · P ${state.goals.protein} g · C ${state.goals.carbs} g · F ${state.goals.fat} g`
            : '—'}
        </Text>
        <Button title="Edit goals" kind="secondary" onPress={onEditGoals} />
      </Card>

      {account.enabled ? (
        <Card>
          <Text style={s.fieldLabel}>ACCOUNT</Text>
          {account.email ? (
            <>
              <Text style={s.body}>Signed in as {account.email}</Text>
              <Text style={s.muted}>{syncText}</Text>
              <Button title="Sign out" kind="secondary" onPress={account.onSignOut} />
              <Button title="Delete my account" kind="danger" onPress={confirmDeleteAccount} />
              {accountError ? <Text style={st.error}>{accountError}</Text> : null}
            </>
          ) : (
            <>
              <Text style={s.muted}>
                You&apos;re using Forkcast as a guest. Your log is only on this device. A free account unlocks photo
                estimates and backs everything up.
              </Text>
              <Button title="Create a free account" onPress={account.onSignUp} />
              <Button title="Sign in" kind="secondary" onPress={account.onSignIn} />
            </>
          )}
        </Card>
      ) : null}

      <Button title="Start over (delete all data)" kind="danger" onPress={confirmReset} />
      <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
        <Text style={st.link}>Privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={st.stat}>{value}</Text>
    </View>
  );
}

/** A stat with a small "vs last week" change underneath. */
function Summary({
  label,
  value,
  change,
  unit = '',
  higherIsGood,
}: {
  label: string;
  value: string;
  change: number | null;
  unit?: string;
  /** Color the change green when it went up (otherwise just gray). */
  higherIsGood?: boolean;
}) {
  const color = change && higherIsGood ? (change > 0 ? C.goodText : C.overText) : C.muted;
  return (
    <View style={st.summaryItem}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={st.summaryValue}>{value}</Text>
      <Text style={[st.summaryChange, { color }]}>
        {change == null ? 'No data last week' : change === 0 ? 'Same as last week' : `${change > 0 ? '+' : ''}${change.toLocaleString()}${unit} vs last week`}
      </Text>
    </View>
  );
}

type Stats = ReturnType<typeof periodStats>;

/** One plain-English takeaway from the week. */
function insight(now: Stats, before: Stats, calGoal: number, proteinGoal: number) {
  if (now.onTarget >= 5) return `Strong week: ${now.onTarget} days on target. Keep it rolling.`;
  if (proteinGoal && now.protein < proteinGoal * 0.8)
    return `Protein is averaging ${now.protein} g, under your ${proteinGoal} g target. A protein-rich snack would help.`;
  if (before.loggedDays && now.onTarget > before.onTarget)
    return `${now.onTarget - before.onTarget} more day${now.onTarget - before.onTarget === 1 ? '' : 's'} on target than last week. Nice progress.`;
  if (now.loggedDays < 5) return `You logged ${now.loggedDays} of the last 7 days. Logging every day makes the numbers more useful.`;
  return `Averaging ${now.calories.toLocaleString()} cal a day against a ${calGoal.toLocaleString()} cal goal.`;
}

function goalSentence(
  p: ReturnType<typeof projectGoal>,
  target: number,
  nowKg: number,
  progress: number,
  units: 'imperial' | 'metric',
) {
  const left = showWeight(Math.abs(target - nowKg), units);
  if (!p || p.kind === 'reached') return 'You reached your goal weight. Time to set a new one?';
  const pct = `${Math.round(progress * 100)}% of the way there, ${left} to go.`;
  if (p.kind === 'stalled')
    return p.basis === 'trend'
      ? `${pct} Your recent weigh-ins aren't moving toward the goal yet.`
      : `${pct} Log your weight weekly to see a finish date.`;
  const date = parseDay(p.day).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  const pace = showWeight(p.perWeekKg, units);
  return p.basis === 'trend'
    ? `${pct} At your current pace (${pace} a week) you'll get there around ${date}.`
    : `${pct} At your plan's pace (about ${pace} a week) you'd get there around ${date}. Weigh in weekly for a sharper estimate.`;
}

function WeightChart({ values, goal, width }: { values: number[]; goal: number | null; width: number }) {
  const h = 140;
  const pad = 12;
  const min = Math.min(...values, goal ?? Infinity);
  const max = Math.max(...values, goal ?? -Infinity);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  const goalY = goal != null ? pad + (1 - (goal - min) / span) * (h - pad * 2) : null;
  return (
    <Svg width={width} height={h}>
      <Line x1={0} x2={width} y1={h - 1} y2={h - 1} stroke={C.line} strokeWidth={1} />
      {goalY != null ? (
        <Line x1={0} x2={width} y1={goalY} y2={goalY} stroke={C.goodText} strokeWidth={1.5} strokeDasharray="5 5" />
      ) : null}
      <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.accent} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={5} fill={C.accent} />
    </Svg>
  );
}

function WeekBars({
  week,
  goal,
  goalType,
  width,
}: {
  week: { day: string; kcal: number }[];
  goal: number;
  goalType: GoalType;
  width: number;
}) {
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
              fill={d.kcal === 0 ? C.line : resultColor(dayResult(d.kcal, goal, goalType, d.day === dayKey()))}
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
  stat: { color: C.text, fontSize: 26, fontFamily: F.head, marginTop: 4 },
  error: { color: C.danger, fontFamily: F.body, fontSize: 14, textAlign: 'center' },
  link: { color: C.accent, fontFamily: F.body, fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: C.good },
  goalLine: { color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  goalLinks: { flexDirection: 'row', justifyContent: 'space-between' },
  smallLink: { color: C.text, fontFamily: F.semi, fontSize: 13, textDecorationLine: 'underline' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  summaryItem: { width: '50%', gap: 2 },
  summaryValue: { color: C.text, fontFamily: F.head, fontSize: 24 },
  summaryChange: { fontFamily: F.medium, fontSize: 12 },
  barLabel: { flex: 1, textAlign: 'center', color: C.muted, fontSize: 12, fontFamily: F.bold, marginTop: 4 },
});
