import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState as RNAppState, Platform } from 'react-native';

// These come from the .env file (see .env.example). Both are designed to be public:
// the server checks who is signed in and enforces the daily photo limits.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False if the app was built without Supabase keys. Photo analysis then uses sample meals. */
export const cloudEnabled = Boolean(url && key);

// While the web version is pre-rendered on the build machine there is no browser storage,
// so only use AsyncStorage when the app is actually running.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
      auth: {
        storage: isServer ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: !isServer,
        detectSessionInUrl: false,
      },
    })
  : null;

// Keep the sign-in fresh while the app is open, and pause refreshing in the background.
if (supabase && Platform.OS !== 'web') {
  RNAppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/**
 * Makes sure this device has a (silent, anonymous) Forkcast sign-in.
 * No email or password: Supabase gives the device a private user ID,
 * which the server uses for the daily photo limit.
 */
export async function ensureSignedIn() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signedIn.session;
}
