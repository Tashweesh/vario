import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Tile, useToast } from '../../components/ui.jsx';
import { submitLead } from '../parts.jsx';

const lbl = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, minWidth: 0 };
const h3 = (m = '24px 0 14px') => ({ fontSize: 20, fontWeight: 600, margin: m });
const tick = (t) => <li key={t} style={{ display: 'flex', gap: 8 }}><span style={{ color: '#0f8a4f' }}>✓</span>{t}</li>;

export default function Owners() {
  useDocTitle('بيع / أجّر عقارك');
  const S = useSite();
  const L = useLayout();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ mode: sp.get('mode') === 'rent' ? 'rent' : sp.get('mode') === 'sale' ? 'sale' : 'sale', type: 'شقة', area: '', size: '', beds: '', price: '', notes: '', name: '', phone: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
  const MODES = { sale: 'بيع', rent: 'إيجار', undecided: 'ما قررت بعد' };

  const next = () => {
    if (step === 1 && !f.area) return toast('اختار المنطقة', 'error');
    setStep(step + 1);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (step < 3) return next();
    setBusy(true);
    try {
      const area = S.areas.find((a) => a.id === f.area)?.name || '';
      const msg = [`يريد: ${MODES[f.mode]}`, `النوع: ${f.type}`, `المنطقة: ${area}`, f.size && `المساحة: ${f.size} م²`, f.beds && `الغرف: ${f.beds}`, f.price && `السعر المتوقع: $${f.price}`, f.notes].filter(Boolean).join(' · ');
      await submitLead({ name: f.name, phone: f.phone, kind: 'owner', message: msg, deal: f.mode === 'undecided' ? null : f.mode, budget: f.price ? +f.price : null });
      setDone(true);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const stepDot = (n, t) => (
    <>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: step >= n ? '#1d1e22' : 'transparent', color: step >= n ? '#fff' : '#767a83', border: step >= n ? 0 : '1px solid #d8d8d3', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12 }}>{n}</span>
      <span style={{ fontWeight: step === n ? 600 : 400, color: step === n ? '#1d1e22' : '#767a83' }}>{t}</span>
    </>
  );
  const line = <span style={{ width: 24, height: 1, background: '#d8d8d3' }} />;

  return (
    <section style={{ paddingTop: 28 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#767a83' }}>لأصحاب العقارات</div>
        <h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: '8px 0 0', letterSpacing: '-.01em' }}>بيع عقارك أو أجّره بدون صداع</h1>
        <p style={{ color: '#5a5e68', margin: '12px 0 0', lineHeight: 1.75 }}>نقيّم العقار، نصوّره، ننشره، ونتابع كل المشترين والمستأجرين. أنت بس تقرر.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 16, marginTop: 32 }}>
        <div style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: 28, background: '#fff' }}><div style={{ fontSize: 12, fontWeight: 600, color: '#c8102e' }}>بيع</div><h2 style={{ fontSize: 24, fontWeight: 600, margin: '6px 0 0' }}>بيع عقارك</h2><p style={{ color: '#5a5e68', margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.7 }}>تقييم مجاني خلال 48 ساعة، تصوير احترافي، وعرض على كل قنوات ڤايرو.</p><ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>{['عمولة واضحة من البداية', 'تقارير أسبوعية عن المشاهدات والطلبات', 'متابعة قانونية حتى نقل الملكية'].map(tick)}</ul></div>
        <div style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: 28, background: '#fff' }}><div style={{ fontSize: 12, fontWeight: 600, color: '#c8102e' }}>إيجار</div><h2 style={{ fontSize: 24, fontWeight: 600, margin: '6px 0 0' }}>أجّر عقارك</h2><p style={{ color: '#5a5e68', margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.7 }}>نحدد الإيجار المناسب، نفلتر المستأجرين، ونجهّز العقد.</p><ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>{['تحقق من هوية المستأجر', 'عقد إيجار جاهز', 'إدارة اختيارية للعقار'].map(tick)}</ul></div>
      </div>

      <form onSubmit={submit} style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: L.phone ? 20 : 28, marginTop: 16, background: '#f6f6f4' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: '#e6f6ee', color: '#0f8a4f', display: 'grid', placeItems: 'center', margin: '0 auto', fontSize: 26, fontWeight: 700 }}>✓</div>
            <h3 style={h3('16px 0 6px')}>وصلنا طلبك</h3>
            <div style={{ color: '#5a5e68' }}>مستشار ڤايرو راح يتصل بيك خلال يوم عمل لترتيب التقييم المجاني.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap' }}>{stepDot(1, 'العقار')}{line}{stepDot(2, 'التفاصيل')}{line}{stepDot(3, 'تواصلك')}</div>
            {step === 1 && (
              <>
                <h3 style={h3('20px 0 14px')}>شنو تريد تسوي؟</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>{Object.entries(MODES).map(([k, t]) => <Tile key={k} on={f.mode === k} onClick={() => set('mode')(k)}>{t}</Tile>)}</div>
                <h3 style={h3()}>نوع العقار</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 }}>{['شقة', 'بيت', 'فيلا', 'أرض', 'تجاري'].map((t) => <Tile key={t} on={f.type === t} onClick={() => set('type')(t)}>{t}</Tile>)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 10, marginTop: 24 }}>
                  <label style={lbl}>المنطقة<select className="inp sel" value={f.area} onChange={set('area')} style={{ fontWeight: 400 }}><option value="">اختار المنطقة</option>{S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  <label style={lbl}>المساحة (م²)<input className="inp" type="number" min="1" inputMode="numeric" placeholder="مثلاً 180" value={f.size} onChange={set('size')} /></label>
                </div>
              </>
            )}
            {step === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 10, marginTop: 20 }}>
                <label style={lbl}>غرف النوم<input className="inp" type="number" min="0" inputMode="numeric" placeholder="مثلاً 3" value={f.beds} onChange={set('beds')} /></label>
                <label style={lbl}>{f.mode === 'rent' ? 'الإيجار المتوقع شهرياً (دولار)' : 'السعر المتوقع (دولار)'}<input className="inp" type="number" min="0" inputMode="numeric" placeholder="اختياري" value={f.price} onChange={set('price')} /></label>
                <label style={{ ...lbl, gridColumn: '1/-1' }}>تفاصيل إضافية<textarea className="inp" rows={4} placeholder="الطابق، الحالة، سند الملكية، أي شي مهم…" value={f.notes} onChange={set('notes')} maxLength={1200} /></label>
              </div>
            )}
            {step === 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 10, marginTop: 20 }}>
                <label style={lbl}>الاسم<input className="inp" required minLength={2} placeholder="اسمك" value={f.name} onChange={set('name')} /></label>
                <label style={lbl}>رقم الهاتف<input className="inp" required dir="ltr" inputMode="tel" pattern="[0-9+ ()-]{7,20}" style={{ textAlign: 'right' }} placeholder="07xx xxx xxxx" value={f.phone} onChange={set('phone')} /></label>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 8 }}>
              {step > 1 ? <Btn h={46} onClick={() => setStep(step - 1)}>→ السابق</Btn> : <span />}
              {step < 3 ? <Btn kind="red" h={46} px={24} fs={14.5} onClick={next}>التالي ←</Btn> : <Btn type="submit" kind="red" h={46} px={24} fs={14.5} disabled={busy}>{busy ? 'جاري الإرسال…' : 'أرسل الطلب'}</Btn>}
            </div>
          </>
        )}
      </form>
    </section>
  );
}
