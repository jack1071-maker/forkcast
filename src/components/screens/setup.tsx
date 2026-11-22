import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Choice, Field, Headline, num, s } from '@/components/bits';
import {
  ACTIVITY_LEVELS,
  GoalType,
  Profile,
  Sex,
  Units,
  computeGoals,
  kgToLb,
  lbToKg,
} from '@/lib/food';
import { C } from '@/lib/ui';

/** First-run setup (and "Edit goals" later): works out a daily calorie target. */
export function Setup({
  initial,
  onSave,
  onCancel,
  onSignIn,
}: {
  initial: Profile | null;
  onSave: (p: Profile) => void;
  onCancel?: () => void;
  /** Shown on first run: lets people with an account get their data back instead. */
  onSignIn?: () => void;
}) {
  const [units, setUnits] = useState<Units>(initial?.units ?? 'imperial');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  // Imperial height is feet + inches; metric is centimetres.
  const totalIn = initial ? initial.heightCm / 2.54 : 0;
  const [ft, setFt] = useState(initial ? String(Math.floor(totalIn / 12)) : '');
  const [inch, setInch] = useState(initial ? String(Math.round(totalIn % 12)) : '');
  const [cm, setCm] = useState(initial ? String(Math.round(initial.heightCm)) : '');
  const [weight, setWeight] = useState(
    initial ? (initial.units === 'imperial' ? kgToLb(initial.weightKg) : initial.weightKg).toFixed(0) : '',
  );
  const [activity, setActivity] = useState(initial?.activity ?? 1.375);
  const [goal, setGoal] = useState<GoalType>(initial?.goal ?? 'lose');

  const heightCm = units === 'imperial' ? (num(ft) * 12 + num(inch)) * 2.54 : num(cm);
  const weightKg = units === 'imperial' ? lbToKg(num(weight)) : num(weight);
  const ageN = Math.round(num(age));
  const valid = ageN >= 13 && ageN <= 100 && heightCm >= 120 && heightCm <= 230 && weightKg >= 30 && weightKg <= 300;

  const profile: Profile = { sex, age: ageN, heightCm, weightKg, activity, goal, units };
  const goals = valid ? computeGoals(profile) : null;

  // Switching units converts what's already typed instead of wiping it.
  const switchUnits = (u: Units) => {
    if (u === units) return;
    if (u === 'metric') {
      if (heightCm) setCm(String(Math.round(heightCm)));
      if (weight) setWeight(lbToKg(num(weight)).toFixed(0));
    } else {
      if (num(cm)) {
        const inches = num(cm) / 2.54;
        setFt(String(Math.floor(inches / 12)));
        setInch(String(Math.round(inches % 12)));
      }
      if (weight) setWeight(kgToLb(num(weight)).toFixed(0));
    }
    setUnits(u);
  };

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      {initial ? <Headline>YOUR GOALS</Headline> : <Headline size={44}>FORKCAST</Headline>}
      <Text style={s.muted}>
        {initial
          ? 'Update your details and your daily target updates with them.'
          : 'Snap your food, see the calories, hit your goal. First, a few details so we can set your daily target.'}
      </Text>

      <Card>
        <Choice
          options={[
            { value: 'imperial', label: 'lb / ft' },
            { value: 'metric', label: 'kg / cm' },
          ]}
          value={units}
          onChange={switchUnits}
        />
        <Text style={s.fieldLabel}>Sex (used for the calorie formula)</Text>
        <Choice
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={sex}
          onChange={setSex}
        />
        <View style={st.row}>
          <Field label="Age" value={age} onChange={setAge} suffix="yrs" style={{ flex: 1 }} />
          <Field
            label="Weight"
            value={weight}
            onChange={setWeight}
            suffix={units === 'imperial' ? 'lb' : 'kg'}
            style={{ flex: 1 }}
          />
        </View>
        {units === 'imperial' ? (
          <View style={st.row}>
            <Field label="Height" value={ft} onChange={setFt} suffix="ft" style={{ flex: 1 }} />
            <Field label=" " value={inch} onChange={setInch} suffix="in" style={{ flex: 1 }} />
          </View>
        ) : (
          <Field label="Height" value={cm} onChange={setCm} suffix="cm" />
        )}
      </Card>

      <Card>
        <Text style={s.fieldLabel}>How active are you?</Text>
        <Choice
          options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
          value={activity}
          onChange={setActivity}
        />
        <Text style={s.muted}>{ACTIVITY_LEVELS.find((a) => a.value === activity)?.hint}</Text>
        <Text style={s.fieldLabel}>Your goal</Text>
        <Choice
          options={[
            { value: 'lose', label: 'Lose weight' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain weight' },
          ]}
          value={goal}
          onChange={setGoal}
        />
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <Text style={s.fieldLabel}>YOUR DAILY TARGET</Text>
        <Headline size={48}>{goals ? `${goals.calories.toLocaleString()} kcal` : '—'}</Headline>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          {goals
            ? `Protein ${goals.protein} g · Carbs ${goals.carbs} g · Fat ${goals.fat} g`
            : 'Fill in your age, height and weight to see it.'}
        </Text>
      </Card>

      <Button title={initial ? 'Save goals' : "Let's go"} disabled={!valid} onPress={() => onSave(profile)} />
      {onCancel ? <Button title="Cancel" kind="ghost" onPress={onCancel} /> : null}
      {onSignIn ? <Button title="I already have an account" kind="ghost" onPress={onSignIn} /> : null}
      <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>
        Estimates only, not medical advice. Uses the Mifflin-St Jeor equation.
      </Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 16, paddingBottom: 40, backgroundColor: C.bg },
  row: { flexDirection: 'row', gap: 12 },
});
