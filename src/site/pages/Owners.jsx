import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Field, Icon, Img, useToast } from '../../components/ui.jsx';
import { Crumbs, submitLead } from '../parts.jsx';

// /sell?mode=sale|rent — ported from the reference pages/sell.js (sale) and pages/listrent.js (rent):
// intro hero → services strip → multi-step form (progress bar · step nav · form panel · summary aside).

const MODES = { sale: 'بيع', rent: 'إيجار', undecided: 'ما قررت بعد' };
const MODE_OPTS = [['sale', 'tag', 'بيع', 'نسعّره ونسوّقه ونفاوض'], ['rent', 'key', 'إيجار', 'ندقق المستأجر ونجهّز العقد'], ['undecided', 'info', 'ما قررت بعد', 'نشرحلك الخيارين بأرقام']];
const TYPES = [['شقة', 'tower', 'ويا البنتهاوس والدوبلكس'], ['بيت', 'home', 'مستقل أو تاون هاوس'], ['فيلا', 'villa', 'بمجمع أو مستقلة'], ['أرض', 'land', 'سكنية، تجارية، استثمارية'], ['تجاري', 'shop', 'مكتب، محل، مخزن، بناية']];
const STEPS = [['العقار', 'نوع العقار ومنطقته'], ['التفاصيل', 'الغرف والسعر'], ['تواصلك', 'اسمك ورقمك']];

const COPY = {
  sale: {
    eyebrow: 'للبائعين', title: ['بيع عقارك — ', 'بسعر تگدر تدافع عنه.'],
    sub: 'شقق وبيوت وفلل وأراضي وعقارات تجارية. ڤايرو يسعّره من عروض مشابهة حقيقية، ويسوّقه، ويعرضه بس للمشترين الجادّين، وينسّق نقل الملكية.',
    secEyebrow: 'شنو تسوّي ڤايرو للبائع', secTitle: 'من أول زيارة لحد نقل الملكية.', formEyebrow: 'سجّل عقارك للبيع',
    services: [['tag', 'نصيحة بالسعر', 'سعر مدعوم بمبيعات وعروض مشابهة.'], ['eye', 'التصوير والعرض', 'صور بضوء النهار ومخطط تقريبي وعرض واضح.'], ['users', 'مشترين جادّين', 'نتأكد من الميزانية قبل أي معاينة.'], ['route', 'نرتب المعاينات', 'إحنا نعرض العقار ونرجعلك بالملاحظات.'], ['doc', 'العرض ونقل الملكية', 'نفاوض وياك وننسّق نقل الملكية.']],
  },
  rent: {
    eyebrow: 'للمؤجّرين', title: ['أجّر عقارك، ', 'والباقي علينا.'],
    sub: 'بيوت وشقق مفروشة ومكاتب ومحلات ومخازن. نحدد الإيجار المناسب، نصوّر، ندقق المستأجرين، ونجهّز العقد والتسليم.',
    secEyebrow: 'شنو تسوّي ڤايرو للمؤجّر', secTitle: 'من التسعير لحد تسليم المفاتيح.', formEyebrow: 'سجّل عقارك للإيجار',
    services: [['tag', 'نصيحة بالسعر', 'إيجار مبني على عقارات مشابهة والطلب الحالي.'], ['eye', 'تصوير احترافي', 'صور بضوء النهار ومخطط تقريبي.'], ['shield', 'تدقيق المستأجر', 'نتأكد من الهوية والشغل والمعرّفين قبل لا تقرر.'], ['doc', 'تجهيز العقد', 'شروط واضحة: الإيجار والتأمين والدفع والمدة.'], ['key', 'التسليم', 'تقرير حالة وقراءة عدادات وتسليم المفاتيح.']],
  },
};

// Option tile (the reference's category / area buttons): 1px ring + paper background when selected.
function OptTile({ on, icon, label, sub, className = '', onClick, style }) {
  return (
    <button type="button" aria-pressed={!!on} onClick={onClick} style={style} className={`text-start p-4 rounded-[16px] border transition-colors flex flex-col ${on ? 'border-ink ring-1 ring-ink bg-paper-2' : 'hair hover:border-ink-300 bg-white'} ${className}`}>
      {icon && <span className={`mi-ic ${on ? '!bg-white text-red' : ''}`}><Icon name={icon} size={20} /></span>}
      <span className={`font-semibold ${icon ? 'mt-auto pt-4' : 'text-[14px] clamp-1'}`}>{label}</span>
      {sub && <span className="lbl clamp-2">{sub}</span>}
    </button>
  );
}

export default function Owners() {
  useDocTitle('بيع / أجّر عقارك');
  const S = useSite();
  const toast = useToast();
  const [sp] = useSearchParams();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ mode: sp.get('mode') === 'rent' ? 'rent' : sp.get('mode') === 'sale' ? 'sale' : 'sale', type: 'شقة', area: '', size: '', beds: '', price: '', notes: '', name: '', phone: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });

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

  const pageMode = sp.get('mode') === 'rent' ? 'rent' : 'sale';
  const C = COPY[pageMode];
  const crumbs = [['الرئيسية', '/'], ['الملاك', '/sell'], [pageMode === 'rent' ? 'أجّر عقارك' : 'بيع عقارك', '']];
  const heroImgs = S.live.filter((l) => l.deal === pageMode && l.img).slice(0, 3).map((l) => l.img);
  const areaName = S.areas.find((a) => a.id === f.area)?.name || '';
  const typeIcon = TYPES.find((t) => t[0] === f.type)?.[1] || 'home';
  const last = step === 3;
  const pct = Math.round(((step - 1) / 2) * 100);
  const priceLabel = f.mode === 'rent' ? 'الإيجار المتوقع شهرياً (دولار)' : 'السعر المتوقع (دولار)';

  if (done) {
    return (
      <section className="wrap pt-10 lg:pt-16 pb-16 lg:pb-24"><div className="max-w-[760px] mx-auto">
        <div className="text-center fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#EAF4EE] text-ok inline-flex items-center justify-center"><Icon name="check" size={30} /></div>
          <h1 className="t-h1 text-[32px] sm:text-[44px] mt-5">وصلنا طلبك</h1>
          <p className="text-ink-600 mt-2">مستشار ڤايرو راح يتصل بيك خلال يوم عمل لترتيب التقييم المجاني.</p>
        </div>
        <div className="panel p-5 mt-8 flex items-center gap-4">
          <span className="w-20 h-16 rounded-[12px] bg-paper-2 inline-flex items-center justify-center flex-none text-ink-400"><Icon name={typeIcon} size={24} /></span>
          <div className="min-w-0 flex-1"><div className="font-semibold">{f.type} · {areaName}</div><div className="lbl">{[MODES[f.mode], f.size && `${f.size} م²`, f.beds && `${f.beds} غرف`, f.price && S.money(+f.price)].filter(Boolean).join(' · ')}</div></div>
        </div>
        <div className="panel-s p-4 mt-6 text-[13.5px] text-ink-600 flex gap-3"><Icon name="info" size={17} className="text-ink-400 mt-0.5" /><span>ماكو حساب تديره. مستشارك يحدّثك مباشرة بالواتساب أو التلفون.</span></div>
        <div className="flex flex-wrap justify-center gap-2 mt-8"><Link to="/guides" className="btn btn-line"><Icon name="doc" size={16} />الأدلة</Link><Link to="/" className="btn btn-ink">الرئيسية<Icon name="arrow" size={16} className="flip-rtl" /></Link></div>
      </div></section>
    );
  }

  const stepBody = () => {
    if (step === 1) return (
      <>
        <h2 className="t-h2 text-[24px] sm:text-[30px]">شنو تريد تسوي؟</h2><p className="text-ink-600 mt-1">اختار الأقرب، وبعدين تضيف التفاصيل.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6">{MODE_OPTS.map(([k, ic, t, d]) => <OptTile key={k} on={f.mode === k} icon={ic} label={t} sub={d} style={{ minHeight: 132 }} onClick={() => set('mode')(k)} />)}</div>
        <div className="flabel mt-8">نوع العقار</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">{TYPES.map(([t, ic, d]) => <OptTile key={t} on={f.type === t} icon={ic} label={t} sub={d} style={{ minHeight: 132 }} onClick={() => set('type')(t)} />)}</div>
        <div className="flabel mt-8">المنطقة <span className="text-red">*</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{S.areas.map((a) => <OptTile key={a.id} on={f.area === a.id} label={a.short || a.name} sub={a.vibe} style={{ padding: '12px 14px', borderRadius: 12 }} onClick={() => set('area')(a.id)} />)}</div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label={<>المساحة <span className="lbl font-normal">اختياري</span></>}><div className="relative"><input className="field pe-14 num" type="number" min="1" inputMode="numeric" placeholder="مثلاً 180" value={f.size} onChange={set('size')} /><span className="absolute end-4 top-1/2 -translate-y-1/2 text-[13px] text-ink-500 pointer-events-none">م²</span></div></Field>
        </div>
      </>
    );
    if (step === 2) return (
      <>
        <h2 className="t-h2 text-[24px] sm:text-[30px]">التفاصيل</h2><p className="text-ink-600 mt-1">التقريبي يكفي، نقيس بالزيارة. اترك أي شي ما تعرفه فارغ.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label={<>غرف النوم <span className="lbl font-normal">اختياري</span></>}><input className="field num" type="number" min="0" inputMode="numeric" placeholder="مثلاً 3" value={f.beds} onChange={set('beds')} /></Field>
          <Field label={<>{priceLabel} <span className="lbl font-normal">اختياري</span></>}><div className="relative" dir="ltr"><span className="absolute start-4 top-1/2 -translate-y-1/2 text-ink-500">$</span><input className="field !ps-8 num" type="number" min="0" inputMode="numeric" placeholder="اختياري" value={f.price} onChange={set('price')} /></div></Field>
        </div>
        <div className="mt-5"><Field label={<>تفاصيل إضافية <span className="lbl font-normal">اختياري</span></>}><textarea className="field" rows={4} placeholder="الطابق، الحالة، سند الملكية، أي شي مهم…" value={f.notes} onChange={set('notes')} maxLength={1200} /></Field></div>
      </>
    );
    return (
      <>
        <h2 className="t-h2 text-[24px] sm:text-[30px]">شلون نتواصل وياك؟</h2><p className="text-ink-600 mt-1">ما تحتاج حساب. مستشارك يتواصل وياك مباشرة.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label={<>الاسم الكامل <span className="text-red">*</span></>}><input className="field" required minLength={2} placeholder="اسمك" value={f.name} onChange={set('name')} /></Field>
          <Field label={<>رقم الموبايل <span className="text-red">*</span></>}><input className="field" required dir="ltr" inputMode="tel" pattern="[0-9+ ()-]{7,20}" style={{ textAlign: 'right' }} placeholder="07xx xxx xxxx" value={f.phone} onChange={set('phone')} /></Field>
        </div>
      </>
    );
  };

  const summaryItems = [['tag', `${MODES[f.mode]} · ${f.type}`], ['pin', areaName], ['area', [f.size && `${f.size} م²`, f.beds && `${f.beds} غرف`].filter(Boolean).join(' · ')], ['wallet', f.price ? S.money(+f.price) : '']].filter(([, v]) => v);

  return (
    <>
      <section className="pt-6 lg:pt-8 pb-10 lg:pb-14"><div className="wrap">
        <Crumbs items={crumbs} />
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center mt-4">
          <div className="lg:col-span-6">
            <div className="eyebrow">{C.eyebrow}</div>
            <h1 className="t-hero text-[38px] sm:text-[52px] lg:text-[60px] mt-3">{C.title[0]}<span className="accent">{C.title[1]}</span></h1>
            <p className="text-[16.5px] text-ink-600 mt-4 max-w-xl">{C.sub}</p>
            <div className="mt-7 flex flex-wrap gap-2"><a href="#sell-start" className="btn btn-red btn-lg"><Icon name={pageMode === 'rent' ? 'key' : 'tag'} size={18} />ابدأ — تقريباً دقيقتين</a><Link to="/contact" className="btn btn-line btn-lg"><Icon name="phone" size={18} />احچي ويانا أول</Link></div>
            <div className="mt-7 flex flex-wrap gap-2 text-[13px] text-ink-600"><span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-ok" />تقييم مجاني</span><span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-ok" />عمولة واضحة من البداية</span><span className="inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-ok" />مستشار واحد يتابعك</span></div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-5 gap-3 h-[300px] sm:h-[420px]">
              <div className="col-span-3 relative rounded-[22px] overflow-hidden"><Img src={heroImgs[0]} className="absolute inset-0 w-full h-full !rounded-none" label={pageMode === 'rent' ? 'للإيجار' : 'للبيع'} /></div>
              <div className="col-span-2 grid gap-3"><div className="relative rounded-[22px] overflow-hidden"><Img src={heroImgs[1]} className="absolute inset-0 w-full h-full !rounded-none" /></div><div className="relative rounded-[22px] overflow-hidden"><Img src={heroImgs[2]} className="absolute inset-0 w-full h-full !rounded-none" /></div></div>
            </div>
          </div>
        </div>
      </div></section>

      <section className="sec surface !py-10 lg:!py-14 mb-10 lg:mb-14"><div className="wrap">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7"><div className="max-w-2xl"><div className="eyebrow mb-3">{C.secEyebrow}</div><h2 className="t-h2 text-[26px] sm:text-[34px]">{C.secTitle}</h2></div><p className="lbl max-w-xs">الأتعاب نتفق عليها كتابياً قبل أي تسويق.</p></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{C.services.map(([ic, t, d], i) => <div key={t} className={`p-4 rounded-[18px] bg-white border hair flex flex-col ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}><span className="lbl num">{String(i + 1).padStart(2, '0')}</span><span className="mi-ic mt-3"><Icon name={ic} size={19} /></span><span className="font-semibold mt-3 text-[14.5px]">{t}</span><span className="text-[13px] text-ink-600 mt-1">{d}</span></div>)}</div>
      </div></section>

      <section className="wrap pt-2 pb-28 lg:pb-24" id="sell-start" style={{ scrollMarginTop: 80 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><div className="eyebrow mb-2">{C.formEyebrow}</div><h2 className="t-h2 text-[28px] sm:text-[36px]">گلّنا عن عقارك</h2></div><div className="lbl">حوالي دقيقتين · مجاناً · بدون التزام</div></div>
        <div className="mt-6"><div className="flex items-center justify-between text-[13px] mb-2"><span className="font-semibold">الخطوة {step} من 3 · <span className="text-ink-600 font-medium">{STEPS[step - 1][0]}</span></span><span className="num text-ink-500">{pct}%</span></div>
          <div className="flex gap-1">{STEPS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i + 1 < step ? 'bg-ink' : i + 1 === step ? 'bg-red' : 'bg-paper-3'}`} />)}</div></div>
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 mt-8">
          <nav className="hidden lg:block lg:col-span-2"><ol className="space-y-1 sticky top-[96px]">{STEPS.map(([l], i) => { const n = i + 1; return <li key={l}><button type="button" disabled={n >= step} onClick={() => setStep(n)} className={`w-full text-start flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13.5px] ${n === step ? 'bg-paper-2 font-semibold' : n < step ? 'text-ink-700 hover:bg-paper-2' : 'text-ink-400'}`} style={n >= step ? { opacity: 1, cursor: 'default' } : undefined}><span className={`w-5 h-5 rounded-full text-[11px] num inline-flex items-center justify-center flex-none ${n < step ? 'bg-ink text-white' : n === step ? 'bg-red text-white' : 'border hair'}`}>{n < step ? <Icon name="check" size={12} /> : n}</span>{l}</button></li>; })}</ol></nav>
          <div className="lg:col-span-7 min-w-0">
            <form id="owner-form" className="panel p-5 sm:p-8" onSubmit={submit}>
              <div className="fade-in" key={step}>{stepBody()}</div>
              <div className="hidden lg:flex items-center justify-between gap-3 mt-10 pt-6 border-t hair">
                <button type="button" className={`btn btn-line ${step > 1 ? '' : 'invisible'}`} onClick={() => setStep(step - 1)}><Icon name="chev-l" size={16} className="flip-rtl" />رجوع</button>
                {last ? <button type="submit" className="btn btn-red btn-lg min-w-[150px]" disabled={busy}>{busy ? <><span className="spin" />جاري الإرسال…</> : <><Icon name="check" size={17} />أرسل الطلب</>}</button> : <button type="button" className="btn btn-ink btn-lg min-w-[150px]" onClick={next}>التالي<Icon name="chev" size={17} className="flip-rtl" /></button>}
              </div>
              <p className="lbl mt-5 lg:mt-4 text-center lg:text-end">طلبك يوصل لفريق الملاك بڤايرو مباشرة.</p>
            </form>
          </div>
          <aside className="lg:col-span-3"><div className="lg:sticky lg:top-[96px]">
            <div className="panel p-5">
              <div className="flex items-center gap-3"><span className="w-14 h-14 rounded-[12px] bg-paper-2 inline-flex items-center justify-center flex-none text-ink-400"><Icon name={typeIcon} size={22} /></span><div className="min-w-0"><div className="lbl">عقارك</div><div className="font-semibold clamp-1">{f.type} · {MODES[f.mode]}</div></div></div>
              {summaryItems.length > 0 && <ul className="mt-4 space-y-2 text-[13.5px]">{summaryItems.map(([ic, v]) => <li key={ic} className="flex items-center gap-2"><Icon name={ic} size={15} className="text-ink-400" /><span className="clamp-1">{v}</span></li>)}</ul>}
            </div>
            <div className="panel-s p-5 mt-3">
              <div className="flex items-center gap-3"><span className="mi-ic"><Icon name="phone" size={19} /></span><div className="min-w-0 text-[13px]"><div className="font-semibold">فريق الملاك بڤايرو</div><div className="lbl">{S.settings.office_hours}</div></div></div>
              <p className="text-[13px] text-ink-600 mt-3">تفضّل تحچي؟ اتصل أو واتساب، ونعبّيها سوية.</p>
              <Link to="/contact" className="btn btn-line btn-sm mt-3 w-full"><Icon name="phone" size={15} />اطلب استشارة</Link>
            </div>
          </div></aside>
        </div>
        <div className="fixed inset-x-0 bottom-[60px] z-50 lg:hidden bg-white/95 backdrop-blur border-t hair"><div className="wrap py-2.5 flex gap-2">
          {step > 1 && <button type="button" className="btn btn-line" onClick={() => setStep(step - 1)}><Icon name="chev-l" size={16} className="flip-rtl" />رجوع</button>}
          {last ? <button type="submit" form="owner-form" className="btn btn-red flex-1" disabled={busy}>{busy ? 'جاري الإرسال…' : 'أرسل الطلب'} <span className="opacity-60 num text-[12.5px]">{step}/3</span></button> : <button type="button" className="btn btn-ink flex-1" onClick={next}>التالي <span className="opacity-60 num text-[12.5px]">{step}/3</span></button>}
        </div></div>
      </section>
    </>
  );
}
