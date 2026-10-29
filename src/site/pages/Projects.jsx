import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { AMEN } from '../../lib/format.js';
import { Btn, Chip, Icon, Img, Seg } from '../../components/ui.jsx';
import { CardGrid, Crumbs, LeadModal, PlanBar, ProgressBar, ProjCard } from '../parts.jsx';
import { MapView, esc } from '../../components/MapView.jsx';
import NotFound from './NotFound.jsx';

// Ported from the design reference: pages/projects.js (hub + directory) and pages/project.js (detail).

export const KIND = {
  compound: { icon: 'compound', name: 'مجمعات سكنية', short: 'مجمعات', line: 'حراسة ومدارس وخدمات داخل السياج' },
  tower: { icon: 'tower', name: 'أبراج سكنية', short: 'أبراج', line: 'طوابق وإطلالات وخدمات البناية' },
  villas: { icon: 'villa', name: 'مجمعات فلل', short: 'مجمعات فلل', line: 'قطع وحدائق وشوارع هادئة' },
  mixed: { icon: 'layers', name: 'متعدد الاستخدام وتجاري', short: 'متعدد وتجاري', line: 'سكن ومكاتب ومحلات بمكان واحد' },
};
export const kindIcon = (t) => (KIND[t] || KIND.mixed).icon;
const AMEN_ICON = { pool: 'pool', gym: 'bolt', security: 'shield', parking: 'car', power: 'bolt', garden: 'tree', play: 'sun', mosque: 'star', market: 'bag', school: 'school', clinic: 'plus', concierge: 'users', lifts: 'elevator', cafe: 'fork', retail: 'shop' };

const counts = (p) => ({ s: p.unitList.filter((l) => l.deal === 'sale').length, r: p.unitList.filter((l) => l.deal === 'rent').length });

// VAIRO listing counts under a project card (listCounts in the reference)
const ListCounts = ({ p }) => {
  const c = counts(p);
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
      <span className="tag tag-g"><Icon name="tag" size={12} />للبيع <b className="num">{c.s}</b></span>
      <span className="tag tag-g"><Icon name="key" size={12} />للإيجار <b className="num">{c.r}</b></span>
      <span className="lbl ms-auto">عروض ڤايرو</span>
    </div>
  );
};

const TowerSvg = () => (
  <svg viewBox="0 0 60 120" className="w-[46px] lg:w-[54px] h-auto flex-none lg:absolute lg:end-5 lg:top-5" aria-hidden="true">
    <rect x="12" y="6" width="36" height="110" rx="3" fill="#fff" stroke="#C6C8CC" />
    {Array.from({ length: 13 }, (_, i) => <rect key={i} x="16" y={10 + i * 8} width="28" height="5" rx="1" fill={i === 4 ? '#C8102E' : [1, 6, 9].includes(i) ? '#E2E3E5' : '#DCEFE4'} />)}
  </svg>
);

export function Projects() {
  useDocTitle('مشاريع جديدة');
  const S = useSite();
  const [sp, setSp] = useSearchParams();
  const type = sp.get('type') || '', status = sp.get('status') || '';
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v || sp.get(k) === v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const fid = S.settings.featured_project_id;
  const list = S.projs.filter((p) => (!type || p.type === type) && (!status || p.status === status)).sort((a, b) => (b.id === fid) - (a.id === fid));
  const tot = S.projs.reduce((a, p) => { const c = counts(p); return { s: a.s + c.s, r: a.r + c.r }; }, { s: 0, r: 0 });
  const stats = [[S.projs.length, 'مشاريع'], [S.projs.filter((p) => p.status === 'construction').length, 'قيد الإنشاء'], [tot.s, 'عرض للبيع'], [tot.r, 'عرض للإيجار']];
  const active = [];
  if (type) active.push(['type', KIND[type]?.short || type]);
  if (status) active.push(['status', status === 'ready' ? 'جاهز' : 'قيد الإنشاء']);
  const clear = () => setSp(new URLSearchParams(), { replace: true });

  return (
    <section className="wrap pb-20">
      <div className="pt-6 lg:pt-8">
        <Crumbs items={[['الرئيسية', '/'], ['مشاريع جديدة', '/projects']]} />
        <div className="grid lg:grid-cols-12 gap-6 items-end mt-5">
          <div className="lg:col-span-8">
            <div className="eyebrow mb-3">مشاريع جديدة</div>
            <h1 className="t-h1 text-[32px] sm:text-[44px] lg:text-[52px]">مجمعات وأبراج ومجمعات فلل جديدة، كلها بمكان واحد.</h1>
            <p className="text-[16.5px] text-ink-600 mt-3 max-w-2xl">أبراج ومجمعات وفلل من مطوّرين نعرفهم. نعرض نسبة الإنجاز وموعد التسليم وخطة الدفع بوضوح، ونرتب لك زيارة الموقع.</p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
            {stats.map(([v, l]) => <div key={l} className="rounded-[14px] bg-paper-2 p-3"><div className="text-[20px] sm:text-[22px] font-semibold num leading-none">{v}</div><div className="lbl mt-1 clamp-2">{l}</div></div>)}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(KIND).map(([k, o]) => {
            const ps = S.projs.filter((p) => p.type === k);
            const c = ps.reduce((a, p) => { const x = counts(p); return { s: a.s + x.s, r: a.r + x.r }; }, { s: 0, r: 0 });
            return (
              <Link key={k} to={`/projects?type=${k}`} className="group p-5 rounded-[18px] border hair bg-white hover:border-ink-300 hover:shadow-card transition-all flex flex-col min-h-[190px]">
                <div className="flex items-center justify-between"><span className="mi-ic group-hover:bg-red-50 group-hover:text-red transition-colors"><Icon name={o.icon} size={20} /></span><span className="text-[26px] font-semibold num leading-none">{ps.length}</span></div>
                <span className="font-semibold text-[16px] mt-5">{o.name}</span>
                <span className="text-[13px] text-ink-600 mt-0.5 clamp-2">{o.line}</span>
                <span className="mt-auto pt-3 text-[12.5px] text-ink-500 num">{c.s} للبيع · {c.r} للإيجار</span>
              </Link>
            );
          })}
          <Link to="/tools/tower" className="group col-span-2 lg:col-span-1 p-5 rounded-[18px] panel-s hover:shadow-card transition-all flex lg:flex-col gap-4 min-h-[150px] lg:min-h-[190px] overflow-hidden relative">
            <TowerSvg />
            <span className="flex flex-col lg:mt-auto"><span className="eyebrow no-line">تفاعلي</span><span className="font-semibold text-[16px] mt-1">مستكشف البرج</span><span className="text-[13px] text-ink-600 mt-0.5">اختار الطابق وبعدين الوحدة، على البناية نفسها.</span><span className="link text-[13px] mt-2">افتح<Icon name="arrow" size={14} className="flip-rtl" /></span></span>
          </Link>
        </div>
      </section>

      <section className="mt-14" id="pdir">
        <div className="flex items-end justify-between gap-4 mb-5"><div><div className="eyebrow mb-2">الدليل</div><h2 className="t-h2 text-[24px] sm:text-[30px]">لگّي مشروعك</h2></div></div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-sb -mx-4 px-4 md:mx-0 md:px-0">
            <Chip className="flex-none" on={!type} onClick={() => set('type', '')}>كل المشاريع <span className="opacity-60 num">{S.projs.length}</span></Chip>
            {Object.entries(KIND).map(([k, o]) => <Chip key={k} className="flex-none" on={type === k} onClick={() => set('type', k)}><Icon name={o.icon} size={15} />{o.short} <span className="opacity-60 num">{S.projs.filter((p) => p.type === k).length}</span></Chip>)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Seg value={status} options={[['', 'كل المراحل'], ['construction', 'قيد الإنشاء'], ['ready', 'جاهز']]} onChange={(v) => { if (v !== status) set('status', v); }} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 mb-4 flex-wrap">
          <div className="text-[14px]"><b className="num">{list.length}</b> <span className="text-ink-600">{list.length === 1 ? 'مشروع' : 'مشاريع'}</span></div>
          <div className="flex flex-wrap gap-1.5">
            {active.map(([k, l]) => <Chip key={k} small onClick={() => set(k, '')}>{l}<Icon name="close" size={13} className="opacity-60" /></Chip>)}
            {active.length > 0 && <button type="button" className="text-[13px] font-semibold underline underline-offset-4 px-1" onClick={clear}>امسح الكل</button>}
          </div>
        </div>
        {list.length === 0 ? (
          <div className="panel-s p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-white inline-flex items-center justify-center"><Icon name="search" size={24} className="text-ink-400" /></div>
            <div className="t-h3 text-[20px] mt-4">ماكو مشاريع تطابق هالفلاتر</div>
            <p className="text-ink-600 mt-1">جرّب فلاتر أقل، أو گلّ لڤايرو شنو تحتاج واحنا ندوّرلك.</p>
            <div className="flex justify-center flex-wrap gap-2 mt-5"><Btn kind="line" size="sm" onClick={clear}>امسح الفلاتر</Btn><Link to="/contact" className="btn btn-ink btn-sm"><Icon name="users" size={16} />اسأل مستشار</Link></div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9">
            {list.map((p) => <div key={p.id}><ProjCard p={p} variant="wide" /><ListCounts p={p} /></div>)}
          </div>
        )}
      </section>

      <section className="mt-16">
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/developers" className="group panel p-6 flex flex-col hover:shadow-card transition-shadow">
            <div className="flex -space-x-2 rtl:space-x-reverse">{S.devs.map((d) => <span key={d.id} className="w-10 h-10 rounded-[11px] bg-paper-2 border-2 border-white inline-flex items-center justify-center text-[12px] font-bold tracking-wider" dir="ltr">{d.mono}</span>)}</div>
            <div className="font-semibold text-[17px] mt-5">المطوّرون</div>
            <p className="text-[13.5px] text-ink-600 mt-1">منو يبني شنو: المشاريع والتخصص والسجل.</p>
            <span className="link text-[13.5px] mt-auto pt-4">تصفّح المطوّرين<Icon name="arrow" size={14} className="flip-rtl" /></span>
          </Link>
          <div className="panel-s p-6 flex flex-col">
            <span className="mi-ic !bg-white"><Icon name="users" size={20} /></span>
            <div className="font-semibold text-[17px] mt-5">محتار أي مشروع يناسبك؟</div>
            <p className="text-[13.5px] text-ink-600 mt-1">مستشار ڤايرو يقارن وياك المشاريع: الميزانية والمرحلة والمنطقة وخطط الدفع.</p>
            <div className="mt-auto pt-4 flex flex-wrap gap-2"><Link to="/contact" className="btn btn-ink btn-sm"><Icon name="users" size={16} />اطلب استشارة</Link></div>
          </div>
        </div>
      </section>
    </section>
  );
}

// Schematic elevation for towers (project.js → elevation)
function Elevation({ p }) {
  const H = 300, base = 330, w = 84, x = (360 - w) / 2 + 30;
  const F = Math.max(1, +p.floors || 1), fh = H / F, h = F * fh, y = base - h;
  const built = p.status === 'ready' ? h : h * (p.progress || 0) / 100;
  const yTop = base - F * fh;
  return (
    <svg style={{ direction: 'ltr' }} viewBox="0 0 420 360" className="w-full h-auto max-h-[380px]" role="img" aria-label="واجهة تخطيطية">
      <line x1="10" x2="410" y1={base} y2={base} stroke="#9DA0A7" />
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#fff" stroke="#C6C8CC" strokeDasharray={p.status === 'construction' ? '4 3' : undefined} />
      <rect x={x} y={base - built} width={w} height={built} rx="3" fill="#F4F4F1" stroke="#9DA0A7" />
      {Array.from({ length: F }, (_, k) => (base - (k + 1) * fh >= base - built ? <line key={k} x1={x + 4} x2={x + w - 4} y1={base - (k + 1) * fh} y2={base - (k + 1) * fh} stroke="#E2E3E5" strokeWidth={fh > 6 ? 1 : 0.6} /> : null))}
      <rect x={x} y={base - fh * (p.type === 'mixed' ? 3 : 1)} width={w} height={fh * (p.type === 'mixed' ? 3 : 1)} fill="#E2E3E5" />
      {p.status === 'construction' && <path d={`M${x + w * 0.7} ${base - built} v-34 M${x + w * 0.7 - 20} ${base - built - 34} h46 l-6 6`} stroke="#C8102E" strokeWidth="1.8" fill="none" />}
      <g fontSize="10.5" fill="#767A83" fontFamily="IBM Plex Mono">
        <line x1="388" x2="388" y1={yTop} y2={base} stroke="#C6C8CC" /><path d={`M384 ${yTop} h8 M384 ${base} h8`} stroke="#C6C8CC" />
        <text x="396" y={(yTop + base) / 2} writingMode="tb" textAnchor="middle">{F} F</text>
        <text x="14" y={yTop + 4}>{F} F</text><text x="14" y={base - 4}>G</text>
      </g>
    </svg>
  );
}

const SECS = [['ov', 'نظرة عامة'], ['homes', 'الوحدات'], ['pay', 'الدفع'], ['loc', 'الموقع'], ['dev', 'المطوّر']];
const MILESTONES = [['الرخص والأسس', 0, 12], ['الهيكل', 12, 55], ['الواجهات', 55, 75], ['الخدمات والتشطيب', 75, 92], ['التسليم والملاحظات', 92, 100]];

export function Project() {
  const { id } = useParams();
  const S = useSite();
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const [sec, setSec] = useState('ov');
  const p = S.projById(id);
  useDocTitle(p?.name);
  useEffect(() => {
    const on = () => { let cur = 'ov'; SECS.forEach(([k]) => { const el = document.getElementById('sec-' + k); if (el && el.getBoundingClientRect().top < 170) cur = k; }); setSec(cur); };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!p) return <NotFound what="المشروع" />;

  const jump = (k) => { const el = document.getElementById('sec-' + k); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 136, behavior: 'smooth' }); };
  const dev = S.devs.find((d) => d.id === p.developer_id);
  const area = S.areaById(p.area_id);
  const c = counts(p);
  const cons = p.status === 'construction';
  const tower = p.type === 'tower';
  const facts = [
    ['layers', 'النوع', p.typeAr],
    ['pin', 'المنطقة', p.areaName],
    [cons ? 'crane' : 'key', 'المرحلة', cons ? `قيد الإنشاء · ${p.progress}%` : 'جاهز'],
    ['cal', 'التسليم', p.handover],
    ['tower', 'الطوابق', p.floors ? `${p.floors} طابق` : '—'],
    ['home', 'الوحدات', p.units || '—'],
    ['building', 'المطوّر', p.devName ? <Link className="underline underline-offset-4" to="/developers">{p.devName}</Link> : <span className="text-ink-500">المطوّر يُحدَّد لاحقاً</span>],
    ['tag', 'عروض ڤايرو', `${c.s} بيع · ${c.r} إيجار`],
  ];
  const similar = [...S.projs.filter((x) => x.id !== p.id && x.type === p.type), ...S.projs.filter((x) => x.id !== p.id && x.area_id === p.area_id), ...S.projs.filter((x) => x.id !== p.id)].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 4);
  const payHref = `/tools/payment?price=${p.price_from}&down=${p.plan_down}&months=${p.plan_months || 36}&handover=${p.plan_handover}`;
  const markers = [
    ...S.projs.filter((x) => x.id !== p.id && x.hasPin).map((x) => ({ id: x.id, kind: 'dot', approx: true, lat: x.pos.lat, lng: x.pos.lng, interactive: false })),
    { id: p.id, kind: p.hasPin ? 'pill' : 'dot', approx: !p.hasPin, lat: p.pos.lat, lng: p.pos.lng, html: esc(p.name), interactive: false },
  ];

  return (
    <div className="pb-[150px] lg:pb-20">
      <style>{'.pnav.on{color:#1D1E22;border-color:#C8102E}.pnav:hover{color:#1D1E22}'}</style>
      <div className="wrap pt-5 lg:pt-7">
        <Crumbs items={[['الرئيسية', '/'], ['مشاريع جديدة', '/projects'], [KIND[p.type]?.short || p.typeAr, `/projects?type=${p.type}`], [p.name]]} />
        <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag tag-g"><Icon name={kindIcon(p.type)} size={13} />{p.typeAr}</span>
              {cons ? <span className="tag tag-red"><Icon name="crane" size={13} />قيد الإنشاء · {p.progress}%</span> : <span className="tag tag-ok"><Icon name="key" size={13} />جاهز</span>}
            </div>
            <h1 className="t-h1 text-[34px] sm:text-[46px] mt-3">{p.name}</h1>
            <p className="text-[16px] text-ink-600 mt-1">{p.tagline}{p.tagline ? ' · ' : ''}{p.areaName}</p>
          </div>
          <div className="flex items-center gap-2"><Link to={`/areas/${p.area_id}`} className="chip"><Icon name="pin" size={15} /><span>{p.areaShort}</span></Link></div>
        </div>
        <div className="mt-5"><Img src={p.img} className="h-[260px] sm:h-[340px] md:h-[440px] !rounded-[18px]" label={p.typeAr} alt={p.name} /></div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px bg-line rounded-[18px] border hair overflow-hidden">
          {facts.map(([ic, l, v]) => <div key={l} className="p-4 bg-white"><div className="flex items-center gap-1.5 lbl"><Icon name={ic} size={14} />{l}</div><div className="font-semibold text-[14.5px] mt-1 num">{v}</div></div>)}
        </div>
      </div>

      <nav className="sticky top-[72px] z-30 bg-white/95 backdrop-blur border-y hair mt-8">
        <div className="wrap flex items-center gap-1 overflow-x-auto no-sb h-[54px]">
          {SECS.map(([k, l]) => <button key={k} type="button" className={`pnav h-[54px] px-3 sm:px-4 text-[14px] font-semibold text-ink-500 whitespace-nowrap border-b-2 border-transparent ${sec === k ? 'on' : ''}`} onClick={() => jump(k)}>{l}</button>)}
          <span className="ms-auto hidden lg:flex items-center gap-2 ps-4">
            {p.price_from > 0 && <span className="text-[13px] text-ink-500">من <b className="text-ink num" dir="ltr">{p.fromText}</b></span>}
            <Btn kind="red" size="sm" onClick={() => setModal('visit')}>رتّب زيارة للموقع</Btn>
          </span>
        </div>
      </nav>

      <div className="wrap grid lg:grid-cols-12 gap-10 mt-10">
        <div className="lg:col-span-8 min-w-0 space-y-16">
          <section id="sec-ov" className="scroll-mt-[140px]">
            <div className="eyebrow mb-3">نظرة عامة</div>
            <p className="text-[18px] leading-relaxed text-ink-700">{p.name} {p.typeAr} في {p.areaName}{p.devName ? ` من ${p.devName}` : ''}. {p.tagline ? p.tagline + '. ' : ''}{p.units ? `يضم ${p.units} وحدة` : ''}{p.units && p.floors ? ` على ${p.floors} طابق` : ''}{p.units ? '، مع خدمات متكاملة. ' : ''}فريق ڤايرو زار الموقع وتابع نسبة الإنجاز، والأرقام المعروضة من المطوّر مباشرة.</p>
            {p.amenList.length > 0 && (
              <div className="mt-8">
                <div className="font-semibold text-[17px] mb-3">المرافق والخدمات</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{(p.amenities || []).map((k) => <div key={k} className="flex items-center gap-2.5 p-3 rounded-[12px] bg-paper-2 text-[14px] font-medium"><Icon name={AMEN_ICON[k] || 'check'} size={17} className="text-ink-500" />{AMEN[k] || k}</div>)}</div>
                <p className="lbl mt-2">حسب المعلن عن المشروع، وڤايرو يتأكد وقت المعاينة.</p>
              </div>
            )}
            {cons && (
              <div className="mt-8 panel p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold text-[17px]">نسبة الإنجاز</div><div className="lbl">التسليم المتوقع <span dir="ltr">{p.handover}</span></div></div><span className="text-[34px] font-semibold num leading-none">{p.progress}%</span></div>
                <div className="mt-4"><ProgressBar v={p.progress} /></div>
                <ol className="mt-5 grid sm:grid-cols-5 gap-2">
                  {MILESTONES.map(([l, a, b]) => { const st = p.progress >= b ? 'done' : p.progress > a ? 'now' : 'next'; return <li key={l} className={`rounded-[12px] p-3 ${st === 'now' ? 'bg-red-50' : 'bg-paper-2'}`}><div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full inline-flex items-center justify-center flex-none ${st === 'done' ? 'bg-ink text-white' : st === 'now' ? 'bg-red text-white' : 'bg-white border hair'}`}>{st === 'done' && <Icon name="check" size={12} />}</span><span className={`text-[12px] font-semibold ${st === 'now' ? 'text-red' : 'text-ink-500'}`}>{st === 'done' ? 'منجز' : st === 'now' ? 'جاري' : 'جاي'}</span></div><div className="text-[13px] font-semibold mt-2">{l}</div></li>; })}
                </ol>
              </div>
            )}
            {(tower || p.type === 'mixed') && p.floors > 0 && (
              <div className="mt-8 panel p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><div><div className="font-semibold text-[17px]">واجهة البناية</div><div className="lbl">تخطيطي · المظلل = المنجز لحد هسه</div></div>{tower && <Btn kind="dark" size="sm" onClick={() => nav(`/tools/tower/${p.id}`)}><Icon name="elevator" size={16} />افتح مستكشف البرج</Btn>}</div>
                <div className="grid sm:grid-cols-[1fr_220px] gap-6 items-center">
                  <Elevation p={p} />
                  <ul className="space-y-3 text-[13.5px]">
                    {[['الأرضي والمنصة', p.type === 'mixed' ? 'محلات ومداخل وخدمات' : 'المدخل والخدمات ومدخل المواقف'], ['الطوابق النموذجية', p.units && p.floors ? `تقريباً ${Math.round(p.units / Math.max(1, p.floors - 1))} وحدات بالطابق` : 'شقق سكنية'], ['الطوابق العليا', p.floors > 24 ? 'وحدات أكبر وبنتهاوس' : 'أحسن إطلالة ووحدات أقل']].map(([t, d]) => <li key={t} className="flex gap-3"><span className="w-1.5 rounded-full bg-paper-3 flex-none" /><span><span className="block font-semibold">{t}</span><span className="text-ink-600">{d}</span></span></li>)}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section id="sec-homes" className="scroll-mt-[140px]">
            <div className="eyebrow mb-3">الوحدات بهالمشروع</div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 className="t-h2 text-[26px] sm:text-[32px]">المتوفر عن طريق ڤايرو</h2><p className="text-ink-600 mt-1">{c.s} للبيع · {c.r} للإيجار</p></div>
              {tower && <Btn kind="line" size="sm" onClick={() => nav(`/tools/tower/${p.id}`)}><Icon name="elevator" size={16} />افتح مستكشف البرج</Btn>}
            </div>
            <div className="mt-5">
              {p.unitList.length ? <CardGrid list={p.unitList} min={230} /> : (
                <div className="panel-s p-6 flex flex-wrap items-center gap-4">
                  <span className="mi-ic !bg-white"><Icon name="tag" size={20} /></span>
                  <div className="flex-1 min-w-[220px]"><div className="font-semibold">لا توجد وحدات معروضة حالياً</div><div className="text-[13.5px] text-ink-600">اطلب قائمة الأسعار واسأل ڤايرو عن الوحدات الجاية أو إعادة البيع بهالمشروع.</div></div>
                  <Btn kind="dark" size="sm" onClick={() => setModal('brochure')}>اطلب قائمة الأسعار</Btn>
                </div>
              )}
            </div>
          </section>

          <section id="sec-pay" className="scroll-mt-[140px]">
            <div className="eyebrow mb-3">الدفع</div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div><h2 className="t-h2 text-[26px] sm:text-[32px]">خطط الدفع للمشترين</h2><p className="text-ink-600 mt-1">{cons ? 'قيد الإنشاء: وزّع السعر على فترة البناء.' : 'مشروع جاهز: كاش أو تقسيط لفترة أقصر.'}</p></div>
              <Btn kind="line" size="sm" onClick={() => setModal('brochure')}><Icon name="percent" size={16} />اسأل عن خطط الدفع</Btn>
            </div>
            {p.plan_months > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="panel p-5 flex flex-col ring-1 ring-ink">
                  <div className="flex items-center justify-between gap-2"><div className="font-semibold">خطة المطوّر</div><span className="tag tag-g">{p.monthsText}</span></div>
                  <div className="mt-4"><PlanBar down={p.plan_down} inst={100 - p.plan_down - p.plan_handover} handover={p.plan_handover} h={8} /></div>
                  <dl className="mt-4 space-y-2 text-[13.5px]">
                    <div className="flex justify-between gap-2"><dt className="text-ink-600 flex items-center gap-2"><span className="w-2 h-2 rounded-[2px] bg-red" />الدفعة الأولى</dt><dd className="font-semibold num">{p.downPct}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-ink-600 flex items-center gap-2"><span className="w-2 h-2 rounded-[2px] bg-ink" />أقساط على {p.monthsText}</dt><dd className="font-semibold num">{p.instPct}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-ink-600 flex items-center gap-2"><span className="w-2 h-2 rounded-[2px] bg-paper-3" />عند التسليم</dt><dd className="font-semibold num">{p.handPct}</dd></div>
                  </dl>
                  <Btn kind="line" size="sm" className="mt-5" onClick={() => nav(payHref)}><Icon name="chart" size={15} />افتح بمختبر الدفع</Btn>
                </div>
                <div className="panel-s p-5 flex flex-col"><div className="font-semibold">{p.price_from > 0 ? <>يبدأ من <span className="num" dir="ltr">{p.fromText}</span></> : 'السعر عند الطلب'}</div><p className="text-[13.5px] text-ink-600 mt-1">مثال على أقل سعر معروض. شروط المطوّر الحالية ممكن تختلف، وڤايرو يأكدها قبل أي اتفاق.</p><Btn kind="dark" size="sm" className="mt-auto" onClick={() => setModal('brochure')}><Icon name="doc" size={15} />اطلب الكتيّب وقائمة الأسعار</Btn></div>
              </div>
            ) : (
              <div className="panel-s p-5 flex flex-wrap items-center gap-4"><div className="flex-1 min-w-[220px]"><div className="font-semibold">ماكو خطة دفع منشورة لهالمشروع هسه</div><div className="text-[13.5px] text-ink-600">اسأل ڤايرو عن شروط المطوّر الحالية، أو احسب الأقساط بنفسك.</div></div><Btn kind="line" size="sm" onClick={() => nav(payHref)}><Icon name="chart" size={16} />احسب الأقساط</Btn></div>
            )}
          </section>

          <section id="sec-loc" className="scroll-mt-[140px]">
            <div className="eyebrow mb-3">الموقع</div>
            <h2 className="t-h2 text-[26px] sm:text-[32px]">{p.areaName}</h2>
            {area?.vibe && <p className="text-ink-600 mt-1">{area.vibe}</p>}
            <div className="grid md:grid-cols-[1fr_260px] gap-4 mt-5">
              <div className="relative h-[320px] sm:h-[380px] rounded-[18px] overflow-hidden border hair">
                <MapView height="100%" center={p.pos} zoom={p.hasPin ? 15 : 13} markers={markers} scrollZoom={false}>
                  {!p.hasPin && <span className="absolute bottom-3 start-3 tag tag-w" style={{ zIndex: 900 }}>موقع تقريبي ضمن {p.areaShort}</span>}
                </MapView>
              </div>
              <div className="space-y-3">
                {area && (
                  <div className="panel p-4"><div className="font-semibold text-[14px] mb-2">بالمنطقة</div>
                    {[['ruler', 'متوسط سعر المتر', area.ppmText], ['key', 'متوسط الإيجار', area.rentText], ['tag', 'للبيع', area.saleCount], ['home', 'للإيجار', area.rentCount]].map(([ic, l, v]) => <div key={l} className="flex items-center justify-between py-1.5 text-[13.5px] gap-2"><span className="flex items-center gap-2 text-ink-600"><Icon name={ic} size={15} />{l}</span><b className="num" dir="ltr">{v}</b></div>)}
                  </div>
                )}
                <Link to={`/areas/${p.area_id}`} className="btn btn-line w-full">دليل المنطقة: {p.areaShort}<Icon name="arrow" size={15} className="flip-rtl" /></Link>
              </div>
            </div>
          </section>

          <section id="sec-dev" className="scroll-mt-[140px]">
            <div className="eyebrow mb-3">المطوّر</div>
            {dev ? (
              <Link to="/developers" className="group panel p-5 sm:p-6 flex flex-wrap items-center gap-5 hover:shadow-card transition-shadow">
                <span className="w-16 h-16 rounded-[16px] bg-paper-2 inline-flex items-center justify-center text-[18px] font-bold tracking-wider" dir="ltr">{dev.mono}</span>
                <div className="flex-1 min-w-[200px]"><div className="lbl">المطوّر</div><div className="font-semibold text-[18px] group-hover:text-red transition-colors">{dev.name}</div><div className="text-[13.5px] text-ink-600">{[dev.focus, dev.founded ? `من ${dev.founded}` : null, dev.delivered != null ? `${dev.delivered} مشاريع مسلّمة` : null, `${dev.projCount} على ڤايرو`].filter(Boolean).join(' · ')}</div></div>
                <Icon name="arrow" size={18} className="flip-rtl text-ink-400" />
              </Link>
            ) : (
              <div className="panel-s p-5 sm:p-6 flex flex-wrap items-start gap-4"><span className="w-14 h-14 rounded-[14px] bg-white border hair inline-flex items-center justify-center text-ink-400"><Icon name="building" size={24} /></span><div className="flex-1 min-w-[220px]"><div className="font-semibold text-[17px]">المطوّر يُحدَّد لاحقاً</div><p className="text-[14px] text-ink-600 mt-1">ما نشرنا ملف مطوّر لهالمشروع بعد — اسألنا ونگلّك اللي نعرفه.</p><div className="mt-4 flex flex-wrap gap-2"><Btn kind="line" size="sm" onClick={() => setModal('brochure')}><Icon name="users" size={15} />اسأل عن المطوّر</Btn><Link to="/developers" className="btn btn-ghost btn-sm">كل المطوّرين</Link></div></div></div>
            )}
          </section>
        </div>

        <aside className="hidden lg:block lg:col-span-4">
          <div className="sticky top-[146px] space-y-3">
            <div className="panel p-5 shadow-card">
              <div className="lbl">{p.name} · {p.areaShort}</div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><div className="lbl">شراء من</div><div className="text-[22px] font-semibold num" dir="ltr">{p.price_from > 0 ? p.fromText : '—'}</div></div>
                <div><div className="lbl">الوحدات</div><div className="text-[22px] font-semibold num">{p.units || '—'}</div></div>
              </div>
              <div className="lbl mt-2">{c.s} للبيع · {c.r} للإيجار</div>
              <div className="grid gap-2 mt-5">
                <Btn kind="red" onClick={() => setModal('brochure')}><Icon name="doc" size={17} />اطلب الكتيّب وقائمة الأسعار</Btn>
                <Btn kind="dark" onClick={() => setModal('visit')}><Icon name="cal" size={17} />رتّب زيارة للموقع</Btn>
                <Btn kind="line" onClick={() => nav(payHref)}><Icon name="chart" size={17} />احسب الأقساط</Btn>
                {tower && <Btn kind="soft" size="sm" onClick={() => nav(`/tools/tower/${p.id}`)}><Icon name="elevator" size={15} />الطوابق</Btn>}
              </div>
              <div className="mt-4 text-[12px] text-ink-500 text-center">ڤايرو وسيط معتمد لهذا المشروع</div>
            </div>
            <div className="flex items-start gap-2.5 text-[13px] text-ink-600 px-1"><Icon name="info" size={16} className="text-ink-400 mt-0.5" /><span>الأسعار والتوفّر قابلة للتغيير، وكل التفاصيل يأكدها فريق ڤايرو قبل أي اتفاق.</span></div>
            <div className="panel-s p-4 flex items-center justify-between gap-3">
              <div><div className="lbl">المنطقة</div><div className="font-semibold text-[15px] mt-0.5">{p.areaName}</div></div>
              <Link to={`/areas/${p.area_id}`} className="link text-[13.5px]">دليل المنطقة<Icon name="arrow" size={14} className="flip-rtl" /></Link>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="wrap mt-20">
          <div className="flex items-end justify-between gap-4 mb-6"><h2 className="t-h2 text-[24px] sm:text-[30px]">مشاريع مشابهة</h2><Link to="/projects" className="link text-[14px]">كل المشاريع<Icon name="arrow" size={15} className="flip-rtl" /></Link></div>
          <div className="flex lg:grid lg:grid-cols-4 gap-5 overflow-x-auto no-sb snap-x-m -mx-4 px-4 md:mx-0 md:px-0 pb-2">{similar.map((x) => <div key={x.id} className="w-[78%] sm:w-[44%] lg:w-auto flex-none"><ProjCard p={x} /></div>)}</div>
        </section>
      )}

      <div className="fixed bottom-[60px] inset-x-0 z-40 lg:hidden bg-white backdrop-blur border-t hair px-4 py-2.5 flex items-center gap-2">
        <div className="min-w-0 flex-1"><div className="lbl clamp-1">{p.name}</div><div className="text-[15px] font-semibold num clamp-1" dir="ltr">{p.price_from > 0 ? p.fromText : 'اسأل ڤايرو'}</div></div>
        <Btn kind="line" size="sm" className="!px-3" onClick={() => setModal('brochure')} aria-label="اطلب الكتيّب"><Icon name="doc" size={16} /><span className="hidden sm:inline">الكتيّب</span></Btn>
        <Btn kind="red" size="sm" onClick={() => setModal('visit')}><Icon name="cal" size={16} />رتّب زيارة</Btn>
      </div>

      {modal && (
        <LeadModal title={modal === 'brochure' ? 'اطلب الكتيّب وقائمة الأسعار' : 'رتّب زيارة للموقع'} sub={`${p.name} · ${p.devName}`} kind={modal === 'brochure' ? 'brochure' : 'viewing'}
          listingIds={p.unitList.slice(0, 1).map((l) => l.id)} deal="sale" onClose={() => setModal(null)} buildMessage={() => `المشروع: ${p.name}`}
          submitLabel={modal === 'brochure' ? 'أرسل لي الكتيّب' : 'أرسل الطلب'} done={modal === 'brochure' ? 'راح نرسلك الكتيّب وقائمة الأسعار على واتساب' : 'وصل طلبك — راح نرتب ويّاك موعد الزيارة'} />
      )}
    </div>
  );
}
