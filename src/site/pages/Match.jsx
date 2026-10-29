import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Icon, Img } from '../../components/ui.jsx';
import { Crumbs, DealTag, Facts, LeadModal, Price } from '../parts.jsx';

// /tools/match — ported from the reference pages/match.js: step wizard (progress · option tiles · back/next)
// then ranked results with score rings. The scoring below is the app's own and is untouched.

const GOALS = { buy: 'شراء للسكن', rent: 'إيجار', invest: 'استثمار' };
const WHO = { single: 'أنا وحدي', couple: 'زوجان', family: 'عائلة' };
const PRI = { quiet: 'هدوء', schools: 'مدارس قريبة', center: 'قرب المركز', view: 'إطلالة', installments: 'تقسيط', fresh: 'مشروع جديد' };
const GOAL_OPTS = [['buy', 'tag', 'بيت، أرض أو محل تملكه.'], ['rent', 'key', 'سكن بإيجار شهري وموعد سكن.'], ['invest', 'trend', 'عقار لدخل الإيجار أو للقيمة.']];
const WHO_OPTS = [['single', 'users', 'غرفة أو غرفتين تكفي'], ['couple', 'home', 'غرفتين لثلاث'], ['family', 'compound', 'ثلاث غرف أو أكثر']];
const PRI_ICON = { quiet: 'tree', schools: 'school', center: 'compass', view: 'eye', installments: 'percent', fresh: 'crane' };
const STEPS = [['goal', 'الهدف'], ['who', 'الساكنين'], ['pri', 'الأولويات'], ['budget', 'الميزانية']];

function score(l, a) {
  const dna = l.area.dna || {};
  let s = 50, max = 50;
  const want = a.goal === 'rent' ? 'rent' : 'sale';
  if (l.deal !== want) return -1;
  const budget = a.goal === 'rent' ? a.rentBudget : a.budget;
  if (l.amount > budget * 1.1) return -1;
  s += l.amount <= budget ? 10 : 0; max += 10;
  const beds = l.beds || 0;
  if (a.who === 'family') { s += beds >= 3 ? 12 : beds === 2 ? 4 : 0; s += (dna.family || 0); max += 22; }
  if (a.who === 'couple') { s += beds >= 2 && beds <= 3 ? 12 : 4; max += 12; }
  if (a.who === 'single') { s += beds && beds <= 2 ? 12 : 3; max += 12; }
  if (a.goal === 'invest') { s += (dna.growth || 0) * 1.5; max += 15; }
  for (const p of a.pri) {
    max += 10;
    if (p === 'quiet') s += dna.quiet || 0;
    if (p === 'schools') s += dna.family || 0;
    if (p === 'center') s += dna.convenience || 0;
    if (p === 'view') s += l.view_text ? 10 : 0;
    if (p === 'installments') s += l.isInstall ? 10 : 0;
    if (p === 'fresh') s += l.project && l.condition === 'جديد' ? 10 : l.condition === 'جديد' ? 6 : 0;
  }
  if (['land', 'office', 'shop'].includes(l.type) && a.goal !== 'invest') s -= 20;
  return Math.max(0, Math.min(99, Math.round((s / max) * 100)));
}

const Ring = ({ s, hot, size = 58 }) => {
  const r = (size - 7) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative flex-none" style={{ width: size, height: size }} title="نسبة التطابق">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEEEEB" strokeWidth="5" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={hot ? '#C8102E' : '#1D1E22'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${((c * s) / 100).toFixed(1)} ${c.toFixed(1)}`} /></svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none"><b className="num text-[16px]">{s}</b><span className="text-[9px] text-ink-400 mt-0.5">/100</span></span>
    </div>
  );
};

function Opt({ on, icon, title, sub, n, onClick, multi }) {
  return (
    <button type="button" className={`mt-opt group text-start p-4 sm:p-5 rounded-[18px] border bg-white flex sm:flex-col items-center sm:items-start gap-4 sm:gap-6 transition-all ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="mi-ic mt-ic"><Icon name={icon} size={20} /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-[15.5px]">{title}</span>{sub && <span className="block text-[13px] text-ink-500 mt-0.5">{sub}</span>}</span>
      {n && !multi && <span className="mt-key hidden lg:inline-flex num">{n}</span>}
      <span className="mt-chk"><Icon name="check" size={14} /></span>
    </button>
  );
}

export default function Match() {
  useDocTitle('ڤايرو ماتش');
  const S = useSite();
  const [a, setA] = useState({ goal: 'buy', who: 'family', pri: ['quiet', 'schools'], budget: 250000, rentBudget: 1500 });
  const [done, setDone] = useState(false);
  const [lead, setLead] = useState(false);
  const [step, setStep] = useState(0);
  const togglePri = (k) => setA({ ...a, pri: a.pri.includes(k) ? a.pri.filter((x) => x !== k) : [...a.pri, k] });
  const results = S.live.map((l) => ({ l, s: score(l, a) })).filter((x) => x.s >= 0).sort((x, y) => y.s - x.s).slice(0, 3);
  const isRent = a.goal === 'rent';
  const budget = isRent ? a.rentBudget : a.budget;
  const summary = [GOALS[a.goal], WHO[a.who], `ميزانية حتى ${S.money(budget)}${isRent ? ' شهرياً' : ''}`, ...a.pri.map((p) => PRI[p])].join('، ');
  const last = step === STEPS.length - 1;
  const [min, max] = isRent ? [300, 4000] : [50000, 600000];
  const pctOf = ((budget - min) / (max - min)) * 100;
  const goTo = (i) => { setStep(i); setDone(false); window.scrollTo({ top: 0 }); };
  const next = () => { if (last) { setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' }); } else setStep(step + 1); };

  const css = `
    .mt-opt{position:relative;border-color:#E7E7E3}
    .mt-opt:hover{border-color:#9DA0A7;box-shadow:0 1px 2px rgba(17,18,21,.04),0 8px 24px -12px rgba(17,18,21,.14)}
    .mt-opt.on{border-color:#1D1E22;box-shadow:0 0 0 1px #1D1E22}
    .mt-opt.on .mt-ic{background:#FDF2F4;color:#C8102E}
    .mt-chk{position:absolute;top:10px;inset-inline-end:10px;width:22px;height:22px;border-radius:99px;background:#1D1E22;color:#fff;display:none;align-items:center;justify-content:center}
    .mt-opt.on .mt-chk{display:inline-flex}
    .mt-key{width:22px;height:22px;border-radius:6px;border:1px solid #E7E7E3;font-size:11px;color:#9DA0A7;align-items:center;justify-content:center;flex:none;position:absolute;bottom:10px;inset-inline-end:10px}
    .mt-anim{animation:fadeIn .35s ease}`;

  const stepQ = { goal: ['شنو هدفك؟', 'ڤايرو ماتش يسألك بس اللي يهم هدفك، وبعدين يرتب العقارات بقواعد واضحة قدامك.'], who: ['منو راح يسكن؟', 'عدد الغرف ومساحة السكن تتغير حسب الجواب.'], pri: ['شنو الأهم عندك؟', 'اختار شگد ما تريد، وكل أولوية تضيف نقاط للعقارات اللي تحققها.'], budget: [isRent ? 'شگد ميزانيتك بالشهر؟' : 'شگد ميزانيتك؟', isRent ? 'الإيجار بالشهر. التأمين والرسوم تنعرض بشكل منفصل بكل عقار.' : 'السعر الكلي اللي يريحك. العقارات لحد 10% أعلى تنعرض كتمديد.'] };
  const key = STEPS[step][0];

  const body = () => {
    if (key === 'goal') return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" >{GOAL_OPTS.map(([k, ic, d], i) => <Opt key={k} on={a.goal === k} icon={ic} title={GOALS[k]} sub={d} n={i + 1} onClick={() => setA({ ...a, goal: k })} />)}</div>;
    if (key === 'who') return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{WHO_OPTS.map(([k, ic, d], i) => <Opt key={k} on={a.who === k} icon={ic} title={WHO[k]} sub={d} n={i + 1} onClick={() => setA({ ...a, who: k })} />)}</div>;
    if (key === 'pri') return <><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{Object.entries(PRI).map(([k, t]) => <Opt key={k} multi on={a.pri.includes(k)} icon={PRI_ICON[k]} title={t} onClick={() => togglePri(k)} />)}</div><p className="lbl mt-3">إذا ما اخترت شي = نرتب حسب الميزانية والغرف بس.</p></>;
    return (
      <div className="panel p-5 sm:p-7">
        <div className="flex items-end justify-between gap-3 flex-wrap"><div><div className="lbl">{isRent ? 'الإيجار الشهري لحد' : 'السعر الكلي لحد'}</div><div className="text-[38px] sm:text-[48px] font-semibold num leading-tight" dir="ltr">{S.money(budget)}</div></div>{isRent && <div className="text-end"><div className="lbl">يعادل سنوياً</div><div className="text-[18px] font-semibold num">{S.money(a.rentBudget * 12)}</div></div>}</div>
        {isRent
          ? <input type="range" className="rng mt-4" aria-label="الميزانية" min="300" max="4000" step="50" value={a.rentBudget} style={{ '--p': `${pctOf}%` }} onChange={(e) => setA({ ...a, rentBudget: +e.target.value })} />
          : <input type="range" className="rng mt-4" aria-label="الميزانية" min="50000" max="600000" step="5000" value={a.budget} style={{ '--p': `${pctOf}%` }} onChange={(e) => setA({ ...a, budget: +e.target.value })} />}
        <div className="flex justify-between lbl num" dir="ltr"><span>{S.money(min)}</span><span>{S.money(max)}{isRent ? '/mo' : ''}</span></div>
      </div>
    );
  };

  const reasons = (l) => {
    const good = [], bad = [];
    (l.amount <= budget ? good : bad).push(l.amount <= budget ? 'ضمن الميزانية' : `أعلى من الميزانية بـ ${S.money(l.amount - budget)}`);
    if (a.pri.includes('view')) (l.view_text ? good : bad).push(l.view_text ? 'بإطلالة' : 'بدون إطلالة محددة');
    if (a.pri.includes('installments')) (l.isInstall ? good : bad).push(l.isInstall ? 'بالتقسيط' : 'كاش بس');
    if (a.pri.includes('fresh')) (l.condition === 'جديد' ? good : bad).push(l.condition === 'جديد' ? 'جديد' : l.condition || 'مو جديد');
    if (l.beds) good.push(`${l.beds} غرف نوم`);
    return [good.slice(0, 3), bad.slice(0, 3)];
  };

  return (
    <>
      <style>{css}</style>
      <section className="wrap max-w-[1180px] pt-6 lg:pt-10 pb-36 lg:pb-20">
        {done ? (
          <div className="fade-in">
            <Crumbs items={[['الرئيسية', '/'], ['الأدوات', '/tools'], ['ڤايرو ماتش', '']]} />
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mt-4">
              <div className="max-w-3xl"><div className="eyebrow mb-3">ڤايرو ماتش · {GOALS[a.goal]}</div>
                <h1 className="t-h1 text-[30px] sm:text-[42px]">{results.length ? `${results.length} ${isRent ? 'إيجار مرتّب' : 'عقار مرتّب'} إلك` : 'ماكو تطابق كامل — لحد هسه.'}</h1>
                <p className="text-ink-600 mt-2">{results.length ? `حسب إجاباتك: ${summary}.` : 'ما لگينا عقار مطابق حالياً. جرّب ترفع الميزانية، أو خلّي مستشار يدوّرلك.'}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">{[[0, GOALS[a.goal]], [1, WHO[a.who]], [2, a.pri.length ? a.pri.map((p) => PRI[p]).join('، ') : 'بدون أولويات'], [3, `${S.money(budget)} كحد أعلى`]].map(([i, l]) => <button key={i} type="button" className="chip chip-sm !bg-white" title="غيّر" onClick={() => goTo(i)}>{l}<Icon name="chev-d" size={13} className="text-ink-400" /></button>)}</div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end"><button type="button" className="btn btn-line btn-sm" onClick={() => setDone(false)}><Icon name="sliders" size={16} />عدّل الإجابات</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo(0)}><Icon name="close" size={15} />من جديد</button></div>
            </div>
            {results.length > 0 && <div className="mt-6 panel-s p-3 sm:p-4 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1 min-w-0 text-[13.5px]"><b>تصرّف بنتائجك</b> <span className="text-ink-600">— نرسل نتائجك لمستشار يتواصل ويّاك.</span></div><button type="button" className="btn btn-red btn-sm" onClick={() => setLead(true)}><Icon name="users" size={15} />خلّي مستشار يكمّل ويّاك</button></div>}
            <div className="mt-6">
              {results.length === 0 ? (
                <div className="panel p-8 text-center"><span className="mi-ic mx-auto"><Icon name="search" size={20} /></span><div className="t-h3 text-[20px] mt-4">ماكو شي يطابق كل شروطك</div><p className="text-ink-600 mt-2 max-w-md mx-auto">جرّب توسّع الميزانية أو تغيّر الأولويات، أو خلّي مستشار ڤايرو يدوّرلك.</p><div className="flex flex-wrap justify-center gap-2 mt-6"><button type="button" className="btn btn-line" onClick={() => goTo(3)}>عدّل الميزانية</button><button type="button" className="btn btn-red" onClick={() => setLead(true)}><Icon name="users" size={16} />خلّي ڤايرو يدوّرلي</button></div></div>
              ) : (
                <div className="space-y-4">
                  {results.map(({ l, s }, i) => { const [good, bad] = reasons(l); return (
                    <article key={l.id} className="panel p-3 sm:p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[230px_1fr] gap-4">
                        <Link to={l.href} className="relative block card zoom"><Img src={l.img} className="aspect-[16/10] sm:aspect-[4/3.3]" label={l.typeAr} /><span className="absolute top-3 start-3 inline-flex items-center justify-center min-w-[34px] h-[30px] px-2 rounded-[9px] bg-white text-[13px] font-bold num shadow-soft">#{i + 1}</span><span className="absolute top-3 end-3"><DealTag l={l} /></span></Link>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1"><div className="lbl clamp-1">{l.typeAr} · {l.areaName}{S.showId && <> · <span className="mono">{l.id}</span></>}</div><Link to={l.href} className="block text-[17px] font-semibold leading-snug hover:text-red mt-0.5">{l.title}</Link><div className="mt-1"><Price l={l} /></div></div>
                            <Ring s={s} hot={i === 0} />
                          </div>
                          <div className="mt-2"><Facts l={l} /></div>
                          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-[13px]">
                            <div><div className="font-semibold text-[12.5px] mb-1">ليش يناسبك</div>{good.length ? good.map((t) => <div key={t} className="flex gap-1.5 text-ink-700"><Icon name="check" size={14} className="text-ok mt-0.5" /><span>{t}</span></div>) : <div className="lbl">أقرب خيار متوفر</div>}</div>
                            <div><div className="font-semibold text-[12.5px] mb-1">التنازلات</div>{bad.length ? bad.map((t) => <div key={t} className="flex gap-1.5 text-ink-700"><Icon name="info" size={14} className="text-warn mt-0.5" /><span>{t}</span></div>) : <div className="lbl">ماكو تنازلات حسب أولوياتك</div>}</div>
                          </div>
                          <div className="mt-3 flex items-center gap-3"><span className="text-[12.5px] font-semibold whitespace-nowrap">تطابق {s}%</span><div className="flex-1 h-1.5 rounded-full bg-paper-3 overflow-hidden"><div className={`h-full rounded-full ${i === 0 ? 'bg-red' : 'bg-ink'}`} style={{ width: `${s}%` }} /></div></div>
                          <div className="mt-auto pt-3 flex flex-wrap items-center gap-2"><Link to={l.href} className="btn btn-ink btn-sm">شوف التفاصيل<Icon name="arrow" size={15} className="flip-rtl" /></Link></div>
                        </div>
                      </div>
                    </article>
                  ); })}
                  <div className="panel p-6 sm:p-8 mt-8 flex flex-col md:flex-row md:items-center gap-5"><div className="flex-1"><div className="t-h3 text-[20px]">احچي ويا مستشار ڤايرو</div><p className="text-ink-600 mt-1 text-[14px]">نتأكد من التوفر والأسعار والشروط ويا الملاك، ونلگيلك عقارات بعدها ما منزّلة.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn btn-red" onClick={() => setLead(true)}><Icon name="users" size={16} />خلّي مستشار يكمّل ويّاك</button><Link to={isRent ? '/tools/rent' : '/tools/payment'} className="btn btn-line"><Icon name={isRent ? 'key' : 'chart'} size={16} />{isRent ? 'مختبر الإيجار' : 'مختبر الدفع'}</Link></div></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2"><span className="mi-ic !w-9 !h-9 !bg-red-50 text-red"><Icon name="sparkle" size={18} /></span><span className="font-semibold">ڤايرو ماتش</span><span className="tag tag-g">{GOALS[a.goal]}</span></div>
              <div className="flex items-center gap-2"><span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-paper-2 text-[12.5px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red" /><span className="num">{results.length}</span> نتائج حالياً</span></div>
            </div>
            <ol className="hidden md:flex items-center gap-1 mt-6" aria-label="التقدّم">{STEPS.map(([k, l], i) => <li key={k} className="flex-1 min-w-0"><button type="button" className="w-full text-start group" disabled={i > step} style={i > step ? { opacity: 1, cursor: 'default' } : undefined} onClick={() => setStep(i)}><span className={`block h-1.5 rounded-full ${i <= step ? 'bg-ink' : 'bg-paper-3'} ${i === step ? '!bg-red' : ''} transition-colors`} /><span className={`block mt-2 text-[12.5px] font-semibold ${i === step ? 'text-ink' : i < step ? 'text-ink-600 group-hover:text-ink' : 'text-ink-400'} clamp-1`}>{i < step && <Icon name="check" size={12} className="inline -mt-0.5 me-1" />}{l}</span></button></li>)}</ol>
            <div className="md:hidden mt-5"><div className="flex justify-between text-[12.5px] font-semibold mb-2"><span>{STEPS[step][1]}</span><span className="text-ink-500 num">خطوة {step + 1} من {STEPS.length}</span></div><div className="h-1.5 rounded-full bg-paper-3 overflow-hidden"><div className="h-full bg-red rounded-full transition-all" style={{ width: `${Math.max(6, Math.round(((step + 1) / STEPS.length) * 100))}%` }} /></div></div>
            <div className="mt-8 lg:mt-10 mt-anim" key={step}>
              <h1 className="t-h1 text-[30px] sm:text-[42px] lg:text-[52px]">{stepQ[key][0]}</h1>
              <p className="text-[16px] text-ink-600 mt-3 max-w-2xl">{stepQ[key][1]}</p>
              <div className="mt-7">{body()}</div>
            </div>
            <div className="hidden lg:flex items-center justify-between gap-3 mt-10 pt-6 border-t hair">
              <button type="button" className="btn btn-line" disabled={step === 0} style={step === 0 ? { opacity: 0.4 } : undefined} onClick={() => setStep(step - 1)}><Icon name="chev-l" size={17} className="flip-rtl" />رجوع</button>
              <span className="lbl">4 أسئلة · النتائج تترتّب حسب إجاباتك</span>
              <button type="button" className="btn btn-red btn-lg" onClick={next}>{last ? <><Icon name="sparkle" size={18} />اعرض النتائج</> : <>كمّل<Icon name="arrow" size={17} className="flip-rtl" /></>}</button>
            </div>
            <div className="lg:hidden fixed bottom-[60px] inset-x-0 z-40 bg-white/95 backdrop-blur border-t hair px-4 py-3 flex items-center gap-2">
              <button type="button" className="btn btn-line !px-4" disabled={step === 0} style={step === 0 ? { opacity: 0.4 } : undefined} onClick={() => setStep(step - 1)} aria-label="رجوع"><Icon name="chev-l" size={18} className="flip-rtl" /></button>
              <button type="button" className="btn btn-red flex-1" onClick={next}>{last ? <><Icon name="sparkle" size={17} />اعرض النتائج</> : <>كمّل<Icon name="arrow" size={16} className="flip-rtl" /></>}</button>
            </div>
          </div>
        )}
      </section>
      {lead && <LeadModal title="مستشار ڤايرو" sub="نرسل نتائجك لمستشار يتواصل ويّاك." kind="match" listingIds={results.map((r) => r.l.id)} deal={isRent ? 'rent' : 'sale'} budget={isRent ? a.rentBudget : a.budget} buildMessage={() => `إجابات ماتش: ${summary}`} onClose={() => setLead(false)} />}
    </>
  );
}
