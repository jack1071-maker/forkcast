import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * The signed-in user (or null), whether the app has finished checking, and whether
 * someone just opened a password-reset link and needs to choose a new password.
 */
export function useAccount(): { user: User | null; ready: boolean; recovering: boolean; doneRecovering: () => void } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // Check for a saved sign-in when the app opens...
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      // An older Forkcast version signed people in invisibly (anonymous). Drop those; they hold no data.
      if (data.session?.user.is_anonymous) {
        await supabase!.auth.signOut();
        if (!alive) return;
        setUser(null);
      } else {
        setUser(data.session?.user ?? null);
      }
      setReady(true);
    });
    // ...and keep listening for sign-ins, sign-outs and password-reset links.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user && !session.user.is_anonymous ? session.user : null);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const doneRecovering = useCallback(() => setRecovering(false), []);
  return { user, ready, recovering, doneRecovering };
}
