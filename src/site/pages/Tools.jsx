import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Chip } from '../../components/ui.jsx';
import { CardGrid, LeadModal, PageHead } from '../parts.jsx';

const toolCard = { textAlign: 'start', padding: 24, borderRadius: 20, border: '1px solid #e7e7e3', background: '#fff', cursor: 'pointer', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 };

export function Tools() {
  useDocTitle('الأدوات');
  const L = useLayout();
  const nav = useNavigate();
  const items = [['/tools/match', 'ڤايرو ماتش', 'جاوب 4 أسئلة ونرتبلك الأنسب', 'ابدأ'], ['/tools/budget', 'مستكشف الميزانية', 'شنو أگدر أشتري بهالمبلغ؟'], ['/tools/rent', 'مختبر الإيجار', 'قدرتك على الإيجار وتكلفة السكن'], ['/tools/payment', 'مختبر الدفع', 'خطط شراءك بالتقسيط'], ['/compare', 'المقارنة', 'جنب بعض، نفس النوع ويا نفس النوع'], ['/tools/tour', 'الجولة الذكية', 'نظّم يوم المعاينات'], ['/tools/tower', 'مستكشف البرج', 'اختار الطابق والوحدة بالشكل'], ['/tools/atlas', 'أطلس العقار', 'أسعار المتر حسب المنطقة'], ['/guides', 'أدلة المناطق والعقار', 'اعرف السوق قبل ما تقرر', 'قريباً']];
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="قرّر وأنت فاهم" h1Fs={L.h1Fs} sub="أدوات بسيطة تساعدك تفهم السوق وميزانيتك قبل ما تتصل بأي أحد." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12, marginTop: 24 }}>
        {items.map(([to, t, d, go = 'افتح']) => (
          <button key={to} className="h-shadow" style={toolCard} onClick={() => nav(to)}>
            <div><div style={{ fontWeight: 600, fontSize: 18 }}>{t}</div><div style={{ fontSize: 13.5, color: '#767a83', marginTop: 4 }}>{d}</div></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#c8102e' }}>{go} ←</span>
          </button>
        ))}
        <button style={{ ...toolCard, border: 0, background: '#c8102e', color: '#fff' }} onClick={() => nav('/invest')}>
          <div><div style={{ fontWeight: 600, fontSize: 18 }}>ڤايرو للاستثمار</div><div style={{ fontSize: 13.5, opacity: 0.85, marginTop: 4 }}>حاسبة العائد وسيناريوهات واضحة</div></div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>قريباً ←</span>
        </button>
      </div>
    </section>
  );
}

const panel = { border: '1px solid #e7e7e3', borderRadius: 24, padding: 28, marginTop: 24, background: '#f6f6f4' };

export function Budget() {
  useDocTitle('مستكشف الميزانية');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [budget, setBudget] = useState(150000);
  const [mode, setMode] = useState('cash');
  const [area, setArea] = useState('');
  // installments: the budget covers the down payment
  const list = S.live.filter((l) => l.deal === 'sale' && !l.hide_price && (!area || l.area_id === area) && (mode === 'cash' ? l.price <= budget : l.isInstall && (l.price * (l.plan?.down ?? 20)) / 100 <= budget));
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="مستكشف الميزانية" h1Fs={L.h1Fs} />
      <div style={{ ...panel, padding: L.phone ? 20 : 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><div style={{ fontSize: 15, color: '#5a5e68' }}>{mode === 'cash' ? 'شنو تشتري بـ' : 'دفعة أولى حتى'}</div><div style={{ fontSize: 40, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} dir="ltr">{S.money(budget)}</div></div>
        <input type="range" aria-label="الميزانية" min="10000" max="600000" step="5000" value={budget} onChange={(e) => setBudget(+e.target.value)} style={{ width: '100%', marginTop: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#767a83' }} dir="ltr"><span>{S.money(10000)}</span><span>{S.money(600000)}</span></div>
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip on={mode === 'cash'} onClick={() => setMode('cash')}>كاش</Chip>
          <Chip on={mode === 'inst'} onClick={() => setMode('inst')}>دفعة أولى بالتقسيط</Chip>
          <select className="sel" aria-label="المنطقة" value={area} onChange={(e) => setArea(e.target.value)} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid #d8d8d3', background: '#fff', fontSize: 13, outline: 0 }}>
            <option value="">كل أربيل</option>{S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 16px', gap: 12, flexWrap: 'wrap' }}><h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{list.length} عقار ضمن ميزانيتك</h2><Btn h={38} r={10} px={14} fs={13} onClick={() => nav('/tools/payment')}>أو خطط بالتقسيط ←</Btn></div>
      <CardGrid list={list} empty="ما في عقارات ضمن هالميزانية حالياً — جرّب ترفعها أو تختار التقسيط" />
    </section>
  );
}

export function Payment() {
  useDocTitle('مختبر الدفع');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const clamp = (v, a, b, d) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(b, Math.max(a, +v)) : d);
  const [price, setPrice] = useState(clamp(sp.get('price'), 50000, 800000, 214000));
  const [down, setDown] = useState(clamp(sp.get('down'), 5, 60, 20));
  const [months, setMonths] = useState(clamp(sp.get('months'), 6, 72, 36));
  const hand = clamp(sp.get('handover'), 0, 40, 10);
  const monthly = Math.round((price * Math.max(0, 1 - down / 100 - hand / 100)) / months);
  const row = (label, val, input) => <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ fontWeight: 600 }}>{label}</span><span style={{ fontWeight: 700 }} dir="ltr">{val}</span></div>{input}</div>;
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="مختبر الدفع" h1Fs={L.h1Fs} sub="غيّر السعر والدفعة الأولى والمدة، وشوف القسط الشهري مباشرة. الأرقام تقريبية بدون فوائد." />
      <div style={{ display: 'grid', gridTemplateColumns: L.cols2, gap: 24, marginTop: 24, alignItems: 'start' }}>
        <div style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: L.phone ? 20 : 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {row('سعر العقار', S.money(price), <input type="range" aria-label="سعر العقار" min="50000" max="800000" step="1000" value={price} onChange={(e) => setPrice(+e.target.value)} style={{ width: '100%', marginTop: 8 }} />)}
          {row('الدفعة الأولى', `${down}%`, <input type="range" aria-label="الدفعة الأولى" min="5" max="60" step="5" value={down} onChange={(e) => setDown(+e.target.value)} style={{ width: '100%', marginTop: 8 }} />)}
          {row('مدة الأقساط', `${months} شهر`, <input type="range" aria-label="مدة الأقساط" min="6" max="72" step="6" value={months} onChange={(e) => setMonths(+e.target.value)} style={{ width: '100%', marginTop: 8 }} />)}
          <div style={{ fontSize: 12.5, color: '#767a83' }}>يُفترض {hand}% عند التسليم، كما في أغلب مشاريع أربيل.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#1d1e22', color: '#fff', borderRadius: 24, padding: 28 }}><div style={{ fontSize: 13, opacity: 0.7 }}>القسط الشهري</div><div style={{ fontSize: 44, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 4 }} dir="ltr">{S.money(monthly)}</div><div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>لمدة {months} شهر</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 18 }}><div style={{ fontSize: 12.5, color: '#767a83' }}>الدفعة الأولى</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} dir="ltr">{S.money((price * down) / 100)}</div></div>
            <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 18 }}><div style={{ fontSize: 12.5, color: '#767a83' }}>عند التسليم</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} dir="ltr">{S.money((price * hand) / 100)}</div></div>
          </div>
          <Btn kind="red" h={46} fs={14.5} onClick={() => nav('/buy?pay=installments')}>شوف عقارات بالتقسيط ←</Btn>
        </div>
      </div>
    </section>
  );
}

export function RentLab() {
  useDocTitle('مختبر الإيجار');
  const S = useSite();
  const L = useLayout();
  const [b, setB] = useState(1000);
  const list = S.live.filter((l) => l.deal === 'rent' && !l.hide_price && l.rent <= b);
  const box = (k, v, ltr) => <div style={{ background: '#fff', borderRadius: 14, padding: 14 }}><div style={{ fontSize: 12, color: '#767a83' }}>{k}</div><div style={{ fontWeight: 600, fontSize: 17 }} dir={ltr ? 'ltr' : undefined}>{v}</div></div>;
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="مختبر الإيجار" h1Fs={L.h1Fs} />
      <div style={{ ...panel, padding: L.phone ? 20 : 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}><div style={{ fontSize: 15, color: '#5a5e68' }}>ميزانيتك الشهرية</div><div style={{ fontSize: 40, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} dir="ltr">{S.money(b)}</div></div>
        <input type="range" aria-label="الميزانية الشهرية" min="300" max="4000" step="50" value={b} onChange={(e) => setB(+e.target.value)} style={{ width: '100%', marginTop: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 20 }}>
          {box('تأمين (شهر)', S.money(b), true)}{box('عمولة الوسيط', 'نصف شهر')}{box('نقل وتجهيز', '~' + S.money(400), true)}{box('أول دفعة تقريباً', S.money(b * 2.5 + 400), true)}
        </div>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '28px 0 16px' }}>{list.length} عقار للإيجار ضمن ميزانيتك</h2>
      <CardGrid list={list} empty="ما في عقارات إيجار ضمن هالميزانية حالياً" />
    </section>
  );
}

export function Atlas() {
  useDocTitle('أطلس العقار');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const rows = [...S.areas].sort((a, b) => b.ppm - a.ppm);
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="أطلس العقار" h1Fs={L.h1Fs} sub="متوسط سعر المتر للبيع حسب المنطقة، حسب تقديرات فريق ڤايرو." />
      <div style={{ border: '1px solid #e7e7e3', borderRadius: 24, padding: L.phone ? 18 : 28, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((a) => (
          <button key={a.id} onClick={() => nav(a.href)} style={{ display: 'grid', gridTemplateColumns: L.phone ? '84px 1fr 72px' : '130px 1fr 90px', gap: L.phone ? 8 : 14, alignItems: 'center', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'start' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{a.short}</span>
            <span style={{ height: 28, borderRadius: 8, background: '#f6f6f4', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: a.barW, background: '#1d1e22', borderRadius: 8 }} /></span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'end' }} dir="ltr">{a.ppmText}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Guides() {
  useDocTitle('الأدلة');
  const L = useLayout();
  const nav = useNavigate();
  const soon = [['دليل الشراء', 'كيف تشتري عقار بأربيل خطوة بخطوة'], ['دليل التقسيط', 'شنو تسأل المطوّر قبل ما توقّع'], ['أدلة المناطق', 'كل منطقة بالتفصيل: السكن والمدارس والأسعار'], ['دليل المؤجّر', 'عقد الإيجار: شنو لازم يكون مكتوب']];
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="اعرف السوق" title="أدلة المناطق والعقار" h1Fs={L.h1Fs} sub="الأدلة قيد الإعداد وراح تنزل قريباً. لحد ما تجهز، تقدر تستكشف المناطق والأدوات." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12, marginTop: 24 }}>
        {soon.map(([t, d]) => (
          <div key={t} style={{ ...toolCard, cursor: 'default', background: '#f6f6f4', color: '#5a5e68' }}>
            <div><div style={{ fontWeight: 600, fontSize: 18, color: '#1d1e22' }}>{t}</div><div style={{ fontSize: 13.5, color: '#767a83', marginTop: 4 }}>{d}</div></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#767a83', border: '1px solid #d8d8d3', borderRadius: 999, padding: '4px 10px', alignSelf: 'flex-start' }}>قريباً</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
        <Btn kind="dark" onClick={() => nav('/areas')}>استكشف المناطق</Btn>
        <Btn onClick={() => nav('/tools')}>الأدوات</Btn>
        <Btn onClick={() => nav('/contact')}>اسأل فريق ڤايرو</Btn>
      </div>
    </section>
  );
}

export function Invest() {
  useDocTitle('استثمار');
  const L = useLayout();
  const nav = useNavigate();
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="ڤايرو للاستثمار" title="قريباً" h1Fs={L.h1Fs} sub="نشتغل على صفحة الاستثمار: حاسبة العائد وسيناريوهات واضحة بلغة بسيطة. لحد ما تجهز، تقدر تستكشف المناطق والأدوات أو تتواصل ويّا فريق ڤايرو." />
      <div style={{ ...toolCard, cursor: 'default', background: '#f6f6f4', color: '#5a5e68', marginTop: 24, maxWidth: 560 }}>
        <div><div style={{ fontWeight: 600, fontSize: 18, color: '#1d1e22' }}>سيناريوهات، مو وعود.</div><div style={{ fontSize: 13.5, color: '#767a83', marginTop: 4 }}>العائد التقريبي من إيجارات مشابهة في نفس المنطقة، مع المخاطر بوضوح.</div></div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#767a83', border: '1px solid #d8d8d3', borderRadius: 999, padding: '4px 10px', alignSelf: 'flex-start' }}>قريباً</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
        <Btn kind="dark" onClick={() => nav('/areas')}>استكشف المناطق</Btn>
        <Btn onClick={() => nav('/tools')}>الأدوات</Btn>
        <Btn onClick={() => nav('/contact')}>اسأل فريق ڤايرو</Btn>
      </div>
    </section>
  );
}
