import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Session + the signed-in staff profile (`me`: agent_id, name, role…). `me` is null for
// accounts that exist in auth but were never invited to the team.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [me, setMe] = useState(undefined);

  // background=true: a refresh that must not kick the user out on a transient error (keeps the current profile).
  const loadMe = useCallback(async (s, background = false) => {
    if (!s) return setMe(null);
    const { data, error } = await supabase.rpc('me');
    if (error) { if (!background) setMe(null); return; }
    setMe(data?.[0] || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadMe(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      // defer: supabase calls inside this callback would wait on the auth lock it holds
      if (evt === 'SIGNED_OUT') { setMe(null); return; }
      // SIGNED_IN also fires every time the tab regains focus. Resetting `me` would flip `loading`, unmount the whole
      // app behind a spinner and drop any unsaved form — so refresh the profile in the background instead.
      if (evt === 'SIGNED_IN' || evt === 'USER_UPDATED' || evt === 'TOKEN_REFRESHED') setTimeout(() => loadMe(s, true), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMe]);

  const role = me?.role;
  const value = {
    session, me, loading: session === undefined || (session && me === undefined),
    isAdmin: role === 'admin', isEditor: role === 'admin' || role === 'editor', isAgent: role === 'agent',
    refreshMe: () => loadMe(session, true),
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
