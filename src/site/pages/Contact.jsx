import { useRef, useState } from 'react';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, IconPhone, IconPin, useToast } from '../../components/ui.jsx';
import { Dot, PageHead, stripes, submitLead, waLink } from '../parts.jsx';

const lbl = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, minWidth: 0 };
const card = { textAlign: 'start', padding: 22, borderRadius: 18, border: '1px solid #e7e7e3', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, color: '#1d1e22' };
const SUBJECTS = { 'شراء عقار': 'sale', 'إيجار عقار': 'rent', 'بيع أو تأجير عقاري': null, 'استثمار': null, 'زيارة المكتب': null, 'أخرى': null };

export default function Contact() {
  useDocTitle('تواصل');
  const S = useSite();
  const L = useLayout();
  const toast = useToast();
  const formRef = useRef(null);
  const [f, setF] = useState({ name: '', phone: '', subject: 'شراء عقار', time: 'بعد الظهر', msg: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const st = S.settings;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitLead({ name: f.name, phone: f.phone, kind: 'contact', message: `الموضوع: ${f.subject} · أفضل وقت: ${f.time}${f.msg ? '\n' + f.msg : ''}`, deal: SUBJECTS[f.subject] });
      setDone(true);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="تواصل" title="تواصل ويّا ڤايرو" h1Fs={L.h1Fs} sub={`ساعات الدوام: ${st.office_hours}. اختار الطريقة اللي تريحك.`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 24 }}>
        <a className="h-shadow" href={waLink(st.office_whatsapp, 'مرحبا ڤايرو')} target="_blank" rel="noreferrer" style={card}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#e6f6ee', color: '#0f8a4f', display: 'grid', placeItems: 'center', fontWeight: 700 }}>W</span>
          <div><div style={{ fontWeight: 600, fontSize: 16 }}>واتساب</div><div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>الرد خلال دقائق</div></div>
          <div style={{ fontWeight: 600 }} dir="ltr">{st.office_whatsapp}</div>
        </a>
        <a className="h-shadow" href={`tel:${st.office_phone.replace(/[^\d+]/g, '')}`} style={card}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#f6f6f4', display: 'grid', placeItems: 'center' }}><IconPhone /></span>
          <div><div style={{ fontWeight: 600, fontSize: 16 }}>اتصال</div><div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>{st.office_hours}</div></div>
          <div style={{ fontWeight: 600 }} dir="ltr">{st.office_phone}</div>
        </a>
        <button className="h-shadow" style={card} onClick={() => { setF({ ...f, subject: 'زيارة المكتب' }); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#f6f6f4', display: 'grid', placeItems: 'center' }}><IconPin /></span>
          <div><div style={{ fontWeight: 600, fontSize: 16 }}>زيارة المكتب</div><div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>{st.office_address}</div></div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>احجز موعد</div>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 32, marginTop: 32, alignItems: 'start' }}>
        <form ref={formRef} onSubmit={submit} style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: L.phone ? 20 : 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>أو خلّينا نتصل بيك</h2>
          {done ? (
            <div style={{ padding: '20px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 18, color: '#0f8a4f' }}>✓ وصلنا طلبك</div>
              <div style={{ color: '#5a5e68', marginTop: 6 }}>راح نتصل بيك {f.time === 'أي وقت' ? 'قريباً' : f.time}.</div>
              <Btn style={{ marginTop: 16 }} onClick={() => { setDone(false); setF({ ...f, msg: '' }); }}>طلب جديد</Btn>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 12 }}>
                <label style={lbl}>الاسم<input className="inp" required minLength={2} maxLength={120} placeholder="اسمك" value={f.name} onChange={set('name')} /></label>
                <label style={lbl}>رقم الهاتف<input className="inp" required dir="ltr" inputMode="tel" pattern="[0-9+ ()-]{7,20}" placeholder="07xx xxx xxxx" style={{ textAlign: 'right' }} value={f.phone} onChange={set('phone')} /></label>
                <label style={lbl}>الموضوع<select className="inp sel" style={{ fontWeight: 400 }} value={f.subject} onChange={set('subject')}>{Object.keys(SUBJECTS).map((s) => <option key={s}>{s}</option>)}</select></label>
                <label style={lbl}>أفضل وقت للاتصال<select className="inp sel" style={{ fontWeight: 400 }} value={f.time} onChange={set('time')}>{['صباحاً', 'بعد الظهر', 'مساءً', 'أي وقت'].map((s) => <option key={s}>{s}</option>)}</select></label>
                <label style={{ ...lbl, gridColumn: '1/-1' }}>رسالتك<textarea className="inp" placeholder="اكتب شنو تحتاج…" style={{ minHeight: 110 }} maxLength={1500} value={f.msg} onChange={set('msg')} /></label>
              </div>
              <Btn type="submit" kind="dark" h={46} px={24} fs={14.5} style={{ marginTop: 16 }} disabled={busy}>{busy ? 'جاري الإرسال…' : 'أرسل الطلب'}</Btn>
            </>
          )}
        </form>
        <div style={{ background: '#f6f6f4', borderRadius: 24, padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>مكتب ڤايرو</div>
          <div style={{ color: '#5a5e68', fontSize: 14, marginTop: 6, lineHeight: 1.7 }}>{st.office_address}<br />أربيل، إقليم كوردستان</div>
          <a href={st.office_map_url || `https://maps.google.com/?q=${encodeURIComponent(st.office_address + ' Erbil')}`} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 14, height: 140, borderRadius: 14, background: stripes('#ecece9', '#e5e5e1'), position: 'relative' }} aria-label="افتح الموقع على الخريطة"><Dot size={14} style={{ boxShadow: 'none' }} /></a>
          <div style={{ fontSize: 13, color: '#767a83', marginTop: 12 }}>{st.office_hours}</div>
        </div>
      </div>
    </section>
  );
}
