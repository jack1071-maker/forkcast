import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { History } from '@/components/screens/history';
import { Progress } from '@/components/screens/progress';
import { NewFood, Review } from '@/components/screens/review';
import { Setup } from '@/components/screens/setup';
import { Today } from '@/components/screens/today';
import { AppState, EMPTY_STATE, Profile, computeGoals, dayKey, loadState, newId, recentFoods, saveState } from '@/lib/food';
import { C, doneBuzz, tapBuzz } from '@/lib/ui';

type Tab = 'today' | 'history' | 'progress';
type Overlay = null | 'photo' | 'manual' | 'goals';

/**
 * The brain: holds all the app's data, picks which screen to show,
 * and saves every change on the device.
 */
export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [overlay, setOverlay] = useState<Overlay>(null);

  // Load saved data once when the app opens.
  useEffect(() => {
    loadState().then(setState);
  }, []);

  // Save on this device every time something changes.
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  if (!state) {
    return (
      <View style={[st.fill, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const saveProfile = (p: Profile) => {
    const today = dayKey();
    setState((s) => {
      if (!s) return s;
      // The weight from setup counts as today's weigh-in.
      const weights = [...s.weights.filter((w) => w.day !== today), { day: today, kg: p.weightKg }];
      return { ...s, profile: p, goals: computeGoals(p), weights };
    });
    setOverlay(null);
  };

  const addFood = (f: NewFood) => {
    doneBuzz();
    setState((s) =>
      s ? { ...s, entries: [...s.entries, { ...f, id: newId(), day: dayKey(), time: new Date().toISOString() }] } : s,
    );
    setOverlay(null);
    setTab('today');
  };

  const deleteFood = (id: string) => setState((s) => (s ? { ...s, entries: s.entries.filter((e) => e.id !== id) } : s));

  const weigh = (kg: number) => {
    doneBuzz();
    const today = dayKey();
    setState((s) =>
      s
        ? {
            ...s,
            weights: [...s.weights.filter((w) => w.day !== today), { day: today, kg }],
            // Keep the profile weight current so "Edit goals" starts from it.
            profile: s.profile ? { ...s.profile, weightKg: kg } : s.profile,
          }
        : s,
    );
  };

  // First run: no goals yet, so show setup.
  if (!state.profile || !state.goals) {
    return (
      <Screen>
        <Setup initial={null} onSave={saveProfile} />
      </Screen>
    );
  }

  if (overlay === 'goals') {
    return (
      <Screen>
        <Setup initial={state.profile} onSave={saveProfile} onCancel={() => setOverlay(null)} />
      </Screen>
    );
  }

  if (overlay === 'photo' || overlay === 'manual') {
    return (
      <Screen>
        <Review mode={overlay} recent={recentFoods(state)} onAdd={addFood} onClose={() => setOverlay(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {tab === 'today' ? (
          <Today
            state={state}
            onSnap={() => setOverlay('photo')}
            onManual={() => setOverlay('manual')}
            onDelete={deleteFood}
          />
        ) : null}
        {tab === 'history' ? <History state={state} /> : null}
        {tab === 'progress' ? (
          <Progress
            state={state}
            onWeigh={weigh}
            onEditGoals={() => setOverlay('goals')}
            onReset={() => {
              setState(EMPTY_STATE);
              setTab('today');
            }}
          />
        ) : null}
      </View>
      <View style={st.tabs}>
        <TabButton icon="🍽️" label="Today" on={tab === 'today'} onPress={() => setTab('today')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Snap your food"
          onPress={() => {
            tapBuzz();
            setOverlay('photo');
          }}
          style={({ pressed }) => [st.snap, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Text style={st.snapIcon}>📸</Text>
        </Pressable>
        <TabButton icon="📅" label="History" on={tab === 'history'} onPress={() => setTab('history')} />
        <TabButton icon="📈" label="Progress" on={tab === 'progress'} onPress={() => setTab('progress')} />
      </View>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={st.fill} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.column}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({ icon, label, on, onPress }: { icon: string; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      style={st.tab}>
      <Text style={[st.tabIcon, { opacity: on ? 1 : 0.5 }]}>{icon}</Text>
      <Text style={[st.tabLabel, { color: on ? C.accent : C.muted }]}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  // On wide screens (the web), keep the app phone-width and centered.
  column: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 12, fontWeight: '700' },
  snap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: -22,
    borderWidth: 4,
    borderColor: C.bg,
  },
  snapIcon: { fontSize: 26 },
});
