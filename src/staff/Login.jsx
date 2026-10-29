import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { useDocTitle } from '../lib/hooks.js';
import { Btn, Icon, Logo, Spinner, useToast } from '../components/ui.jsx';

// Ported from the reference's OS sign-in (os/shell.js `login()`): centred os-card on bg-paper-2.
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper-2" dir="rtl">
      <div className="w-full max-w-[460px] os-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6"><Logo /><Link to="/" className="link text-[13px]"><Icon name="globe" size={15} />الموقع</Link></div>
        {A.session && !A.me ? (
          <>
            <div className="osb osb-amber mb-3">غير مفعّل</div>
            <h1 className="t-h2 text-[26px]">حسابك غير مفعّل</h1>
            <p className="text-ink-500 text-[14px] mt-1 leading-relaxed">سجّلت الدخول بـ <b dir="ltr" className="text-ink">{A.session.user.email}</b> لكن هذا البريد غير مضاف لفريق ڤايرو. اطلب من مدير النظام دعوتك من «المستخدمون والصلاحيات» بنفس البريد.</p>
            <div className="grid grid-cols-2 gap-2 mt-6"><Btn kind="dark" onClick={() => A.refreshMe()}>تحقّق مرة ثانية</Btn><Btn onClick={A.signOut}>تسجيل الخروج</Btn></div>
          </>
        ) : (
          <>
            <div className="osb osb-ink mb-3">VAIRO OS</div>
            <h1 className="t-h2 text-[28px]">{mode === 'up' ? 'تفعيل حساب الفريق' : mode === 'reset' ? 'نسيت كلمة المرور' : 'تسجيل الدخول لڤايرو'}</h1>
            <p className="text-ink-500 text-[14px] mt-1">{mode === 'up' ? 'استخدم نفس البريد اللي دعاك عليه مدير النظام.' : mode === 'reset' ? 'نرسل لك رابط إعادة تعيين كلمة المرور على بريدك.' : 'حساب واحد لإدارة الموقع ونظام العملاء.'}</p>
            <form onSubmit={submit} className="mt-6">
              <label className="flabel" htmlFor="login-email">إيميل العمل</label>
              <input id="login-email" className="field" type="email" required dir="ltr" autoComplete="email" placeholder="name@vairo.iq" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              {mode !== 'reset' && <>
                <label className="flabel mt-3" htmlFor="login-pw">كلمة السر</label>
                <input id="login-pw" className="field" type="password" required minLength={6} dir="ltr" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              </>}
              <button type="submit" className="btn btn-red btn-lg w-full mt-5" disabled={busy}>{busy ? '…' : mode === 'up' ? 'إنشاء الحساب' : mode === 'reset' ? 'أرسل الرابط' : 'دخول'}</button>
              <div className="flex flex-wrap justify-between gap-2 mt-3 text-[13px]">
                {mode === 'in' ? <button type="button" className="link text-red" onClick={() => setMode('up')}>أول مرة؟ فعّل حسابك</button> : <button type="button" className="link" onClick={() => setMode('in')}><Icon name="chev" size={14} className="flip-rtl" />رجوع لتسجيل الدخول</button>}
                {mode === 'in' && <button type="button" className="link text-ink-500" onClick={() => setMode('reset')}>نسيت كلمة السر؟</button>}
              </div>
            </form>
          </>
        )}
        <div className="mt-6 pt-5 border-t hair flex items-start gap-2 text-[12.5px] text-ink-500"><Icon name="lock" size={15} className="mt-0.5" /><span>دخول فريق ڤايرو فقط · <Link to="/" className="link">الرجوع للموقع</Link></span></div>
      </div>
    </div>
  );
}
