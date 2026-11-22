import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Headline, num, s } from '@/components/bits';
import { analyzePhoto } from '@/lib/analyze';
import { Entry, Macros } from '@/lib/food';
import { C, R, tapBuzz } from '@/lib/ui';

export type NewFood = Macros & { name: string; emoji: string; source: Entry['source'] };

type Step = 'pick' | 'analyzing' | 'edit';

/**
 * The core loop: photo → estimate → tweak → add.
 * mode "photo" starts at the camera/library choice; "manual" goes straight to the form.
 */
export function Review({
  mode,
  recent,
  onAdd,
  onClose,
}: {
  mode: 'photo' | 'manual';
  recent: Entry[];
  onAdd: (food: NewFood) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(mode === 'photo' ? 'pick' : 'edit');
  const [photo, setPhoto] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servings, setServings] = useState(1);

  const fill = (f: Macros & { name: string; emoji: string }) => {
    setName(f.name);
    setEmoji(f.emoji);
    setCal(String(f.calories));
    setProtein(String(f.protein));
    setCarbs(String(f.carbs));
    setFat(String(f.fat));
    setServings(1);
  };

  const pick = async (useCamera: boolean) => {
    setError(null);
    try {
      if (useCamera && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Forkcast needs camera access to snap your food. You can allow it in Settings, or choose a photo instead.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
      const res = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setPhoto(asset.uri);
      setStep('analyzing');
      const guess = await analyzePhoto(asset.base64);
      fill(guess);
      setDemo(guess.demo);
      setStep('edit');
    } catch {
      setError("Couldn't open the camera or photos. Try again, or add the food without a photo.");
      setStep('pick');
    }
  };

  const k = servings;
  const food: NewFood = {
    name: name.trim() || 'Food',
    emoji,
    calories: Math.round(num(cal) * k),
    protein: Math.round(num(protein) * k),
    carbs: Math.round(num(carbs) * k),
    fat: Math.round(num(fat) * k),
    source: photo ? 'photo' : 'manual',
  };
  const canAdd = food.calories > 0;

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <Headline size={30}>{mode === 'photo' ? 'SNAP YOUR FOOD' : 'ADD FOOD'}</Headline>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Text style={st.close}>✕</Text>
        </Pressable>
      </View>

      {photo ? <Image source={{ uri: photo }} style={st.photo} contentFit="cover" /> : null}

      {step === 'pick' ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Text style={{ fontSize: 56 }}>📸</Text>
            <Text style={[s.body, { textAlign: 'center' }]}>
              Take a photo of your meal and Forkcast estimates the calories and macros.
            </Text>
          </Card>
          <Button title="Take a photo" onPress={() => pick(true)} />
          <Button title="Choose from photos" kind="secondary" onPress={() => pick(false)} />
          {error ? <Text style={st.error}>{error}</Text> : null}
        </>
      ) : null}

      {step === 'analyzing' ? (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={s.body}>Looking at your food…</Text>
        </Card>
      ) : null}

      {step === 'edit' ? (
        <>
          {demo ? (
            <View style={st.demo}>
              <Text style={st.demoText}>
                Demo estimate: the real AI comes next. Edit anything that looks wrong.
              </Text>
            </View>
          ) : null}

          {mode === 'manual' && recent.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={s.fieldLabel}>RECENT (tap to fill in)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recent.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      tapBuzz();
                      fill(r);
                    }}
                    style={st.chip}>
                    <Text style={st.chipText}>
                      {r.emoji} {r.name} · {r.calories}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Card>
            <View style={st.row}>
              <Text style={{ fontSize: 34 }}>{emoji}</Text>
              <Field label="What is it?" value={name} onChange={setName} text placeholder="e.g. Turkey sandwich" style={{ flex: 1 }} />
            </View>
            <Field label="Calories (one serving)" value={cal} onChange={setCal} suffix="kcal" />
            <View style={st.row}>
              <Field label="Protein" value={protein} onChange={setProtein} suffix="g" style={{ flex: 1 }} />
              <Field label="Carbs" value={carbs} onChange={setCarbs} suffix="g" style={{ flex: 1 }} />
              <Field label="Fat" value={fat} onChange={setFat} suffix="g" style={{ flex: 1 }} />
            </View>
            <View style={[st.row, { justifyContent: 'space-between' }]}>
              <Text style={s.fieldLabel}>Servings</Text>
              <View style={st.row}>
                <Stepper label="−" onPress={() => setServings((v) => Math.max(0.5, v - 0.5))} />
                <Text style={st.servings}>{servings}</Text>
                <Stepper label="+" onPress={() => setServings((v) => Math.min(10, v + 0.5))} />
              </View>
            </View>
          </Card>

          <Card style={{ alignItems: 'center', gap: 4 }}>
            <Headline size={40}>{food.calories.toLocaleString()} kcal</Headline>
            <Text style={s.muted}>
              P {food.protein} g · C {food.carbs} g · F {food.fat} g
            </Text>
          </Card>

          <Button
            title="Add to today"
            disabled={!canAdd}
            onPress={() => {
              if (!canAdd) return;
              onAdd(food);
            }}
          />
          {mode === 'photo' ? (
            <Button
              title="Retake photo"
              kind="ghost"
              onPress={() => {
                setPhoto(null);
                setStep('pick');
              }}
            />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      style={st.step}
      accessibilityLabel={label === '+' ? 'More servings' : 'Fewer servings'}>
      <Text style={st.stepText}>{label}</Text>
    </Pressable>
  );
}


const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { color: C.muted, fontSize: 24, padding: 4 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: R.lg, backgroundColor: C.card },
  error: { color: C.danger, fontSize: 15, textAlign: 'center' },
  demo: { backgroundColor: C.accentSoft, borderRadius: R.sm, padding: 12 },
  demoText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { backgroundColor: C.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  chipText: { color: C.text, fontSize: 14, fontWeight: '600' },
  servings: { color: C.text, fontSize: 20, fontWeight: '800', minWidth: 36, textAlign: 'center' },
  step: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: C.accent, fontSize: 22, fontWeight: '800' },
});
