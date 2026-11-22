import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Headline, num, s } from '@/components/bits';
import { AnalyzeError, analyzePhoto } from '@/lib/analyze';
import { Entry, Macros } from '@/lib/food';
import { BarcodeIcon, CameraIcon, CloseIcon, ForkIcon, KeyIcon, LockIcon, MinusIcon, PlusIcon } from '@/components/icons';
import { C, F, R, tapBuzz } from '@/lib/ui';

export type NewFood = Macros & { name: string; emoji: string; source: Entry['source'] };

type Step = 'account' | 'pick' | 'analyzing' | 'invite' | 'edit';

/**
 * The core loop: photo → estimate → tweak → add.
 * mode "photo" starts at the camera/library choice; "manual" goes straight to the form.
 */
export function Review({
  mode,
  recent,
  needsAccount,
  onAccount,
  onAdd,
  onClose,
}: {
  mode: 'photo' | 'manual';
  recent: Entry[];
  /** Guests can't use the photo AI; show the "create a free account" step instead. */
  needsAccount: boolean;
  onAccount: () => void;
  onAdd: (food: NewFood) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(mode === 'photo' ? (needsAccount ? 'account' : 'pick') : 'edit');
  const [invite, setInvite] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);
  /** Set when the numbers came from a barcode match in the food database. */
  const [match, setMatch] = useState<{ barcode: string; serving: string } | null>(null);
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
    let uri: string;
    try {
      if (useCamera && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Forkcast needs camera access to snap your food. You can allow it in Settings, or choose a photo instead.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const res = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.[0]) return;
      uri = res.assets[0].uri;
    } catch {
      setError("Couldn't open the camera or photos. Try again, or add the food without a photo.");
      return;
    }

    setPhoto(uri);
    await analyze(uri);
  };

  /** Send the photo to the AI. Also used again after typing the invite code. */
  const analyze = async (uri: string, inviteCode?: string) => {
    setError(null);
    setStep('analyzing');
    try {
      const guess = await analyzePhoto(uri, inviteCode);
      fill(guess);
      setDemo(guess.demo);
      setLowConfidence(guess.confidence === 'low' && guess.from !== 'database');
      setMatch(guess.from === 'database' && guess.barcode ? { barcode: guess.barcode, serving: guess.serving ?? '1 serving' } : null);
      setStep('edit');
    } catch (e) {
      const err = e instanceof AnalyzeError ? e : null;
      if (err?.code === 'invite_needed' || err?.code === 'invite_wrong') {
        setError(err.code === 'invite_wrong' ? err.message : null);
        setStep('invite');
        return;
      }
      if (err?.code === 'auth') {
        setStep('account');
        return;
      }
      setPhoto(null);
      setError(err?.message ?? 'Something went wrong. Please try again.');
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
          <CloseIcon size={22} color={C.muted} />
        </Pressable>
      </View>

      {photo ? <Image source={{ uri: photo }} style={st.photo} contentFit="cover" /> : null}

      {step === 'account' ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
            <View style={st.bigIcon}><LockIcon size={30} color={C.text} /></View>
            <Text style={[s.body, { textAlign: 'center', fontFamily: F.bold }]}>Photo estimates need a free account</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>
              Sign up or sign in to use the AI. Your food log is backed up too, so you never lose it.
            </Text>
          </Card>
          <Button title="Create account or sign in" onPress={onAccount} />
          <Button title="Enter it by hand" kind="secondary" onPress={() => setStep('edit')} />
        </>
      ) : null}

      {step === 'invite' ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <KeyIcon size={20} color={C.text} />
              <Text style={[s.body, { fontFamily: F.bold }]}>Enter your invite code</Text>
            </View>
            <Text style={s.muted}>
              Forkcast&apos;s photo AI is invite-only for now. You only need to enter the code once.
            </Text>
            <Field label="Invite code" value={invite} onChange={setInvite} text placeholder="e.g. forkcast-1234" />
            {error ? <Text style={st.error}>{error}</Text> : null}
          </Card>
          <Button title="Unlock and analyze" disabled={!invite.trim() || !photo} onPress={() => photo && analyze(photo, invite)} />
          <Button title="Enter it by hand" kind="ghost" onPress={() => setStep('edit')} />
        </>
      ) : null}

      {step === 'pick' ? (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <View style={st.bigIcon}><CameraIcon size={30} color={C.text} /></View>
            <Text style={[s.body, { textAlign: 'center' }]}>
              Snap your meal and Forkcast estimates the calories and macros. For packaged food, snap the barcode and we&apos;ll look up the exact label.
            </Text>
          </Card>
          <Button title="Take a photo" onPress={() => pick(true)} />
          <Button title="Choose from photos" kind="secondary" onPress={() => pick(false)} />
          {error ? (
            <>
              <Text style={st.error}>{error}</Text>
              <Button title="Enter it by hand" kind="ghost" onPress={() => setStep('edit')} />
            </>
          ) : null}
          <Text style={st.note}>
            Photos are sent to an AI service to estimate the nutrition. Forkcast doesn&apos;t keep them.
          </Text>
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
                Sample estimate: the AI isn&apos;t connected in this copy. Edit anything that looks wrong.
              </Text>
            </View>
          ) : match ? (
            <View style={[st.demo, { flexDirection: 'row', gap: 10, alignItems: 'center' }]}>
              <BarcodeIcon size={20} color={C.good} />
              <Text style={[st.demoText, { flex: 1 }]}>
                Barcode {match.barcode} found in the Open Food Facts database. Label values for {match.serving}.
              </Text>
            </View>
          ) : lowConfidence ? (
            <View style={st.demo}>
              <Text style={st.demoText}>Rough guess: this one was hard to see. Check the numbers.</Text>
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
                      {r.name} · {r.calories}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Card>
            <View style={st.row}>
              <View style={st.nameIcon}><ForkIcon size={20} color={C.text} /></View>
              <Field label="What is it?" value={name} onChange={setName} text placeholder="e.g. Turkey sandwich" style={{ flex: 1 }} />
            </View>
            <Field label="Calories (one serving)" value={cal} onChange={setCal} suffix="cal" />
            <View style={st.row}>
              <Field label="Protein" value={protein} onChange={setProtein} suffix="g" style={{ flex: 1 }} />
              <Field label="Carbs" value={carbs} onChange={setCarbs} suffix="g" style={{ flex: 1 }} />
              <Field label="Fat" value={fat} onChange={setFat} suffix="g" style={{ flex: 1 }} />
            </View>
            <View style={[st.row, { justifyContent: 'space-between' }]}>
              <Text style={s.fieldLabel}>Servings</Text>
              <View style={st.row}>
                <Stepper label="-" onPress={() => setServings((v) => Math.max(0.5, v - 0.5))} />
                <Text style={st.servings}>{servings}</Text>
                <Stepper label="+" onPress={() => setServings((v) => Math.min(10, v + 0.5))} />
              </View>
            </View>
          </Card>

          <Card style={{ alignItems: 'center', gap: 4 }}>
            <Headline size={40}>{food.calories.toLocaleString()} cal</Headline>
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
          {mode === 'photo' && photo ? (
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
      {label === '+' ? <PlusIcon size={18} color={C.text} /> : <MinusIcon size={18} color={C.text} />}
    </Pressable>
  );
}


const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { color: C.muted, fontFamily: F.body, fontSize: 24, padding: 4 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: R.lg, backgroundColor: C.card },
  error: { color: C.danger, fontFamily: F.body, fontSize: 15, textAlign: 'center' },
  note: { color: C.muted, fontFamily: F.body, fontSize: 12, textAlign: 'center' },
  demo: { backgroundColor: C.accentSoft, borderRadius: R.sm, padding: 12 },
  demoText: { color: C.text, fontSize: 13, fontFamily: F.medium },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { backgroundColor: C.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  chipText: { color: C.text, fontSize: 14, fontFamily: F.semi },
  servings: { color: C.text, fontSize: 20, fontFamily: F.head, minWidth: 36, textAlign: 'center' },
  step: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: C.text, fontSize: 22, fontFamily: F.head },
  bigIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  nameIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
});
