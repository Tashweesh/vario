import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Session + the signed-in staff profile (`me`: agent_id, name, role…). `me` is null for
// accounts that exist in auth but were never invited to the team.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [me, setMe] = useState(undefined);

  const loadMe = useCallback(async (s) => {
    if (!s) return setMe(null);
    const { data, error } = await supabase.rpc('me');
    setMe(error ? null : data?.[0] || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadMe(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      // defer: supabase calls inside this callback would wait on the auth lock it holds
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT' || evt === 'USER_UPDATED') { setMe(undefined); setTimeout(() => loadMe(s), 0); }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadMe]);

  const role = me?.role;
  const value = {
    session, me, loading: session === undefined || (session && me === undefined),
    isAdmin: role === 'admin', isEditor: role === 'admin' || role === 'editor', isAgent: role === 'agent',
    refreshMe: () => loadMe(session),
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
