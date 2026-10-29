import { useRef, useState } from 'react';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Field, Icon, useToast } from '../../components/ui.jsx';
import { Crumbs, Dot, stripes, submitLead, waLink } from '../parts.jsx';

// /contact — ported from the reference pages/contact.js: hero → channel cards → message form + office panel.

const SUBJECTS = { 'شراء عقار': 'sale', 'إيجار عقار': 'rent', 'بيع أو تأجير عقاري': null, 'استثمار': null, 'زيارة المكتب': null, 'أخرى': null };
const SUBJECT_ICON = { 'شراء عقار': 'tag', 'إيجار عقار': 'key', 'بيع أو تأجير عقاري': 'home', 'استثمار': 'trend', 'زيارة المكتب': 'pin', 'أخرى': 'info' };
const TIMES = ['صباحاً', 'بعد الظهر', 'مساءً', 'أي وقت'];

function Channel({ icon, title, value, sub, primary, href, onClick, ltr }) {
  const cls = 'text-start group p-5 rounded-[18px] border hair bg-white hover:shadow-card transition-shadow flex flex-col min-h-[170px]';
  const inner = (
    <>
      <span className={`mi-ic ${primary ? '!bg-red-50 text-red' : ''}`}><Icon name={icon} size={20} /></span>
      <span className="font-semibold mt-5">{title}</span>
      <span className="text-[14.5px] num mt-0.5" dir={ltr ? 'ltr' : undefined} style={{ textAlign: 'start' }}>{value}</span>
      <span className="lbl mt-auto pt-2">{sub}</span>
    </>
  );
  return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={cls}>{inner}</a> : <button type="button" className={cls} onClick={onClick}>{inner}</button>;
}

export default function Contact() {
  useDocTitle('تواصل');
  const S = useSite();
  const toast = useToast();
  const formRef = useRef(null);
  const officeRef = useRef(null);
  const [f, setF] = useState({ name: '', phone: '', subject: 'شراء عقار', time: 'بعد الظهر', msg: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const st = S.settings;
  const mapUrl = st.office_map_url || `https://maps.google.com/?q=${encodeURIComponent(st.office_address + ' Erbil')}`;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitLead({ name: f.name, phone: f.phone, kind: 'contact', message: `الموضوع: ${f.subject} · أفضل وقت: ${f.time}${f.msg ? '\n' + f.msg : ''}`, deal: SUBJECTS[f.subject] });
      setDone(true);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <section className="wrap pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['تواصل', '']]} />
        <div className="max-w-3xl mt-5"><div className="eyebrow mb-3">تواصل ويّا ڤايرو</div><h1 className="t-hero text-[38px] sm:text-[54px]">احچي ويا ناس يعرفون <span className="accent">أربيل شارع بشارع.</span></h1><p className="text-[17px] text-ink-600 mt-4">شراء، إيجار، بيع، تأجير أو استثمار، كل رسالة توصل لفريقنا مباشرة. ساعات الدوام: {st.office_hours}.</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
          <Channel icon="wa" title="WhatsApp" value={st.office_whatsapp} sub="الأسرع · الرد خلال دقائق" primary ltr href={waLink(st.office_whatsapp, 'مرحبا ڤايرو')} />
          <Channel icon="phone" title="اتصل بينا" value={st.office_phone} sub={st.office_hours} ltr href={`tel:${String(st.office_phone || '').replace(/[^\d+]/g, '')}`} />
          <Channel icon="pin" title="زورنا بالمكتب" value={st.office_address} sub="احجز موعد · شوف الخريطة جوه" onClick={() => { setF({ ...f, subject: 'زيارة المكتب' }); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
        </div>
      </section>

      <section className="wrap sec !pt-10"><div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7"><div className="panel p-5 sm:p-8" ref={formRef}>
          <h2 className="t-h2 text-[24px] sm:text-[30px]">أو خلّينا نتصل بيك</h2><p className="text-ink-600 mt-1 mb-6">گلّنا شنو تحتاج، ونوصلها للمستشار المناسب.</p>
          {done ? (
            <div className="py-6 sm:py-10 text-center fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#EAF4EE] text-ok inline-flex items-center justify-center"><Icon name="check" size={30} /></div>
              <h3 className="t-h2 text-[28px] mt-5">وصلنا طلبك</h3>
              <p className="text-ink-600 mt-2 max-w-md mx-auto">راح نتصل بيك {f.time === 'أي وقت' ? 'قريباً' : f.time}.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-6"><button type="button" className="btn btn-line" onClick={() => { setDone(false); setF({ ...f, msg: '' }); }}>طلب جديد</button></div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="flabel">بخصوص شنو؟</div>
              <div className="flex flex-wrap gap-2">{Object.keys(SUBJECTS).map((s) => <button key={s} type="button" className="chip" aria-pressed={f.subject === s} onClick={() => setF({ ...f, subject: s })}><Icon name={SUBJECT_ICON[s]} size={15} />{s}</button>)}</div>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <Field label={<>الاسم الكامل <span className="text-red">*</span></>}><input className="field" required minLength={2} maxLength={120} placeholder="اسمك" value={f.name} onChange={set('name')} /></Field>
                <Field label={<>رقم الموبايل <span className="text-red">*</span></>}><input className="field" required dir="ltr" inputMode="tel" pattern="[0-9+ ()-]{7,20}" placeholder="07xx xxx xxxx" style={{ textAlign: 'right' }} value={f.phone} onChange={set('phone')} /></Field>
              </div>
              <div className="mt-5"><div className="flabel">أفضل وقت للاتصال</div><div className="flex flex-wrap gap-2">{TIMES.map((t) => <button key={t} type="button" className="chip" aria-pressed={f.time === t} onClick={() => setF({ ...f, time: t })}><Icon name="clock" size={15} />{t}</button>)}</div></div>
              <div className="mt-5"><Field label={<>الرسالة <span className="lbl font-normal">اختياري</span></>}><textarea className="field" rows={4} placeholder="اكتب شنو تحتاج…" maxLength={1500} value={f.msg} onChange={set('msg')} /></Field></div>
              <button type="submit" className="btn btn-red btn-lg w-full sm:w-auto mt-6" disabled={busy}>{busy ? <><span className="spin" />جاري الإرسال…</> : <><Icon name="arrow" size={17} className="flip-rtl" />أرسل لڤايرو</>}</button>
            </form>
          )}
        </div></div>
        <div className="lg:col-span-5 flex flex-col gap-4" ref={officeRef}>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="relative block h-[260px] sm:h-[320px] rounded-[18px] overflow-hidden border hair" style={{ background: stripes('#ecece9', '#e5e5e1') }} aria-label="افتح الموقع على الخريطة"><Dot size={14} style={{ boxShadow: 'none' }} /><span className="absolute bottom-3 start-3 tag tag-w"><Icon name="map" size={12} />افتح بالخرائط</span></a>
          <div className="panel p-5">
            <div className="font-semibold">مكتب ڤايرو</div><div className="text-[14px] text-ink-600 mt-0.5">{st.office_address}<br />أربيل، إقليم كوردستان</div>
            <div className="mt-4 divide-y divide-line">
              <div className="flex justify-between gap-3 py-2.5 text-[14px]"><span>ساعات الدوام</span><span className="num text-end text-ink-700">{st.office_hours}</span></div>
              <div className="flex justify-between gap-3 py-2.5 text-[14px]"><span>واتساب</span><span className="num text-end text-ink-700" dir="ltr">{st.office_whatsapp}</span></div>
              <div className="flex justify-between gap-3 py-2.5 text-[14px]"><span>الهاتف</span><span className="num text-end text-ink-700" dir="ltr">{st.office_phone}</span></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4"><button type="button" className="btn btn-ink btn-sm" onClick={() => { setF({ ...f, subject: 'زيارة المكتب' }); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><Icon name="cal" size={15} />احجز زيارة</button><a href={mapUrl} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="route" size={15} />الاتجاهات</a></div>
          </div>
        </div>
      </div></section>
    </>
  );
}
