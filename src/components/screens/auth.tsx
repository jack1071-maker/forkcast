import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Headline, s } from '@/components/bits';
import { friendlyAuthError } from '@/lib/cloud';
import { APP_URL, supabase } from '@/lib/supabase';
import { C, R, doneBuzz } from '@/lib/ui';

type Mode = 'signUp' | 'signIn' | 'reset';

const TITLES: Record<Mode, string> = {
  signUp: 'CREATE ACCOUNT',
  signIn: 'WELCOME BACK',
  reset: 'RESET PASSWORD',
};

const LEADS: Record<Mode, string> = {
  signUp: 'A free account unlocks photo estimates and backs up your food log, so you can use Forkcast on any device.',
  signIn: 'Sign in to get your food log back on this device.',
  reset: 'Enter your account’s email and we’ll send you a link to choose a new password.',
};

/** Email + password sign-up, sign-in and "forgot password". */
export function AuthScreen({
  startMode = 'signUp',
  hasLocalData = false,
  onBack,
}: {
  startMode?: 'signUp' | 'signIn';
  /** True when this device already has food logged as a guest. */
  hasLocalData?: boolean;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>(startMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signUp';
  const resetting = mode === 'reset';
  const emailOk = email.trim().length > 3 && email.includes('@');
  const canSubmit = emailOk && (resetting || password.length >= 6) && !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    if (!supabase || !canSubmit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim().toLowerCase();

    if (resetting) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: APP_URL });
      setBusy(false);
      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      // Same message whether or not the account exists, so nobody can use this to check who has an account.
      setNotice(
        'If there’s an account with that email, a reset link is on its way. Open it, choose a new password, then sign in. Check your spam folder too.',
      );
      return;
    }

    const creds = { email: cleanEmail, password };
    const { data, error: err } = signingUp
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    if (signingUp && !data.session) {
      setNotice('Almost there! Check your email for a confirmation link, then come back and sign in.');
      setMode('signIn');
      return;
    }
    doneBuzz();
    // The app notices the new sign-in and moves on automatically.
  };

  const buttonLabel = busy ? 'One moment…' : resetting ? 'Send reset link' : signingUp ? 'Create account' : 'Sign in';

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <Headline size={30}>{TITLES[mode]}</Headline>
        <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Close">
          <Text style={st.close}>✕</Text>
        </Pressable>
      </View>
      <Text style={s.muted}>{LEADS[mode]}</Text>

      {hasLocalData && signingUp ? (
        <Text style={st.info}>✅ The food already logged on this device will be saved to your new account.</Text>
      ) : null}
      {hasLocalData && mode === 'signIn' ? (
        <Text style={st.info}>⚠️ Signing in replaces what&apos;s on this device with what&apos;s saved in your account.</Text>
      ) : null}

      <Card>
        <Text style={s.fieldLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          placeholder="you@example.com"
          placeholderTextColor={C.muted}
          style={st.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType={resetting ? 'send' : 'next'}
          onSubmitEditing={resetting ? submit : undefined}
        />
        {!resetting ? (
          <>
            <Text style={s.fieldLabel}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              placeholder={signingUp ? 'At least 6 characters' : 'Your password'}
              placeholderTextColor={C.muted}
              style={st.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              textContentType={signingUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </>
        ) : null}
      </Card>

      {error ? <Text style={st.error}>{error}</Text> : null}
      {notice ? <Text style={st.info}>{notice}</Text> : null}

      <Button title={buttonLabel} disabled={!canSubmit} onPress={submit} />

      {signingUp ? (
        <Button title="I already have an account" kind="ghost" onPress={() => switchMode('signIn')} />
      ) : null}
      {mode === 'signIn' ? (
        <>
          <Button title="Forgot password?" kind="ghost" onPress={() => switchMode('reset')} />
          <Button title="Create a new account" kind="ghost" onPress={() => switchMode('signUp')} />
        </>
      ) : null}
      {resetting ? <Button title="Back to sign in" kind="ghost" onPress={() => switchMode('signIn')} /> : null}
    </ScrollView>
  );
}

/** Shown after opening a password-reset link: choose a new password. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!supabase || password.length < 6) return;
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    doneBuzz();
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <Headline size={30}>NEW PASSWORD</Headline>
      <Text style={s.muted}>Choose a new password for your Forkcast account.</Text>
      <Card>
        <Text style={s.fieldLabel}>New password</Text>
        <TextInput
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          placeholder="At least 6 characters"
          placeholderTextColor={C.muted}
          style={st.input}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </Card>
      {error ? <Text style={st.error}>{error}</Text> : null}
      <Button title={busy ? 'Saving…' : 'Save new password'} disabled={password.length < 6 || busy} onPress={save} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, gap: 14, paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { color: C.muted, fontSize: 24, padding: 4 },
  input: {
    backgroundColor: C.cardHi,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 17,
  },
  error: { color: C.danger, fontSize: 15, textAlign: 'center' },
  info: { color: C.accent, fontSize: 15, textAlign: 'center' },
});
