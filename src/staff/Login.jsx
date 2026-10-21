import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useDocTitle } from '../lib/hooks.js';
import { Btn, Field, LogoMark, Spinner, useToast } from '../components/ui.jsx';

export default function Login() {
  useDocTitle('دخول الفريق');
  const A = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState('in'); // in | up | reset
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const next = sp.get('next');

  useEffect(() => {
    if (A.me) nav(next && next.startsWith('/') ? next : A.me.role === 'agent' ? '/crm' : '/cms', { replace: true });
  }, [A.me, next, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, { redirectTo: window.location.origin + '/login' });
        if (error) throw error;
        toast('أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك');
        setMode('in');
      } else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password });
        if (error) throw error;
        if (!data.session) toast('تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول');
      } else {
        const { error } = await supabase.auth.signInWithPassword(f);
        if (error) throw error;
      }
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally { setBusy(false); }
  };

  if (A.loading) return <Spinner pad={160} />;
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f6f6f4', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #e7e7e3', borderRadius: 24, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} dir="ltr"><LogoMark size={30} /><div><div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>VAIRO</div><div style={{ fontSize: 11, color: '#767a83' }}>إدارة المحتوى · CRM</div></div></div>
        {A.session && !A.me ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '24px 0 6px' }}>حسابك غير مفعّل</h1>
            <p style={{ color: '#5a5e68', fontSize: 14, lineHeight: 1.7, margin: 0 }}>سجّلت الدخول بـ <b dir="ltr">{A.session.user.email}</b> لكن هذا البريد غير مضاف لفريق ڤايرو. اطلب من مدير النظام دعوتك من «المستخدمون والصلاحيات» بنفس البريد.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}><Btn kind="dark" onClick={() => A.refreshMe()}>تحقّق مرة ثانية</Btn><Btn onClick={A.signOut}>تسجيل الخروج</Btn></div>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{mode === 'up' ? 'تفعيل حساب الفريق' : mode === 'reset' ? 'نسيت كلمة المرور' : 'دخول الفريق'}</h1>
            {mode === 'up' && <div style={{ fontSize: 13, color: '#767a83', lineHeight: 1.6 }}>استخدم نفس البريد اللي دعاك عليه مدير النظام.</div>}
            <Field label="البريد الإلكتروني"><input className="inp" type="email" required dir="ltr" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            {mode !== 'reset' && <Field label="كلمة المرور"><input className="inp" type="password" required minLength={6} dir="ltr" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>}
            <Btn type="submit" kind="red" h={46} fs={14.5} disabled={busy}>{busy ? '…' : mode === 'up' ? 'إنشاء الحساب' : mode === 'reset' ? 'أرسل الرابط' : 'دخول'}</Btn>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              {mode === 'in' ? <a style={{ cursor: 'pointer', color: '#c8102e' }} onClick={() => setMode('up')}>أول مرة؟ فعّل حسابك</a> : <a style={{ cursor: 'pointer', color: '#c8102e' }} onClick={() => setMode('in')}>رجوع لتسجيل الدخول</a>}
              {mode === 'in' && <a style={{ cursor: 'pointer', color: '#767a83' }} onClick={() => setMode('reset')}>نسيت كلمة المرور؟</a>}
            </div>
          </form>
        )}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #e7e7e3', fontSize: 13 }}><Link to="/" style={{ color: '#767a83' }}>← الرجوع للموقع</Link></div>
      </div>
    </div>
  );
}
