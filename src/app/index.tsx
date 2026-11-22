import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  AppState as RNAppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarIcon, CameraIcon, RingIcon, TrendIcon } from '@/components/icons';
import { AuthScreen, NewPasswordScreen } from '@/components/screens/auth';
import { History } from '@/components/screens/history';
import { Progress, SyncStatus } from '@/components/screens/progress';
import { NewFood, Review } from '@/components/screens/review';
import { Setup } from '@/components/screens/setup';
import { Today } from '@/components/screens/today';
import { fetchCloud, getSyncedAt, pushCloud, setSyncedAt } from '@/lib/cloud';
import {
  AppState,
  EMPTY_STATE,
  Profile,
  computeGoals,
  dayKey,
  loadState,
  newId,
  recentFoods,
  saveState,
} from '@/lib/food';
import { cloudEnabled, supabase } from '@/lib/supabase';
import { C, F, doneBuzz, tapBuzz } from '@/lib/ui';
import { useAccount } from '@/lib/use-account';

type Tab = 'today' | 'history' | 'progress';
type Overlay = null | 'photo' | 'manual' | 'goals' | 'signUp' | 'signIn';

/** How long to wait after the last change before uploading, so quick edits become one upload. */
const PUSH_DELAY_MS = 1500;

/**
 * The brain: holds all the app's data, picks which screen to show,
 * saves every change on the device, and (when signed in) backs it up to Supabase.
 */
export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [overlay, setOverlay] = useState<Overlay>(null);
  /** Where to go back to after signing in from the snap screen. */
  const [afterAuth, setAfterAuth] = useState<Overlay>(null);
  const { user, ready: authReady, recovering, doneRecovering } = useAccount();
  const [sync, setSync] = useState<SyncStatus>('idle');

  // Refs let the async sync code always see the latest values.
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;
  const syncedUserId = useRef<string | null>(null);
  /** False until the first download/upload after signing in has finished. No uploads before then. */
  const syncReady = useRef(false);
  const skipNextPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved data once when the app opens.
  useEffect(() => {
    loadState().then(setState);
  }, []);

  // Save on this device every time something changes.
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  /** Replace this device's data with the online copy (without uploading it straight back). */
  const applyCloud = (cloudState: AppState) => {
    // Drop any upload still waiting, so it can't send the old copy after this.
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
    }
    skipNextPush.current = true;
    setState(cloudState);
  };

  // When someone signs in (or the app opens already signed in), sync with their account.
  useEffect(() => {
    if (!user || !state) {
      if (!user) syncedUserId.current = null;
      return;
    }
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    syncReady.current = false;
    // Leave the sign-in screen, returning to the snap screen if that's where they came from.
    setOverlay((o) => (o === 'signUp' || o === 'signIn' ? afterAuth : o));
    setAfterAuth(null);
    (async () => {
      setSync('syncing');
      try {
        const cloud = await fetchCloud(user.id);
        if (cloud) {
          // This account already has data saved online: use that.
          applyCloud(cloud.state);
          await setSyncedAt(cloud.updatedAt);
        } else {
          // Brand-new account: save whatever is on this device (e.g. guest meals) to it.
          const local = stateRef.current ?? EMPTY_STATE;
          const savedAt = await pushCloud(user.id, local);
          await setSyncedAt(savedAt);
        }
        setSync('synced');
      } catch {
        setSync('error');
      } finally {
        syncReady.current = true;
      }
    })();
    // Runs when the signed-in user changes (state is read through stateRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state === null]);

  // Upload changes a moment after they happen, while signed in.
  useEffect(() => {
    // Wait for the first download after signing in, so this device's old copy can't overwrite the account's.
    if (!user || !state || syncedUserId.current !== user.id || !syncReady.current) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      pushTimer.current = null;
      setSync('syncing');
      try {
        const savedAt = await pushCloud(user.id, stateRef.current ?? state);
        await setSyncedAt(savedAt);
        setSync('synced');
      } catch {
        setSync('error'); // Kept on this device; it uploads with the next change.
      }
    }, PUSH_DELAY_MS);
  }, [state, user]);

  // When the app comes back to the screen, grab any newer changes made on another device.
  useEffect(() => {
    if (!user) return;
    const sub = RNAppState.addEventListener('change', async (s) => {
      if (s !== 'active' || pushTimer.current) return; // don't overwrite changes still uploading
      try {
        const [cloud, syncedAt] = await Promise.all([fetchCloud(user.id), getSyncedAt()]);
        if (cloud && (!syncedAt || cloud.updatedAt > syncedAt)) {
          applyCloud(cloud.state);
          await setSyncedAt(cloud.updatedAt);
          setSync('synced');
        }
      } catch {
        // Offline: keep using this device's copy.
      }
    });
    return () => sub.remove();
  }, [user]);

  if (!state || !authReady) {
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

  /** Upload anything not yet saved, then sign out and clear this device for the next person. */
  const signOut = async () => {
    if (!supabase) return;
    if (user && pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
      try {
        await pushCloud(user.id, stateRef.current ?? EMPTY_STATE);
      } catch {
        // Offline: the last successful upload is still saved online.
      }
    }
    await supabase.auth.signOut();
    await setSyncedAt(null);
    skipNextPush.current = true;
    setSync('idle');
    setTab('today');
    setState(EMPTY_STATE);
  };

  /** Permanently delete the signed-in account and everything saved in it. */
  const deleteAccount = async (): Promise<string | null> => {
    if (!supabase || !user) return 'You’re not signed in.';
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return 'Couldn’t delete your account. Check your internet and try again.';
    await supabase.auth.signOut();
    await setSyncedAt(null);
    skipNextPush.current = true;
    setSync('idle');
    setTab('today');
    setState(EMPTY_STATE);
    return null;
  };

  const openAuth = (mode: 'signUp' | 'signIn', returnTo: Overlay = null) => {
    setAfterAuth(returnTo);
    setOverlay(mode);
  };

  // Someone opened a password-reset link: let them choose a new password first.
  if (recovering) {
    return (
      <Screen>
        <NewPasswordScreen onDone={doneRecovering} />
      </Screen>
    );
  }

  if (overlay === 'signUp' || overlay === 'signIn') {
    return (
      <Screen>
        <AuthScreen
          startMode={overlay}
          hasLocalData={state.entries.length > 0}
          onBack={() => {
            setOverlay(afterAuth);
            setAfterAuth(null);
          }}
        />
      </Screen>
    );
  }

  // First run: no goals yet, so show setup (with a way in for people who already have an account).
  if (!state.profile || !state.goals) {
    return (
      <Screen>
        <Setup initial={null} onSave={saveProfile} onSignIn={cloudEnabled && !user ? () => openAuth('signIn') : undefined} />
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
        <Review
          mode={overlay}
          recent={recentFoods(state)}
          needsAccount={cloudEnabled && !user}
          onAccount={() => openAuth('signUp', 'photo')}
          onAdd={addFood}
          onClose={() => setOverlay(null)}
        />
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
            account={{
              enabled: cloudEnabled,
              email: user?.email ?? null,
              sync,
              onSignUp: () => openAuth('signUp'),
              onSignIn: () => openAuth('signIn'),
              onSignOut: signOut,
              onDelete: deleteAccount,
            }}
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
        <TabButton Icon={RingIcon} label="Today" on={tab === 'today'} onPress={() => setTab('today')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Snap your food"
          onPress={() => {
            tapBuzz();
            setOverlay('photo');
          }}
          style={({ pressed }) => [st.snap, pressed && { transform: [{ scale: 0.94 }] }]}>
          <CameraIcon size={26} color={C.onAccent} strokeWidth={2} />
        </Pressable>
        <TabButton Icon={CalendarIcon} label="History" on={tab === 'history'} onPress={() => setTab('history')} />
        <TabButton Icon={TrendIcon} label="Progress" on={tab === 'progress'} onPress={() => setTab('progress')} />
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

function TabButton({
  Icon,
  label,
  on,
  onPress,
}: {
  Icon: (p: { size?: number; color?: string }) => React.JSX.Element;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      style={st.tab}>
      <Icon size={24} color={on ? C.text : C.muted} />
      <Text style={[st.tabLabel, { color: on ? C.text : C.muted }]}>{label}</Text>
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
    borderTopColor: '#16171A',
    backgroundColor: C.bg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabLabel: { fontSize: 10, fontFamily: F.semi, letterSpacing: 1, textTransform: 'uppercase' },
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
});
