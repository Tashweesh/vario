import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useSite } from './SiteData.jsx';
import { Btn, Field, Icon, Img, Modal, PhoneField, useToast } from '../components/ui.jsx';

// Shared site parts, ported from the design reference (core.js: V.card, V.projCard, V.head, V.crumbs, V.facts …).

const daysSince = (d) => (d ? Math.round((Date.now() - new Date(d).getTime()) / 864e5) : 999);

// Deal tag (sale = ink, rent = red) shown on every card.
export const DealTag = ({ l }) => (l.deal === 'rent'
  ? <span className="deal-rent"><Icon name="key" size={12} />للإيجار</span>
  : <span className="deal-sale"><Icon name="tag" size={12} />للبيع</span>);

// Facts row with icons (beds · baths · size · plot · floor · frontage).
export function Facts({ l, className = '' }) {
  const it = [];
  if (l.type === 'land') { it.push(['plot', `${l.size} م²`]); if (l.land_use) it.push(['tag', l.land_use]); if (l.deal === 'sale' && l.ppm) it.push(['ruler', l.ppm]); }
  else if (l.type === 'office' || l.type === 'shop') { it.push(['area', `${l.size} م²`]); if (l.floor != null) it.push(['layers', l.floor === 0 ? 'أرضي' : `طابق ${l.floor}`]); if (l.use_type) it.push(['briefcase', l.use_type]); if (l.frontage) it.push(['ruler', `واجهة ${l.frontage} م`]); }
  else {
    if (l.beds) it.push(['bed', l.beds]);
    if (l.baths) it.push(['bath', l.baths]);
    it.push(['area', `${l.size} م²`]);
    if (l.plot) it.push(['plot', `${l.plot} م²`]);
    if (l.floor != null && !l.plot) it.push(['layers', l.floor === 0 ? 'أرضي' : `طابق ${l.floor}`]);
  }
  return (
    <div className={`flex items-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-600 ${className}`}>
      {it.map(([i, v], k) => <span key={k} className="inline-flex items-center gap-1.5 num"><Icon name={i} size={15} className="text-ink-400" />{v}</span>)}
    </div>
  );
}

// Price with the rent period (V.priceHTML).
export function Price({ l, size = 'md' }) {
  const big = size === 'lg' ? 'text-[30px] sm:text-[34px]' : size === 'sm' ? 'text-[15px]' : 'text-[18px]';
  return (
    <>
      <span className={`font-semibold num ${big}`} dir="ltr">{l.priceText}</span>
      {l.per && <span className={`text-ink-500 ${size === 'lg' ? 'text-[16px]' : 'text-[13px]'} font-medium`}> {l.per}</span>}
    </>
  );
}

// Save (heart) button — .fav
export function SaveBtn({ id, className = '' }) {
  const S = useSite();
  const on = S.saved.includes(id);
  return (
    <button type="button" className={`fav ${className}`} aria-pressed={on} aria-label={on ? 'إزالة من المحفوظات' : 'حفظ'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); S.toggleSave(id); }}>
      <Icon name="heart" size={17} />
    </button>
  );
}

function Badges({ l }) {
  return (
    <>
      <div className="absolute top-3 start-3 flex flex-wrap gap-1.5" style={{ paddingInlineEnd: 48 }}>
        <DealTag l={l} />
        {daysSince(l.listed_at) <= 3 && <span className="tag tag-w">جديد</span>}
        {l.verified && <span className="tag tag-w"><Icon name="shield" size={12} className="text-ok" />متحقق</span>}
        {l.isInstall && <span className="tag tag-w">تقسيط</span>}
        {l.status === 'reserved' && <span className="tag tag-ink">محجوز</span>}
        {l.status === 'sold' && <span className="tag tag-ink">{l.deal === 'rent' ? 'مؤجّر' : 'مباع'}</span>}
      </div>
      <div className="absolute bottom-3 start-3 flex gap-1.5">
        {l.video_url && <span className="tag tag-w"><Icon name="play2" size={12} />فيديو</span>}
        {l.photoCount > 0 && <span className="tag tag-w num"><Icon name="grid" size={12} />{l.photoCount}</span>}
      </div>
    </>
  );
}

const subOf = (l) => (l.deal === 'rent'
  ? [l.furnishing, l.available].filter(Boolean)
  : [l.project ? (l.project.status === 'construction' ? `قيد الإنشاء · ${l.project.handover}` : 'جاهز') : l.type === 'land' ? null : 'جاهز', l.payLabel && l.payment ? l.payLabel : null, l.condition].filter(Boolean));

// Listing card — variants: grid (default) · list · mini
export function ListingCard({ l, variant = 'grid' }) {
  const S = useSite();
  const rent = l.deal === 'rent';
  const loc = `${l.projName ? l.projName + ' · ' : ''}${l.areaShort || l.areaName}`;
  const sub = subOf(l);

  if (variant === 'mini') {
    return (
      <Link to={l.href} className="card zoom flex gap-3 items-center group" dir="rtl">
        <Img src={l.img} className="w-[88px] h-[72px] flex-none !rounded-[12px]" />
        <div className="min-w-0"><div className="text-[14px] font-semibold clamp-1 card-title">{l.title}</div><div className="lbl clamp-1">{loc}</div><div className="mt-0.5 text-[14px]"><Price l={l} size="sm" /></div></div>
      </Link>
    );
  }
  if (variant === 'list') {
    return (
      <article className="card zoom panel p-3 grid grid-cols-1 sm:grid-cols-[minmax(0,300px)_1fr] gap-4 hover:shadow-card transition-shadow" dir="rtl">
        <Link to={l.href} className="relative block"><Img src={l.img} className="aspect-[4/3] sm:aspect-auto sm:h-full min-h-[190px]" label={l.typeAr} /><Badges l={l} /></Link>
        <div className="flex flex-col py-1 pe-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="lbl">{l.typeAr} · {loc}{S.showId && <> · <span className="mono">{l.id}</span></>}</div><Link to={l.href} className="card-title block mt-1 text-[18px] font-semibold leading-snug transition-colors">{l.title}</Link></div>
            <SaveBtn id={l.id} className="!shadow-none border hair" />
          </div>
          <div className="mt-3"><Facts l={l} /></div>
          {sub.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{sub.map((s, i) => <span key={i} className="tag tag-g">{s}</span>)}</div>}
          <div className="mt-auto pt-4 flex items-end justify-between gap-3 flex-wrap">
            <div><Price l={l} /><div className="lbl mt-0.5">{rent ? (l.deposit ? `التأمين ${S.money(l.deposit)}` : 'التأمين غير محدد') : l.ppm ? `${l.ppm}` : ''}</div></div>
            <Link to={l.href} className="btn btn-ink btn-sm">{rent ? 'اسأل عن التوفر' : 'اطلب معاينة'}</Link>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="card zoom group" dir="rtl">
      <Link to={l.href} className="relative block"><Img src={l.img} className="aspect-[4/3.05]" label={l.typeAr} /><Badges l={l} /></Link>
      <div className="absolute top-3 end-3"><SaveBtn id={l.id} /></div>
      <div className="pt-3 px-0.5">
        <div className="flex items-baseline justify-between gap-2"><div><Price l={l} /></div>{S.showId && <span className="lbl mono">{l.id}</span>}</div>
        <Link to={l.href} className="card-title block text-[15px] font-semibold leading-snug transition-colors clamp-1">{l.title}</Link>
        <div className="lbl clamp-1 mt-0.5"><Icon name="pin" size={13} className="inline -mt-0.5 me-0.5" />{loc}</div>
        <div className="mt-2.5"><Facts l={l} /></div>
        {rent && (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11.5px]">
            {[['التأمين', l.deposit ? S.money(l.deposit) : null], ['الفرش', l.furnishing || null], ['متاح', l.available || null]].map(([k, v]) => (
              <div key={k} className="rounded-[8px] bg-paper-2 px-2 py-1.5 min-w-0"><div className="text-ink-500 clamp-1">{k}</div><div className={`font-semibold num clamp-1 ${v ? '' : 'text-ink-400 !font-medium'}`}>{v || 'اسأل ڤايرو'}</div></div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t hair flex items-center justify-between gap-2 text-[12.5px]"><span className="text-ink-600 clamp-1">{sub.join(' · ') || l.areaName}</span></div>
      </div>
    </article>
  );
}

// Project card — variants: grid (default) · row · wide
export function ProjCard({ p, variant = 'grid' }) {
  const st = p.status === 'construction'
    ? <span className="tag tag-w"><Icon name="crane" size={12} />التسليم {p.handover}</span>
    : <span className="tag tag-w"><Icon name="key" size={12} />جاهز</span>;
  if (variant === 'row') {
    return (
      <Link to={p.href} className="card zoom group grid grid-cols-[88px_1fr_auto] gap-4 items-center py-3" dir="rtl">
        <Img src={p.img} className="w-[88px] h-[68px] !rounded-[12px]" />
        <div className="min-w-0"><div className="font-semibold card-title clamp-1 transition-colors">{p.name}</div><div className="lbl clamp-1">{p.typeAr} · {p.areaShort}</div></div>
        <div className="text-end text-[13px]">{p.price_from > 0 && <div className="font-semibold num" dir="ltr">{p.fromText}+</div>}<div className="lbl">{p.statusLabel}</div></div>
      </Link>
    );
  }
  return (
    <article className="card zoom group" dir="rtl">
      <Link to={p.href} className="relative block"><Img src={p.img} className={variant === 'wide' ? 'aspect-[16/10]' : 'aspect-[4/3]'} label={p.typeAr} /><div className="absolute top-3 start-3 flex flex-wrap gap-1.5">{st}</div></Link>
      <div className="pt-3 px-0.5">
        <div className="lbl">{p.typeAr} · {p.areaShort}</div>
        <Link to={p.href} className="card-title block mt-0.5 text-[17px] font-semibold transition-colors">{p.name}</Link>
        {p.status === 'construction' && <div className="mt-3 flex items-center gap-3"><div className="flex-1"><ProgressBar v={p.progress} /></div><span className="text-[12px] text-ink-500 num">{p.progress}% منجز</span></div>}
        <div className="mt-3 pt-3 border-t hair flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          {p.price_from > 0 && <span><span className="lbl">شراء من</span> <b className="num" dir="ltr">{p.fromText}</b></span>}
          {p.devName && <span className="lbl ms-auto clamp-1">{p.devName}</span>}
        </div>
      </div>
    </article>
  );
}

export const ProgressBar = ({ v }) => <div className="h-1.5 rounded-full bg-paper-3 overflow-hidden"><div className="h-full rounded-full bg-ink" style={{ width: `${v}%` }} /></div>;

// Responsive card grid: 1 → 2 → 3 (→ 4 when `min` < 300) columns.
export function CardGrid({ list, min = 250, variant = 'grid', empty = 'لا توجد عقارات مطابقة حالياً', children }) {
  if (!list.length) return <Empty>{empty}{children}</Empty>;
  if (variant === 'list') return <div className="flex flex-col gap-4">{list.map((l) => <ListingCard key={l.id} l={l} variant="list" />)}</div>;
  return <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${min < 300 ? 'xl:grid-cols-4' : ''} gap-5`}>{list.map((l) => <ListingCard key={l.id} l={l} />)}</div>;
}
export const Empty = ({ children, icon = 'search', title }) => (
  <div className="rounded-[18px] border border-dashed hair p-10 text-center">
    <div className="w-12 h-12 mx-auto rounded-full bg-paper-2 inline-flex items-center justify-center text-ink-400"><Icon name={icon} size={22} /></div>
    {title && <div className="font-semibold mt-3">{title}</div>}
    <div className="text-[14px] text-ink-500 mt-1">{children}</div>
  </div>
);

export function Crumbs({ items }) {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-[13px] text-ink-500">
      {items.map(([t, to], i) => (i < items.length - 1
        ? <span key={i} className="contents"><Link to={to || '/'} className="hover:text-ink">{t}</Link><Icon name="chev" size={13} className="flip-rtl opacity-50" /></span>
        : <span key={i} className="text-ink font-medium">{t}</span>))}
    </nav>
  );
}

// Page title block (eyebrow + h1 + sub).
export function PageHead({ kicker, title, sub, children, className = '', big }) {
  return (
    <div className={className}>
      {kicker && <div className="eyebrow no-line">{kicker}</div>}
      <h1 className={`${big ? 't-hero text-[38px] sm:text-[52px] lg:text-[60px]' : 't-h1 text-[30px] sm:text-[40px]'} ${kicker ? 'mt-3' : ''}`}>{title}</h1>
      {sub && <p className="text-[16px] text-ink-600 mt-3 max-w-2xl">{sub}</p>}
      {children}
    </div>
  );
}

// Section heading (V.head): eyebrow + h2 (+ sub) with an optional action / link on the end.
export function SectionHead({ kicker, title, sub, action, link, center, className = '', size = 'lg' }) {
  const h = size === 'md' ? 't-h2 text-[24px] sm:text-[30px]' : size === 'sm' ? 't-h2 text-[22px] sm:text-[26px]' : 't-h2 text-[28px] sm:text-[36px] lg:text-[42px]';
  return (
    <div className={`flex flex-col ${center ? 'items-center text-center' : 'md:flex-row md:items-end justify-between'} gap-5 mb-8 lg:mb-10 ${className}`}>
      <div className="max-w-2xl">{kicker && <div className="eyebrow mb-3">{kicker}</div>}<h2 className={h}>{title}</h2>{sub && <p className="mt-3 text-[16px] text-ink-600">{sub}</p>}</div>
      {link && <Link to={link.to} className="link text-[14.5px] flex-none">{link.label}<Icon name="arrow" size={16} className="flip-rtl" /></Link>}
      {action}
    </div>
  );
}

export const H2 = ({ children, className = '' }) => <h2 className={`t-h2 text-[22px] sm:text-[26px] mt-9 mb-3 ${className}`}>{children}</h2>;
export const Stat = ({ label, value, children, className = '' }) => (
  <div className={`rounded-[14px] bg-paper-2 p-4 ${className}`}>
    <div className="lbl">{label}</div>
    <div className="font-semibold text-[18px] num mt-0.5">{value}</div>
    {children}
  </div>
);
export const Tag = ({ children, small, className = '' }) => <span className={`chip ${small ? 'chip-sm' : ''} pointer-events-none ${className}`}>{children}</span>;

export function PlanBar({ down, inst, handover, h = 12 }) {
  return (
    <div className="flex rounded-full overflow-hidden gap-0.5" style={{ height: h }}>
      <div style={{ width: down + '%', background: '#c8102e' }} />
      <div style={{ width: inst + '%', background: '#1d1e22' }} />
      <div style={{ width: handover + '%', background: '#d8d8d3' }} />
    </div>
  );
}

export const stripes = (a = '#f6f6f4', b = '#f0f0ed', s = 10) => `repeating-linear-gradient(45deg,${a} 0 ${s}px,${b} ${s}px ${s * 2}px)`;
export const Dot = ({ size = 14, style }) => <span className="pulse-dot" style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(50%,-50%)', width: size, height: size, borderRadius: 999, background: '#c8102e', border: '2px solid #fff', ...style }} />;

export const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '').replace(/^0/, '964')}${text ? '?text=' + encodeURIComponent(text) : ''}`;

// Submits any public form into the CRM (rpc submit_lead).
export async function submitLead({ name, phone, kind, message, listingIds = [], source = 'الموقع', budget = null, deal = null }) {
  const { error } = await supabase.rpc('submit_lead', { p_name: name, p_phone: phone, p_kind: kind, p_message: message || null, p_listing_ids: listingIds, p_source: source, p_budget: budget, p_deal: deal });
  if (error) throw new Error(friendlyError(error));
}

// Modal with name + phone (+ optional extra fields) that creates a CRM lead — the reference's contact sheet.
export function LeadModal({ title, sub, kind, listingIds, listing, deal, budget, extra, buildMessage, submitLabel = 'أرسل لڤايرو', onClose, done = 'وصلنا طلبك، راح نتواصل ويّاك قريباً', icon = 'phone' }) {
  const toast = useToast();
  const S = useSite();
  const [f, setF] = useState({ name: '', phone: '', note: '' });
  const [x, setX] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const msg = [buildMessage ? buildMessage(x) : '', f.note].filter(Boolean).join('\n');
      await submitLead({ name: f.name, phone: f.phone, kind, message: msg, listingIds, deal, budget });
      setSent(true);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const agent = listing && S.showAgent ? listing.agent : null;
  return (
    <Modal title={title} sub={sent ? null : sub} onClose={onClose}>
      {sent ? (
        <div className="py-8 text-center fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-paper-2 text-red inline-flex items-center justify-center"><Icon name="check" size={30} /></div>
          <div className="t-h2 text-[28px] mt-5">وصلنا طلبك</div>
          <p className="text-ink-600 mt-2 max-w-sm mx-auto">{done}</p>
          <Btn kind="dark" className="mt-7" onClick={onClose}>تمام</Btn>
        </div>
      ) : (
        <form onSubmit={submit}>
          {listing && (
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-paper-2 mb-5">
              <Img src={listing.img} className="w-16 h-14 rounded-[10px] flex-none" />
              <div className="min-w-0"><div className="font-semibold text-[14px] clamp-1">{listing.title}</div><div className="lbl clamp-1">{listing.areaShort}{S.showId && <> · <span className="mono">{listing.id}</span></>}</div></div>
              <div className="ms-auto text-[14px] whitespace-nowrap"><Price l={listing} size="sm" /></div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="الاسم الكامل"><input className="field" required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="اسمك" /></Field>
            <Field label="رقم الموبايل"><PhoneField value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} /></Field>
          </div>
          {extra && <div className="mt-4">{extra(x, setX)}</div>}
          <div className="mt-4"><Field label="رسالة (اختياري)"><textarea className="field" rows={3} maxLength={1500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="أي شي تحب نعرفه؟" /></Field></div>
          {agent && (
            <div className="mt-5 flex items-center gap-3 p-3 rounded-[14px] border hair">
              {agent.img ? <Img src={agent.img} className="w-11 h-11 rounded-full flex-none" /> : <span className="w-11 h-11 rounded-full bg-ink text-white inline-flex items-center justify-center font-semibold flex-none">{agent.name?.[0]}</span>}
              <div className="text-[13px] min-w-0"><div className="font-semibold">{agent.name} <span className="lbl">· {agent.title}</span></div><div className="text-ink-500">عادةً يرد خلال نص ساعة</div></div>
            </div>
          )}
          <button type="submit" className="btn btn-red btn-lg w-full mt-5" disabled={busy}>{busy ? <><span className="spin" />دا ينرسل…</> : <><Icon name={icon} size={18} />{submitLabel}</>}</button>
        </form>
      )}
    </Modal>
  );
}

// Viewing-day picker used by booking modals.
export function dayOptions(n = 7) {
  const out = [];
  const d = new Date();
  for (let i = 1; out.length < n; i++) {
    const x = new Date(d.getTime() + i * 864e5);
    if (x.getDay() === 5) continue; // office closed on Friday
    out.push(x);
  }
  return out;
}

// Horizontal day chips (reference's data-pick row) — value/onChange are Date objects.
export function DayPicker({ days, value, onChange }) {
  const W = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  return (
    <div className="flex gap-2 overflow-x-auto no-sb pb-1">
      {days.map((d) => {
        const on = value && d.toDateString() === value.toDateString();
        return <button key={d.toISOString()} type="button" onClick={() => onChange(d)} className={`flex-none w-[64px] py-2.5 rounded-[12px] border hair text-center ${on ? 'bg-ink text-white border-ink' : 'bg-white'}`}><div className="text-[11px] opacity-70">{W[d.getDay()]}</div><div className="text-[17px] font-semibold num">{d.getDate()}</div></button>;
      })}
    </div>
  );
}
