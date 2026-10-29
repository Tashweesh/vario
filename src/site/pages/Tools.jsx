import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Icon } from '../../components/ui.jsx';
import { CardGrid, Crumbs, PlanBar, SectionHead } from '../parts.jsx';

// Decision tools, ported from the reference: home.js tools() grid, budget.js, payment.js, rentlab.js,
// guides.js (/guides hub + /atlas) and invest.js (hero only). All calculations are the app's own.

const pct = (v, min, max) => `${((v - min) / (max - min)) * 100}%`;

// Reference range slider (.rng) — the filled track is driven by the --p custom property.
const Range = ({ value, min, max, step, onChange, label, className = '' }) => (
  <input type="range" className={`rng ${className}`} aria-label={label} min={min} max={max} step={step} value={value} style={{ '--p': pct(value, min, max) }} onChange={(e) => onChange(+e.target.value)} />
);

const ToolLink = ({ to, icon, title, sub }) => (
  <Link to={to} className="group flex items-center gap-4 p-4 rounded-[18px] border hair hover:shadow-card transition-shadow bg-white"><span className="mi-ic"><Icon name={icon} size={19} /></span><span className="min-w-0"><span className="block font-semibold group-hover:text-red transition-colors">{title}</span><span className="block lbl">{sub}</span></span><Icon name="arrow" size={16} className="flip-rtl ms-auto text-ink-400" /></Link>
);

export function Tools() {
  useDocTitle('الأدوات');
  const items = [
    ['/tools/match', 'sparkle', 'ڤايرو ماتش', 'جاوب 4 أسئلة ونرتبلك الأنسب', 'ابدأ'],
    ['/tools/budget', 'wallet', 'مستكشف الميزانية', 'شنو أگدر أشتري بهالمبلغ؟', 'افتح'],
    ['/tools/rent', 'key', 'مختبر الإيجار', 'قدرتك على الإيجار وتكلفة السكن', 'احسب'],
    ['/tools/payment', 'chart', 'مختبر الدفع', 'خطط شراءك بالتقسيط', 'خطّط'],
    ['/compare', 'compare', 'المقارنة', 'جنب بعض، نفس النوع ويا نفس النوع', 'قارن'],
    ['/tools/tour', 'route', 'الجولة الذكية', 'نظّم يوم المعاينات', 'نظّم'],
    ['/tools/tower', 'elevator', 'مستكشف البرج', 'اختار الطابق والوحدة بالشكل', 'استكشف'],
    ['/tools/atlas', 'chart', 'أطلس العقار', 'أسعار المتر حسب المنطقة', 'افتح'],
    ['/guides', 'doc', 'أدلة المناطق والعقار', 'اعرف السوق قبل ما تقرر', 'قريباً'],
  ];
  return (
    <>
      <section className="wrap pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['الأدوات', '']]} />
        <div className="max-w-3xl mt-5"><div className="eyebrow mb-3">قرّر وانت مطمّن</div><h1 className="t-hero text-[38px] sm:text-[54px]">أدوات للمشتري <span className="accent">والمستأجر والمستثمر.</span></h1><p className="text-[17px] text-ink-600 mt-4">أدوات بسيطة تساعدك تفهم السوق وميزانيتك قبل ما تتصل بأي أحد.</p></div>
      </section>
      <section className="sec surface mt-10"><div className="wrap">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map(([to, ic, t, s, c]) => (
            <Link key={to} to={to} className="group p-5 rounded-[18px] bg-white border hair hover:shadow-card transition-shadow flex flex-col min-h-[200px]"><span className="mi-ic group-hover:bg-red-50 group-hover:text-red transition-colors"><Icon name={ic} size={20} /></span><span className="font-semibold text-[16px] mt-5">{t}</span><span className="text-[13.5px] text-ink-600 mt-1">{s}</span><span className="mt-auto pt-4 link text-[13.5px]">{c}<Icon name="arrow" size={14} className="flip-rtl" /></span></Link>
          ))}
          <Link to="/invest" className="group p-5 rounded-[18px] bg-ink text-white flex flex-col min-h-[200px]"><span className="mi-ic !bg-red-50 text-red"><Icon name="trend" size={20} /></span><span className="font-semibold text-[16px] mt-5">ڤايرو للاستثمار</span><span className="text-[13.5px] opacity-80 mt-1">حاسبة العائد وسيناريوهات واضحة</span><span className="mt-auto pt-4 text-[13.5px] font-semibold inline-flex items-center gap-1.5">قريباً<Icon name="arrow" size={14} className="flip-rtl" /></span></Link>
        </div>
      </div></section>
    </>
  );
}

export function Budget() {
  useDocTitle('مستكشف الميزانية');
  const S = useSite();
  const nav = useNavigate();
  const [budget, setBudget] = useState(150000);
  const [mode, setMode] = useState('cash');
  const [area, setArea] = useState('');
  // installments: the budget covers the down payment
  const list = S.live.filter((l) => l.deal === 'sale' && !l.hide_price && (!area || l.area_id === area) && (mode === 'cash' ? l.price <= budget : l.isInstall && (l.price * (l.plan?.down ?? 20)) / 100 <= budget));
  return (
    <>
      <section className="border-b hair"><div className="wrap pt-6 lg:pt-8 pb-10 lg:pb-14">
        <div className="flex items-center justify-between gap-3 flex-wrap"><Crumbs items={[['الرئيسية', '/'], ['الأدوات', '/tools'], ['مستكشف الميزانية', '']]} /><Link to="/tools/rent" className="text-[13px] text-ink-600 hover:text-red inline-flex items-center gap-1.5"><Icon name="key" size={15} />تستأجر؟ استخدم مختبر الإيجار<Icon name="arrow" size={14} className="flip-rtl" /></Link></div>
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 items-center mt-7">
          <div>
            <div className="eyebrow mb-3">مستكشف الميزانية · الشراء</div>
            <h1 className="t-hero text-[36px] sm:text-[52px] lg:text-[60px]">{mode === 'cash' ? 'شنو أگدر أشتري بـ ' : 'شنو أگدر أشتري بدفعة أولى '}<span className="accent num" dir="ltr">{S.money(budget)}</span>؟</h1>
            <p className="text-[16.5px] text-ink-600 mt-4 max-w-xl">ادفع كاش أو بالتقسيط، وشوف شنو تشتري كل ميزانية بمناطق أربيل وأنواع العقارات.</p>
            <div className="flex items-center gap-2 mt-5 text-[13px] text-ink-500"><Icon name="info" size={15} /><span>بالتقسيط، الميزانية تمثّل الدفعة الأولى اللي عندك.</span></div>
          </div>
          <div className="panel p-5 sm:p-6 shadow-card">
            <div className="seg w-full grid grid-cols-2"><button type="button" onClick={() => setMode('cash')} aria-pressed={mode === 'cash'}><Icon name="wallet" size={16} />كاش</button><button type="button" onClick={() => setMode('inst')} aria-pressed={mode === 'inst'}><Icon name="percent" size={16} />دفعة أولى بالتقسيط</button></div>
            <div className="mt-5 flex items-baseline justify-between"><span className="text-[13px] font-semibold">{mode === 'cash' ? 'السعر الكلي لحد' : 'الدفعة الأولى اللي عندك'}</span><b className="num text-[22px]" dir="ltr">{S.money(budget)}</b></div>
            <Range className="mt-1" label="الميزانية" min={10000} max={600000} step={5000} value={budget} onChange={setBudget} />
            <div className="flex justify-between lbl num" dir="ltr"><span>{S.money(10000)}</span><span>{S.money(600000)}</span></div>
            <div className="mt-4"><label className="flabel" htmlFor="bd-area">المنطقة</label><select id="bd-area" className="field" value={area} onChange={(e) => setArea(e.target.value)}><option value="">كل أربيل</option>{S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
        </div>
      </div></section>
      <section className="sec !pt-8"><div className="wrap space-y-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[[list.length, 'عقار ضمن الميزانية'], [list.filter((l) => !l.project || l.project.status === 'ready').length, 'جاهز للسكن'], [list.filter((l) => l.isInstall).length, 'بخطط تقسيط'], [new Set(list.map((l) => l.area_id)).size, 'منطقة']].map(([v, l]) => <div key={l} className="p-4 rounded-[16px] bg-white border hair"><div className="text-[24px] font-semibold num">{v}</div><div className="lbl mt-0.5">{l}</div></div>)}
        </div>
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5"><div><h2 className="t-h2 text-[24px] sm:text-[30px]">عقارات مناسبة</h2><p className="text-ink-600 mt-1 text-[14px]"><span className="num">{list.length}</span> لحد {S.money(budget)}{mode === 'inst' ? ' · بخطط تقسيط' : ''}</p></div><button type="button" className="btn btn-line btn-sm" onClick={() => nav('/tools/payment')}><Icon name="chart" size={15} />أو خطط بالتقسيط</button></div>
          <CardGrid list={list} empty="ما في عقارات ضمن هالميزانية حالياً — جرّب ترفعها أو تختار التقسيط" />
        </div>
        <div className="panel p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-5 items-center"><div><div className="eyebrow mb-2">الخطوة الجاية</div><div className="t-h3 text-[22px]">حوّل الميزانية لخطة.</div><p className="text-ink-600 text-[14px] mt-1">شوف جدول تقسيط كامل، أو احچي ويا مستشار ڤايرو.</p></div><div className="flex flex-wrap gap-2"><Link to="/tools/payment" className="btn btn-ink"><Icon name="chart" size={16} />مختبر الدفع</Link><Link to="/contact" className="btn btn-red"><Icon name="users" size={16} />استشارة شراء</Link></div></div>
      </div></section>
    </>
  );
}

export function Payment() {
  useDocTitle('مختبر الدفع');
  const S = useSite();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const clamp = (v, a, b, d) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(b, Math.max(a, +v)) : d);
  const [price, setPrice] = useState(clamp(sp.get('price'), 50000, 800000, 214000));
  const [down, setDown] = useState(clamp(sp.get('down'), 5, 60, 20));
  const [months, setMonths] = useState(clamp(sp.get('months'), 6, 72, 36));
  const hand = clamp(sp.get('handover'), 0, 40, 10);
  const monthly = Math.round((price * Math.max(0, 1 - down / 100 - hand / 100)) / months);
  const downAmt = (price * down) / 100, handAmt = (price * hand) / 100;
  const inst = Math.max(0, 100 - down - hand);
  const [all, setAll] = useState(false);
  const rows = [{ k: 'down', l: 'الدفعة الأولى · عند التوقيع', a: downAmt, m: 0 }, ...Array.from({ length: months }, (_, i) => ({ k: 'inst', l: `القسط ${i + 1} من ${months}`, a: monthly, m: i + 1 })), ...(handAmt > 0 ? [{ k: 'hand', l: 'دفعة التسليم', a: handAmt, m: months }] : [])];
  let cum = 0; rows.forEach((r) => { cum += r.a; r.cum = cum; r.rem = Math.max(0, price - cum); });
  const shown = all ? rows : rows.slice(0, 13);
  const slider = (label, value, fmt, min, max, step, onChange) => (
    <div className="mt-5"><div className="flex items-baseline justify-between gap-3"><span className="flabel !mb-0">{label}</span><span className="text-[14px] font-semibold num" dir="ltr">{fmt}</span></div><Range className="mt-1" label={label} min={min} max={max} step={step} value={value} onChange={onChange} /></div>
  );
  return (
    <section className="wrap pt-4 lg:pt-6 pb-24 lg:pb-16">
      <Crumbs items={[['الرئيسية', '/'], ['شراء', '/buy'], ['مختبر الدفع', '']]} />
      <div className="mt-4 mb-7 max-w-3xl"><div className="eyebrow mb-3">مختبر الدفع من ڤايرو · للشراء</div><h1 className="t-h1 text-[32px] sm:text-[44px]">خطّط شراءك، قسط بقسط.</h1><p className="text-[16px] text-ink-600 mt-3">غيّر السعر والدفعة الأولى والمدة، وشوف القسط الشهري مباشرة. الأرقام تقريبية بدون فوائد.</p></div>
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-[92px]"><div className="panel p-5 sm:p-6">
          <div className="font-semibold">العقار</div>
          <div className="mt-3 p-3 rounded-[14px] bg-paper-2 flex items-center gap-3"><span className="mi-ic !bg-white"><Icon name="wallet" size={20} /></span><div><div className="font-semibold text-[14.5px]">أي عقار — حدّد السعر</div><div className="lbl">السعر والدفعة والمدة من الأسفل</div></div></div>
          {slider('سعر الشراء (دولار)', price, S.money(price), 50000, 800000, 1000, setPrice)}
          {slider('الدفعة الأولى', down, `${down}% · ${S.money(downAmt)}`, 5, 60, 5, setDown)}
          {slider('مدة التقسيط', months, `${months} شهر`, 6, 72, 6, setMonths)}
          <div className="mt-6 pt-5 border-t hair text-[12.5px] text-ink-500">يُفترض {hand}% عند التسليم، كما في أغلب مشاريع أربيل.</div>
        </div></div>
        <div className="lg:col-span-7">
          <div className="panel p-5 sm:p-7 shadow-card">
            <div className="grid sm:grid-cols-[1.25fr_1fr] gap-6 items-center">
              <div>
                <div className="lbl">قسطك الشهري</div><div className="flex items-baseline flex-wrap gap-x-2 mt-1"><span className="text-[40px] sm:text-[46px] font-semibold num leading-none" dir="ltr">{S.money(monthly)}</span><span className="text-ink-500 font-medium">/ شهرياً</span></div><div className="text-[14px] text-ink-600 mt-2 num">× {months} دفعات</div>
                <div className="grid grid-cols-2 gap-3 mt-6">{[['الدفعة الأولى', S.money(downAmt)], ['عند التسليم', S.money(handAmt)], ['مجموع الخطة', S.money(price)], ['مدة الخطة', `${months} شهر`]].map(([l, v]) => <div key={l} className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">{l}</div><div className="font-semibold num text-[15px]">{v}</div></div>)}</div>
              </div>
              <div className="sm:border-s hair sm:ps-6">
                <PlanBar down={down} inst={inst} handover={hand} h={18} />
                <div className="space-y-2.5 mt-5">{[[down, '#C8102E', 'الدفعة الأولى'], [inst, '#1D1E22', 'الأقساط'], [hand, '#D8D8D3', 'التسليم']].filter(([v]) => v > 0).map(([v, col, l]) => <div key={l} className="flex items-center gap-2.5 text-[13.5px]"><span className="w-3 h-3 rounded-[4px] flex-none" style={{ background: col }} /><span className="text-ink-600">{l}</span><span className="font-semibold num ms-auto ps-3">{v}%</span></div>)}</div>
              </div>
            </div>
            <p className="text-[12.5px] text-ink-500 mt-6 pt-5 border-t hair">توضيحي، مو عرض مالي. يفترض ماكو فوائد أو رسوم أو تغيير بالسعر؛ خطط المطوّر لازم ڤايرو يأكدها.</p>
          </div>
          <div className="panel mt-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b hair"><div className="font-semibold">جدول الدفعات</div><span className="lbl num">{rows.length} دفعات</span></div>
            <div className="overflow-x-auto"><table className="tbl sm:min-w-[560px]"><thead><tr><th>#</th><th>الدفعة</th><th className="!text-end">المبلغ</th><th className="!text-end hidden sm:table-cell">المدفوع لحد هسه</th><th className="!text-end">المتبقي</th></tr></thead>
              <tbody>{shown.map((r, i) => <tr key={i} className={r.k !== 'inst' ? 'bg-paper-2/60' : ''}><td className="num text-ink-500">{i + 1}</td><td className={`${r.k !== 'inst' ? 'font-semibold' : ''} min-w-[110px]`}>{r.l}</td><td className="!text-end num font-semibold whitespace-nowrap">{S.money(r.a)}</td><td className="!text-end num text-ink-600 whitespace-nowrap hidden sm:table-cell">{S.money(r.cum)}</td><td className="!text-end num text-ink-600 whitespace-nowrap">{S.money(r.rem)}</td></tr>)}</tbody></table></div>
            {rows.length > 13 && <div className="px-5 sm:px-6 py-3 border-t hair"><button type="button" className="link text-[13.5px]" onClick={() => setAll(!all)}>{all ? 'اعرض أقل' : `اعرض كل الـ ${rows.length} دفعة`}<Icon name="chev-d" size={15} className={all ? 'rotate-180' : ''} /></button></div>}
          </div>
          <div className="panel-s mt-4 p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1"><div className="font-semibold text-[16px]">تريد الأرقام الحقيقية؟</div><div className="text-[13.5px] text-ink-600">ڤايرو يجيب الخطط والخصومات ومواعيد التسليم الحالية من المطوّر أو المالك — ويگلك شنو ينتفاوض عليه.</div></div>
            <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-red" onClick={() => nav('/buy?pay=installments')}><Icon name="percent" size={17} />شوف عقارات بالتقسيط</button></div>
          </div>
        </div>
      </div>
      <div className="mt-10 grid sm:grid-cols-3 gap-3"><ToolLink to="/tools/budget" icon="wallet" title="شنو أگدر أشتري؟" sub="مستكشف الميزانية" /><ToolLink to="/buy?pay=installments" icon="percent" title="عقارات بالتقسيط" sub="عروض بيها خطط منشورة" /><ToolLink to="/tools/rent" icon="key" title="تريد تأجر؟" sub="مختبر الإيجار — تكلفة السكن والسنة" /></div>
    </section>
  );
}

export function RentLab() {
  useDocTitle('مختبر الإيجار');
  const S = useSite();
  const [b, setB] = useState(1000);
  const list = S.live.filter((l) => l.deal === 'rent' && !l.hide_price && l.rent <= b);
  const costs = [['تأمين (شهر)', S.money(b), 'معروف — شهر إيجار واحد'], ['عمولة الوسيط', 'نصف شهر', 'مفترض — نص إيجار شهر'], ['نقل وتجهيز', '~' + S.money(400), 'تقديرك — سيارة نقل وترتيب'], ['أول دفعة تقريباً', S.money(b * 2.5 + 400), 'أول شهر + التأمين + العمولة + النقل']];
  return (
    <>
      <style>{'.rl-hero{background:radial-gradient(1200px 300px at 85% -40%,#FDF2F4,transparent 60%),#fff}'}</style>
      <section className="rl-hero border-b hair"><div className="wrap pt-6 lg:pt-8 pb-8 lg:pb-10">
        <Crumbs items={[['الرئيسية', '/'], ['إيجار', '/rent'], ['مختبر الإيجار', '']]} />
        <div className="grid lg:grid-cols-12 gap-6 items-end mt-4">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full border hair bg-white text-[12.5px] font-semibold"><Icon name="key" size={15} className="text-red" />مختبر الإيجار · قدرتك على الإيجار</div>
            <h1 className="t-h1 text-[34px] sm:text-[48px] mt-4">شنو أگدر أستأجر، وشگد راح يكلفني السكن فعلاً؟</h1>
            <p className="text-[16px] text-ink-600 mt-3 max-w-2xl">حدد ميزانيتك الشهرية وشوف الإيجارات المناسبة، ويا المجموع السنوي وتقدير صريح لتكلفة السكن.</p>
          </div>
        </div>
      </div></section>
      <section className="wrap py-8 lg:py-10">
        <div className="grid lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start">
          <aside>
            <div className="panel p-5">
              <div className="flex items-baseline justify-between gap-2"><span className="flabel !mb-0">ميزانية السكن الشهرية</span><span className="lbl">الإيجار بس</span></div>
              <div className="text-[34px] font-semibold num leading-tight mt-1" dir="ltr">{S.money(b)}<span className="text-[15px] text-ink-500 font-medium"> / شهرياً</span></div>
              <Range className="mt-1" label="الميزانية الشهرية" min={300} max={4000} step={50} value={b} onChange={setB} />
              <div className="flex justify-between lbl num" dir="ltr"><span>{S.money(300)}</span><span>{S.money(4000)}</span></div>
              <div className="lbl mt-1">≈ <span className="num">{S.money(b * 12)}</span> بالسنة</div>
            </div>
            <p className="lbl mt-3 px-1">أداة تخطيط مو عرض. التأمين وشروط الدفع يأكدها ڤايرو ويا المالك.</p>
          </aside>
          <div className="min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">{costs.map(([k, v, n]) => <div key={k} className="p-3 sm:p-4 rounded-[16px] bg-paper-2"><div className="lbl">{k}</div><div className="text-[20px] sm:text-[24px] font-semibold num leading-none mt-1.5" dir="ltr">{v}</div><div className="text-[11.5px] text-ink-500 mt-1.5 leading-snug">{n}</div></div>)}</div>
            <div className="flex items-center justify-between mb-3"><h2 className="t-h2 text-[22px] sm:text-[26px]">{list.length} عقار للإيجار ضمن ميزانيتك</h2><span className="lbl num hidden sm:inline">لحد {S.money(b)} / شهر</span></div>
            <CardGrid list={list} empty="ما في عقارات إيجار ضمن هالميزانية حالياً" />
          </div>
        </div>
      </section>
      <section className="wrap pb-16">
        <div className="grid md:grid-cols-3 gap-3"><ToolLink to="/rent" icon="key" title="تصفّح كل الإيجارات" sub="فلتر حسب النوع والفرش والمنطقة" /><ToolLink to="/sell?mode=rent" icon="home" title="تأجّر عقار؟" sub="اعرضه ويا ڤايرو وإحنا نتابع المستأجرين" /><ToolLink to="/tools/budget" icon="wallet" title="تفكر بالشراء؟" sub="مستكشف الميزانية" /></div>
        <div className="panel p-6 sm:p-8 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-5"><div><div className="t-h3 text-[22px]">تفضّل أحد يحسبها بدالك؟</div><p className="text-ink-600 mt-1">مستشار إيجارات بڤايرو يختارلك سكن يناسب ميزانيتك ويأكد كل تكلفة ويا المالك.</p></div><Link to="/contact" className="btn btn-red flex-none"><Icon name="key" size={17} />اطلب مساعدة بالإيجار</Link></div>
      </section>
    </>
  );
}

export function Atlas() {
  useDocTitle('أطلس العقار');
  const S = useSite();
  const rows = [...S.areas].sort((a, b) => b.ppm - a.ppm);
  const pmax = Math.max(1, ...rows.map((a) => a.ppm)), rmax = Math.max(1, ...rows.map((a) => +a.rent || 0));
  const avgP = Math.round(S.areas.reduce((s, a) => s + (a.ppm || 0), 0) / Math.max(1, S.areas.length));
  const avgR = S.areas.reduce((s, a) => s + (+a.rent || 0), 0) / Math.max(1, S.areas.length);
  const sale = S.live.filter((l) => l.deal === 'sale'), rent = S.live.filter((l) => l.deal === 'rent');
  const tile = (v, l, sub) => <div className="panel p-5"><div className="text-[26px] sm:text-[30px] font-semibold num" dir="ltr">{v}</div><div className="text-[14px] font-medium mt-0.5">{l}</div><div className="lbl mt-1">{sub}</div></div>;
  return (
    <>
      <section className="wrap pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['اكتشف أربيل', '/areas'], ['أطلس العقار', '']]} />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mt-5"><div className="max-w-3xl"><div className="eyebrow mb-3">أطلس العقار من ڤايرو</div><h1 className="t-hero text-[38px] sm:text-[54px]">سوق أربيل <span className="accent">بأرقام بسيطة.</span></h1><p className="text-[16.5px] text-ink-600 mt-4">متوسط سعر المتر للبيع والإيجار حسب المنطقة، حسب تقديرات فريق ڤايرو.</p></div>
          <div className="panel-s p-4 max-w-sm text-[13px] text-ink-600 flex gap-3"><Icon name="info" size={18} className="text-ink-400 mt-0.5" /><span>الأرقام تقديرات لأسعار الطلب، مو صفقات، ومو توقعات.</span></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {tile(S.money(avgP) + '/م²', 'متوسط سعر الطلب', `بـ${S.areas.length} منطقة`)}
          {tile('$' + avgR.toFixed(1), 'متوسط الإيجار للمتر شهرياً', `بـ${S.areas.length} منطقة`)}
          {tile(sale.length, 'عروض للبيع', 'معروضة حالياً على ڤايرو')}
          {tile(rent.length, 'عروض للإيجار', 'معروضة حالياً على ڤايرو')}
        </div>
      </section>
      <section className="wrap sec"><div className="panel p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="t-h2 text-[22px] sm:text-[26px]">وين واقفة كل منطقة</h2><p className="lbl mt-1">سعر المتر للبيع والإيجار الشهري للمتر · اضغط على المنطقة لتفاصيلها</p></div><div className="flex gap-4 text-[12.5px]"><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-ink" />البيع</span><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-red" />الإيجار</span></div></div>
        <div className="mt-5 grid gap-x-3 sm:gap-x-5 text-[13px]" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.3fr)' }}>
          <div className="lbl pb-2">المنطقة</div><div className="lbl pb-2">البيع /م²</div><div className="lbl pb-2">الإيجار /م²/شهر</div>
          {rows.map((a) => (
            <div key={a.id} className="contents">
              <Link to={a.href} className="py-2.5 border-t hair font-semibold hover:text-red clamp-1">{a.short || a.name}</Link>
              <div className="py-2.5 border-t hair"><div className="flex justify-between gap-1"><span className="num font-semibold" dir="ltr">{a.ppmText}</span><span className="text-ink-500 text-[12px] num">{a.saleCount} للبيع</span></div><div className="h-1 rounded-full bg-paper-3 mt-1.5"><div className="h-full rounded-full bg-ink" style={{ width: `${(a.ppm / pmax) * 100}%` }} /></div></div>
              <div className="py-2.5 border-t hair"><div className="flex justify-between gap-1"><span className="num font-semibold" dir="ltr">${Number(a.rent || 0)}</span><span className="text-ink-500 text-[12px] num">{a.rentCount} للإيجار</span></div><div className="h-1 rounded-full bg-paper-3 mt-1.5"><div className="h-full rounded-full bg-red" style={{ width: `${((+a.rent || 0) / rmax) * 100}%` }} /></div></div>
            </div>
          ))}
        </div>
        <div className="panel-s p-5 sm:p-6 mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="text-[13.5px] text-ink-600 max-w-3xl"><b className="text-ink">شلون تقرأ هالأرقام</b> — أسعار الطلب هي اللي يطلبها الملاك والمطوّرين، مو اللي دفعها المشترين. أرقام المناطق تخلط أنواع العقارات، فقارن نفس النوع ويا نفس النوع قبل لا تقرر.</div><Link to="/contact" className="btn btn-ink flex-none"><Icon name="users" size={16} />اسأل عن السوق</Link></div>
      </div></section>
    </>
  );
}

export function Guides() {
  useDocTitle('الأدلة');
  const S = useSite();
  const nav = useNavigate();
  const soon = [['tag', 'للمشترين', 'دليل الشراء', 'كيف تشتري عقار بأربيل خطوة بخطوة'], ['percent', 'للمشترين', 'دليل التقسيط', 'شنو تسأل المطوّر قبل ما توقّع'], ['compass', 'للجميع', 'أدلة المناطق', 'كل منطقة بالتفصيل: السكن والمدارس والأسعار'], ['key', 'للملاك', 'دليل المؤجّر', 'عقد الإيجار: شنو لازم يكون مكتوب']];
  return (
    <>
      <section className="wrap pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['الأدلة', '']]} />
        <div className="max-w-3xl mt-5"><div className="eyebrow mb-3">اعرف السوق</div><h1 className="t-hero text-[38px] sm:text-[54px]">أدلة بلغة بسيطة عن <span className="accent">عقارات أربيل.</span></h1><p className="text-[17px] text-ink-600 mt-4">الأدلة قيد الإعداد وراح تنزل قريباً. لحد ما تجهز، تقدر تستكشف المناطق والأدوات.</p></div>
      </section>
      <section className="wrap mt-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{soon.map(([ic, who, t, d]) => <div key={t} className="panel-s p-5 flex flex-col min-h-[200px]"><span className="mi-ic !bg-white"><Icon name={ic} size={20} /></span><div className="lbl mt-5">{who}</div><div className="font-semibold text-[17px] mt-0.5">{t}</div><p className="text-[13.5px] text-ink-600 mt-1">{d}</p><span className="mt-auto pt-4"><span className="tag tag-g">قريباً</span></span></div>)}</div>
      </section>
      <section className="sec"><div className="wrap">
        <SectionHead kicker="أدلة مناطق أربيل" title="المناطق، بشرح مختصر." link={{ to: '/areas', label: 'مستكشف المناطق' }} size="md" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{S.areas.slice(0, 10).map((a) => <Link key={a.id} to={a.href} className="group p-4 rounded-[16px] border hair hover:shadow-card transition-shadow flex flex-col min-h-[150px]"><span className="font-semibold group-hover:text-red transition-colors">{a.short || a.name}</span><span className="lbl clamp-2 mt-1">{a.vibe}</span><span className="mt-auto pt-3 flex items-center justify-between text-[12.5px]"><span className="num font-semibold" dir="ltr">{a.ppmText}/م²</span><Icon name="arrow" size={14} className="flip-rtl text-ink-400" /></span></Link>)}</div>
      </div></section>
      <section className="surface"><div className="wrap sec"><div className="grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5"><div className="eyebrow mb-3">أطلس العقار</div><h2 className="t-h1 text-[30px] sm:text-[40px]">الأسعار والإيجارات حسب المنطقة.</h2><p className="text-ink-600 mt-3">متوسط سعر المتر للبيع والإيجار بكل منطقة، حسب تقديرات فريق ڤايرو.</p><Link to="/tools/atlas" className="btn btn-ink mt-6"><Icon name="chart" size={16} />افتح الأطلس</Link></div>
        <div className="lg:col-span-7 grid grid-cols-2 gap-3">{[...S.areas].sort((a, b) => b.ppm - a.ppm).slice(0, 4).map((a) => <div key={a.id} className="panel p-4"><div className="flex justify-between items-baseline"><span className="font-semibold text-[14px]">{a.short || a.name}</span><span className="text-[12.5px] text-ink-500 num">{a.total} عرض</span></div><div className="num text-[18px] font-semibold mt-1" dir="ltr">{a.ppmText}/م²</div><div className="h-1.5 rounded-full bg-paper-3 mt-3 overflow-hidden"><div className="h-full rounded-full bg-ink" style={{ width: a.barW }} /></div></div>)}</div>
      </div></div></section>
      <section className="wrap pb-16 lg:pb-24"><div className="panel p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"><div><h2 className="t-h2 text-[26px] sm:text-[32px]">ما لگيت جوابك؟</h2><p className="text-ink-600 mt-2">اسأل فريق ڤايرو مباشرة.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn btn-red" onClick={() => nav('/contact')}><Icon name="users" size={16} />اسأل فريق ڤايرو</button><button type="button" className="btn btn-line" onClick={() => nav('/areas')}>استكشف المناطق</button><button type="button" className="btn btn-line" onClick={() => nav('/tools')}>الأدوات</button></div></div></section>
    </>
  );
}

export function Invest() {
  useDocTitle('استثمار');
  return (
    <section className="wrap py-24 text-center">
      <div className="eyebrow no-line justify-center">ڤايرو للاستثمار</div>
      <h1 className="t-h1 text-[40px] sm:text-[52px] mt-3">قريباً</h1>
      <p className="text-ink-500 mt-2">Coming soon</p>
    </section>
  );
}
