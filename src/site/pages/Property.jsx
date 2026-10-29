import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { dayLabel } from '../../lib/format.js';
import { Btn, Field, Icon, Img, Modal, Spinner, useToast } from '../../components/ui.jsx';
import { CardGrid, Crumbs, DealTag, LeadModal, PlanBar, Price, ProgressBar, dayOptions, waLink } from '../parts.jsx';
import { MapView, directionsUrl } from '../../components/MapView.jsx';
import NotFound from './NotFound.jsx';

// /property/:id — ported from the reference pages/property.js (header · gallery · modules · sticky conversion panel · mobile bar).

const daysSince = (d) => (d ? Math.round((Date.now() - new Date(d).getTime()) / 864e5) : 999);

// Section wrapper (the reference's sec()).
const Sec = ({ id, eyebrow, title, extra, first, children }) => (
  <section id={`dt-${id}`} className={`scroll-mt-[150px] ${first ? '' : 'pt-10 mt-10 border-t hair'}`}>
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5"><div>{eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}<h2 className="t-h2 text-[24px] sm:text-[28px]">{title}</h2></div>{extra}</div>
    {children}
  </section>
);

// Icon fact grid (the reference's factGrid) — pads the last row so the hairline grid stays rectangular.
function FactGrid({ rows }) {
  const n = rows.length;
  const pad = (k, cls) => Array.from({ length: k }, (_, i) => <div key={cls + i} className={`bg-white ${cls}`} />);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line rounded-[18px] overflow-hidden border hair">
      {rows.map(([ic, l, v]) => <div key={l} className="bg-white p-4 min-h-[86px]"><div className="flex items-center gap-1.5 lbl"><Icon name={ic} size={15} className="text-ink-400" />{l}</div><div className="mt-1.5 font-semibold text-[15px] leading-snug num">{v}</div></div>)}
      {pad(n % 2, 'sm:hidden')}{pad((3 - (n % 3)) % 3, 'hidden sm:block')}
    </div>
  );
}

export default function Property() {
  const { id } = useParams();
  const S = useSite();
  const nav = useNavigate();
  const toast = useToast();
  const [extra, setExtra] = useState(undefined); // listing not in the public catalog (e.g. staff previewing a draft)
  const [gallery, setGallery] = useState(null);
  const [booking, setBooking] = useState(false);
  const [cur, setCur] = useState(0);
  const fromCatalog = S.byId(id);
  const l = fromCatalog || extra;
  useDocTitle(l?.title);

  useEffect(() => {
    if (fromCatalog) return;
    setExtra(undefined);
    supabase.from('listings').select('*, listing_media(url, kind, sort)').eq('id', id).maybeSingle()
      .then(({ data }) => setExtra(data ? S.card(data) : null));
  }, [id, fromCatalog, S.card]);

  useEffect(() => {
    const k = 'vairo:viewed:' + id;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* ignore */ }
    supabase.rpc('track_listing_view', { p_id: id }).then(() => {});
  }, [id]);
  useEffect(() => { setCur(0); }, [id]);

  if (l === undefined) return <Spinner pad={140} />;
  if (!l) return <NotFound what="العقار" />;

  const rent = l.deal === 'rent';
  const sold = l.status === 'sold';
  const agent = S.showAgent ? l.agent : null;
  const phone = String(agent?.phone || S.settings.office_phone || '');
  const tel = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const waText = `مرحبا، أريد أستفسر عن العقار ${l.id} — ${l.title}`;
  const wa = waLink(agent?.phone || S.settings.office_whatsapp, waText);
  const imgs = l.imgs.length ? l.imgs : [''];
  const n = imgs.length;
  const show = (i) => setCur((i + n) % n);
  const similar = S.live.filter((x) => x.id !== l.id && x.deal === l.deal).sort((a, b) => (b.area_id === l.area_id) - (a.area_id === l.area_id) || (b.type === l.type) - (a.type === l.type)).slice(0, 3);
  const saved = S.saved.includes(l.id);
  const proj = l.hasProj ? S.projById(l.project.id) : null;
  const area = S.areaById(l.area_id);
  const desc = l.description_ar || `${l.typeAr} في ${l.areaName} بمساحة ${l.size} م².${l.view_text ? ' ' + l.view_text + '.' : ''} ${(l.features || []).slice(0, 3).join('، ')}${l.features?.length ? '.' : ''} العقار موثّق من فريق ڤايرو ميدانياً، والمعلومات المعروضة مأخوذة من المالك ومن زيارة الموقع. تواصل ويّانا لتحديد موعد معاينة أو لطلب خطة الدفع بالتفصيل.`;
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: l.title, url });
      else { await navigator.clipboard.writeText(url); toast('نُسخ رابط العقار'); }
    } catch { /* cancelled */ }
  };
  const compare = () => { if (!saved) S.toggleSave(l.id); nav('/compare'); };
  const facts = [
    ['area', 'المساحة', `${l.size} م²`],
    l.beds != null && ['bed', 'غرف النوم', l.beds],
    l.baths != null && ['bath', 'الحمامات', l.baths],
    l.floor != null && l.type !== 'land' && ['layers', 'الطابق', l.total_floors ? `${l.floor} / ${l.total_floors}` : l.floor],
    l.plot && ['plot', 'القطعة', `${l.plot} م²`],
    l.frontage && ['ruler', 'الواجهة', `${l.frontage} م`],
    l.condition && ['star', 'الحالة', l.condition],
    l.deal === 'sale' ? l.payLabel && ['wallet', 'الدفع', l.payLabel] : l.furnishing && ['sofa', 'الفرش', l.furnishing],
    l.deal === 'rent' && l.deposit && ['lock', 'التأمين', S.money(l.deposit)],
    l.deal === 'rent' && l.available && ['key', 'التوفر', l.available],
    l.land_use && ['tag', 'الاستخدام', l.land_use],
  ].filter(Boolean).slice(0, 8);
  const amen = [...(l.features || []).map((t) => ['check', t]), l.view_text && ['eye', l.view_text]].filter(Boolean);
  const statusLine = rent
    ? [l.deposit ? `التأمين ${S.money(l.deposit)}` : 'التأمين غير محدد', l.available].filter(Boolean).join(' · ')
    : [l.ppm, l.project ? (l.project.status === 'construction' ? `قيد الإنشاء · التسليم ${l.project.handover}` : 'جاهز') : l.type === 'land' ? null : 'جاهز'].filter(Boolean).join(' · ');

  const priceHead = (
    <>
      <div className="flex items-baseline flex-wrap gap-x-2 leading-none"><Price l={l} size="lg" /></div>
      {statusLine && <div className="lbl mt-1.5 num">{statusLine}</div>}
      {l.status === 'reserved' && <div className="mt-3 inline-flex items-start gap-1.5 px-3 py-1.5 rounded-[10px] bg-paper-2 text-[12.5px] text-ink-700"><Icon name="clock" size={14} className="text-red mt-[2px]" /><span><b className="font-semibold">محجوز</b> — تگدر تطلب تنضاف لقائمة الانتظار</span></div>}
    </>
  );
  const consultant = (compact) => (
    <div className="flex items-center gap-3">
      {agent?.img ? <Img src={agent.img} className={`${compact ? 'w-11 h-11' : 'w-14 h-14'} rounded-full flex-none`} /> : <TeamMark size={compact ? 44 : 56} />}
      <div className="min-w-0 flex-1"><div className="font-semibold text-[14.5px] clamp-1">{agent ? agent.name : 'فريق ڤايرو'}</div><div className="lbl clamp-1">{agent ? `${agent.title} · ڤايرو` : S.settings.office_hours}</div></div>
    </div>
  );
  const ctas = (
    <>
      <Btn kind="red" className="w-full" onClick={() => setBooking(true)} disabled={sold}><Icon name="cal" size={17} />احجز معاينة</Btn>
      <div className="grid grid-cols-2 gap-2">
        <a href={tel} className="btn btn-line btn-sm"><Icon name="phone" size={16} /><span dir="ltr" className="num">{phone}</span></a>
        <a href={wa} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="wa" size={16} />WhatsApp</a>
      </div>
    </>
  );

  return (
    <>
      <style>{`.dt-save[aria-pressed='true'] svg{fill:var(--red);color:var(--red)}`}</style>
      <div className="wrap pt-4 lg:pt-6 pb-[150px] lg:pb-16">
        <Crumbs items={[['الرئيسية', '/'], [l.dealLabel, rent ? '/rent' : '/buy'], [l.areaName, `/areas/${l.area_id}`], [l.id]]} />
        {l.status === 'draft' && (
          <div className="panel p-4 sm:p-5 mt-3 bg-paper-2 flex items-center gap-3" role="status">
            <span className="w-11 h-11 rounded-full bg-white inline-flex items-center justify-center flex-none text-warn"><Icon name="eye" size={22} /></span>
            <div className="min-w-0"><div className="font-semibold">معاينة داخلية</div><p className="text-ink-600 text-[13.5px] mt-0.5">هذا العقار مسودة ولا يظهر للزوار</p></div>
          </div>
        )}

        {/* header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-3 mb-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="tag tag-g">{l.typeAr}</span>
              {l.verified && <span className="tag tag-ok"><Icon name="shield" size={12} />متحقق منه من ڤايرو</span>}
              {l.isInstall && <span className="tag tag-g"><Icon name="percent" size={12} />متاح بالتقسيط</span>}
              {l.project?.status === 'construction' && <span className="tag tag-g"><Icon name="crane" size={12} />قيد الإنشاء</span>}
              {l.status === 'reserved' && <span className="tag tag-ink"><Icon name="clock" size={12} />محجوز</span>}
              {sold && <span className="tag tag-ink">{rent ? 'مؤجّر' : 'مباع'}</span>}
            </div>
            <h1 className="t-h1 text-[28px] sm:text-[36px] lg:text-[40px]">{l.title}</h1>
            <div className="mt-1.5 text-ink-600 flex items-center flex-wrap gap-1.5 text-[14.5px]"><Icon name="pin" size={16} className="text-ink-400" />{l.areaName} · أربيل{l.hasProj && <> · <Link to={l.project.id ? `/projects/${l.project.id}` : '/projects'} className="underline underline-offset-2 hover:text-red">{l.projName}</Link></>}</div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-sb -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
            <button type="button" className="btn btn-line btn-sm flex-none dt-save" aria-pressed={saved} onClick={() => S.toggleSave(l.id)}><Icon name="heart" size={16} /><span>{saved ? 'محفوظ' : 'حفظ'}</span></button>
            <button type="button" className="btn btn-line btn-sm flex-none" onClick={compare}><Icon name="compare" size={16} /><span>قارن</span></button>
            <button type="button" className="btn btn-line btn-sm flex-none" onClick={share}><Icon name="share" size={16} /><span>مشاركة</span></button>
          </div>
        </div>

        {/* gallery */}
        <div className="dt-gal">
          <div className="relative rounded-[18px] overflow-hidden select-none">
            <div className="flex transition-transform duration-500" style={{ transform: `translateX(${cur * 100}%)`, transitionTimingFunction: 'cubic-bezier(.2,.7,.1,1)' }}>
              {imgs.map((u, i) => <div key={i} className="w-full flex-none" style={{ cursor: 'zoom-in' }} onClick={() => setGallery(i)}><Img src={u} className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[16/8.4] !rounded-none" label={l.typeAr} alt={l.title} /></div>)}
            </div>
            <div className="absolute top-3 start-3 flex flex-wrap gap-1.5"><DealTag l={l} />{daysSince(l.listed_at) <= 3 && <span className="tag tag-w">جديد</span>}</div>
            {n > 1 && (
              <>
                <button type="button" className="absolute top-1/2 -translate-y-1/2 start-3 fav !w-10 !h-10" onClick={() => show(cur - 1)} aria-label="الصورة السابقة"><Icon name="chev-l" size={20} className="flip-rtl" /></button>
                <button type="button" className="absolute top-1/2 -translate-y-1/2 end-3 fav !w-10 !h-10" onClick={() => show(cur + 1)} aria-label="الصورة التالية"><Icon name="chev" size={20} className="flip-rtl" /></button>
              </>
            )}
            <div className="absolute bottom-3 end-3 flex gap-2"><span className="tag tag-w !h-7 !px-2.5 num">{cur + 1} / {n}</span><button type="button" className="tag tag-w !h-7 !px-2.5 hover:bg-white" onClick={() => setGallery(cur)}><Icon name="expand" size={13} />ملء الشاشة</button></div>
          </div>
          {n > 1 && (
            <div className="flex gap-2 mt-1.5 p-1 -mx-1 overflow-x-auto no-sb">
              {imgs.map((u, i) => <button key={i} type="button" className={`flex-none w-[84px] sm:w-[104px] rounded-[12px] overflow-hidden ring-offset-2 transition ${i === cur ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'}`} onClick={() => show(i)} aria-label={`صورة ${i + 1}`}><Img src={u} className="aspect-[4/3] !rounded-none" /></button>)}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-paper-2 text-[13px] font-medium"><Icon name="grid" size={15} className="text-ink-400" /><span className="num">{l.photoCount}</span> صورة</span>
            {l.plans.length > 0 && <button type="button" className="btn btn-line btn-sm !h-9" onClick={() => setGallery(l.imgs.length)}><Icon name="doc" size={15} /><span className="num">{l.plans.length}</span> مخطط</button>}
            {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer" className="btn btn-line btn-sm !h-9"><Icon name="play" size={15} />شوف الفيديو<Icon name="arrow-up" size={13} className="opacity-60 flip-rtl" /></a>}
          </div>
        </div>

        <div className="lg:hidden mt-5 panel-s p-5">{priceHead}</div>

        <div className="grid lg:grid-cols-12 gap-8 xl:gap-12 mt-6 lg:mt-8">
          <div className="lg:col-span-8 min-w-0">
            <Sec id="facts" first eyebrow="المعلومات الأساسية" title="العقار بلمحة"><FactGrid rows={facts} /></Sec>

            <Sec id="about" eyebrow="الوصف" title="عن العقار">
              <p className="text-ink-700 text-[15.5px]" style={{ lineHeight: 1.85, whiteSpace: 'pre-line' }}>{desc}</p>
            </Sec>

            {amen.length > 0 && (
              <Sec id="amen" eyebrow="المرافق" title="شنو يجي ويّاه">
                <div className="panel p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3"><div className="lbl">بالعقار</div><span className="lbl num">{amen.length} مذكورة</span></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {amen.map(([ic, t]) => <div key={t} className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-[14px] bg-paper-2 min-w-0"><span className="w-9 h-9 rounded-[10px] bg-white inline-flex items-center justify-center flex-none text-ink"><Icon name={ic} size={18} className={ic === 'check' ? 'text-ok' : ''} /></span><span className="text-[13px] sm:text-[13.5px] font-medium leading-snug min-w-0">{t}</span></div>)}
                  </div>
                </div>
              </Sec>
            )}

            {l.plan && !l.hide_price && (
              <Sec id="payment" eyebrow="ملخص الدفع" title="خطة الدفع">
                <div className="panel p-5 sm:p-6">
                  <PlanBar down={l.plan.down} inst={l.plan.inst} handover={l.plan.handover} />
                  <div className="grid sm:grid-cols-3 gap-3 mt-5">
                    {[[`دفعة أولى ${l.plan.down}%`, S.money(l.plan.downAmt)], [`${l.plan.months} قسط شهري`, `${S.money(l.plan.monthly)} / شهر`], [`عند التسليم ${l.plan.handover}%`, S.money(l.plan.handAmt)]].map(([k, v]) => (
                      <div key={k} className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">{k}</div><div className="font-semibold text-[18px] num mt-0.5 whitespace-nowrap" dir="ltr">{v}</div></div>
                    ))}
                  </div>
                  {(l.plan.note || l.plan.date) && <div className="lbl mt-3">{[l.plan.date && `التسليم: ${l.plan.date}`, l.plan.note].filter(Boolean).join(' · ')}</div>}
                  <div className="mt-5 pt-4 border-t hair flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink-500">توضيحي، مو عرض مالي — التفاصيل يأكدها فريق ڤايرو.</span>
                    <Btn kind="dark" size="sm" onClick={() => nav(`/tools/payment?price=${l.price}&down=${l.plan.down}&months=${l.plan.months}`)}><Icon name="chart" size={16} />جرّب خطة مختلفة في مختبر الدفع</Btn>
                  </div>
                </div>
              </Sec>
            )}

            <Sec id="location" eyebrow="الموقع" title="وين يقع">
              <div className={`grid gap-4 ${area ? 'lg:grid-cols-[1.25fr_1fr]' : ''}`}>
                <div>
                  <MapView height={340} style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #e7e7e3' }} center={l.pos} zoom={l.hasPin ? 15 : 13} scrollZoom={false} markers={[{ id: l.id, kind: 'dot', approx: !l.hasPin, lat: l.pos.lat, lng: l.pos.lng, interactive: false }]} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
                    <Btn size="sm" onClick={() => nav(`/map?deal=${l.deal}&area=${l.area_id}`)}><Icon name="map" size={15} />افتح الخريطة</Btn>
                    {l.hasPin && <a href={directionsUrl(l.pos)} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="pin" size={15} />الاتجاهات<Icon name="arrow-up" size={12} className="opacity-60 flip-rtl" /></a>}
                    <span className="lbl">{l.areaName} · {l.hasPin ? l.area.vibe : 'موقع تقريبي'}</span>
                  </div>
                  <p className="lbl mt-2">{l.hasPin ? 'العنوان الدقيق ينطى لما تحجز معاينة.' : 'موقع تقريبي. العنوان الدقيق ينطى لما تحجز معاينة.'}</p>
                </div>
                {area && (
                  <div className="panel p-5 flex flex-col">
                    <div className="flex items-center gap-3"><Img src={area.img} className="w-14 h-14 !rounded-[12px] flex-none" /><div className="min-w-0"><div className="lbl">لمحة عن المنطقة</div><div className="font-semibold text-[17px] clamp-1">{area.name}</div><div className="lbl clamp-1">{area.vibe}</div></div></div>
                    <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]"><div className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">شراء · متوسط الطلب</div><div className="font-semibold num">{area.ppmText} / م²</div></div><div className="p-3 rounded-[12px] bg-paper-2"><div className="lbl">إيجار · المعتاد</div><div className="font-semibold num">{area.rentText}</div></div></div>
                    {area.dnaRows?.length > 0 && <div className="mt-4 space-y-2.5">{area.dnaRows.slice(0, 4).map((r) => <div key={r.lab} className="flex items-center gap-3 text-[13px]"><span className="w-[118px] flex-none text-ink-600">{r.lab}</span><span className="flex-1 h-1.5 rounded-full bg-paper-3 overflow-hidden"><span className="block h-full rounded-full bg-ink" style={{ width: r.w }} /></span><span className="num text-ink-500 w-5 text-end">{r.v}</span></div>)}</div>}
                    <div className="mt-auto pt-4"><Link to={area.href} className="btn btn-line btn-sm">اكتشف {area.short}<Icon name="arrow" size={14} className="flip-rtl" /></Link></div>
                  </div>
                )}
              </div>
            </Sec>

            {proj && (
              <Sec id="project" eyebrow="ضمن مشروع" title={proj.name}>
                <Link to={proj.href} className="group panel overflow-hidden grid sm:grid-cols-[240px_1fr] hover:shadow-card transition-shadow">
                  <Img src={proj.img} className="aspect-[16/10] sm:aspect-auto sm:h-full !rounded-none" label={proj.typeAr} />
                  <div className="p-5 sm:p-6">
                    <div className="lbl">{proj.typeAr} · {proj.areaShort}{proj.devName ? ` · ${proj.devName}` : ''}</div>
                    <div className="text-[19px] font-semibold mt-1 group-hover:text-red transition-colors">{proj.name}</div>
                    {proj.tagline && <p className="text-ink-600 text-[14px] mt-1">{proj.tagline}</p>}
                    {proj.status === 'construction' ? <div className="mt-4 flex items-center gap-3"><div className="flex-1"><ProgressBar v={proj.progress} /></div><span className="text-[12.5px] text-ink-500 num">{proj.progress}% منجز · التسليم {proj.handover}</span></div> : <div className="mt-3 tag tag-ok"><Icon name="key" size={12} />مكتمل</div>}
                    {proj.amenList?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{proj.amenList.slice(0, 6).map((a) => <span key={a} className="tag tag-g">{a}</span>)}</div>}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">{proj.unitList?.length > 0 && <span className="num">{proj.unitList.length} وحدة متاحة</span>}<span className="link ms-auto">شوف المشروع<Icon name="arrow" size={14} className="flip-rtl" /></span></div>
                  </div>
                </Link>
              </Sec>
            )}

            <section className="pt-10 mt-10 border-t hair lg:hidden">
              <div className="eyebrow mb-3">مستشارك من ڤايرو</div>
              <div className="panel p-5">{consultant(false)}<div className="grid grid-cols-1 gap-2 mt-4">{ctas}</div><p className="lbl mt-3">كل طلب يروح لڤايرو — مو للمالك أو لمكتب ثاني.</p></div>
            </section>
          </div>

          <aside className="hidden lg:block lg:col-span-4">
            <div className="lg:sticky lg:top-[92px] space-y-3">
              <div className="panel p-5 sm:p-6 shadow-card">
                <div className="flex items-center justify-between gap-2 mb-3"><DealTag l={l} /><span className="mono text-[11.5px] text-ink-400">{l.id}</span></div>
                {priceHead}
                <div className="mt-5 flex flex-col gap-2">{ctas}</div>
                <div className="mt-5 pt-4 border-t hair">{consultant(true)}</div>
                <p className="lbl mt-3">كل طلب يروح لڤايرو — مو للمالك أو لمكتب ثاني.</p>
                <p className="lbl mt-1 num">رقم العقار {l.id} · أُدرج في {l.listed_at}</p>
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16 pt-12 border-t hair">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div><div className="eyebrow mb-2">{rent ? 'إيجارات ثانية' : 'عروض بيع ثانية'}</div><h2 className="t-h2 text-[24px] sm:text-[30px]">عقارات مشابهة {rent ? 'للإيجار' : 'للبيع'}</h2></div>
              <Link to={rent ? '/rent' : '/buy'} className="link text-[14px] hidden sm:inline-flex">شوف الكل<Icon name="arrow" size={15} className="flip-rtl" /></Link>
            </div>
            <CardGrid list={similar} />
          </section>
        )}
      </div>

      {/* mobile sticky bar — sits above the tabbar */}
      <div className="fixed bottom-[60px] inset-x-0 z-[52] lg:hidden backdrop-blur border-t hair px-4 py-2.5 flex items-center gap-2 shadow-[0_-8px_24px_-16px_rgba(0,0,0,.25)]" style={{ background: 'rgba(255,255,255,.97)' }}>
        <div className="min-w-0 flex-1 leading-tight"><div className="font-semibold num text-[15.5px] clamp-1" dir="ltr" style={{ textAlign: 'start' }}>{l.priceText}{l.per && <span className="text-ink-500 text-[12px] font-medium"> {l.per}</span>}</div><div className="lbl clamp-1">{l.typeAr} · {l.areaShort || l.areaName}</div></div>
        <a href={tel} className="w-11 h-11 rounded-[12px] border hair inline-flex items-center justify-center flex-none" aria-label="اتصال"><Icon name="phone" size={19} /></a>
        <a href={wa} target="_blank" rel="noreferrer" className="w-11 h-11 rounded-[12px] border hair inline-flex items-center justify-center flex-none" aria-label="WhatsApp"><Icon name="wa" size={19} /></a>
        <Btn kind="red" className="flex-none" style={{ height: 44, paddingInline: 16 }} onClick={() => setBooking(true)} disabled={sold}><Icon name="cal" size={17} />معاينة</Btn>
      </div>

      {gallery !== null && <Gallery l={l} start={gallery} onClose={() => setGallery(null)} />}
      {booking && (
        <LeadModal title="احجز معاينة" sub={`${l.title} · ${l.id}`} kind="viewing" listingIds={[l.id]} listing={l} deal={l.deal} onClose={() => setBooking(false)}
          submitLabel="أرسل طلب المعاينة" done="وصل طلبك — راح نأكد ويّاك الموعد قريباً" icon="cal"
          extra={(x, setX) => (
            <div className="grid grid-cols-2 gap-3">
              <Field label="اليوم المفضّل"><select className="inp sel" value={x.day || ''} onChange={(e) => setX({ ...x, day: e.target.value })}><option value="">أي يوم</option>{dayOptions().map((d) => <option key={d.toISOString()} value={dayLabel(d)}>{dayLabel(d)}</option>)}</select></Field>
              <Field label="الوقت"><select className="inp sel" value={x.time || ''} onChange={(e) => setX({ ...x, time: e.target.value })}><option value="">أي وقت</option><option>صباحاً</option><option>بعد الظهر</option><option>مساءً</option></select></Field>
            </div>
          )}
          buildMessage={(x) => [x.day && `اليوم: ${x.day}`, x.time && `الوقت: ${x.time}`].filter(Boolean).join(' · ')} />
      )}
    </>
  );
}

const TeamMark = ({ size = 52 }) => (
  <span className="rounded-full bg-red inline-flex items-center justify-center flex-none" style={{ width: size, height: size }} dir="ltr">
    <svg width={size / 2} height={size / 2} viewBox="0 0 34 34"><path d="M9 10l8 15 8-15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

// Lightbox (photos + plans) — the reference's full-screen gallery sheet, on the app's Modal.
function Gallery({ l, start, onClose }) {
  const items = [...l.imgs.map((u) => ({ u, plan: false })), ...l.plans.map((u) => ({ u, plan: true }))];
  const [i, setI] = useState(Math.min(start, items.length - 1));
  useEffect(() => {
    const k = (e) => { if (e.key === 'ArrowLeft') setI((x) => (x + 1) % items.length); if (e.key === 'ArrowRight') setI((x) => (x - 1 + items.length) % items.length); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [items.length]);
  if (!items.length) return null;
  const cur = items[i];
  const isPdf = (u) => /\.pdf($|\?)/i.test(u);
  return (
    <Modal title={`${cur.plan ? 'مخطط' : 'صورة'} ${i + 1} / ${items.length}`} sub={l.title} onClose={onClose} width={1000} bodyClass="p-4 sm:p-6">
      <div className="relative bg-paper-2 rounded-[16px] overflow-hidden aspect-[16/10] grid place-items-center select-none">
        {isPdf(cur.u) ? <a href={cur.u} target="_blank" rel="noreferrer" className="btn btn-ink"><Icon name="doc" size={17} />افتح المخطط (PDF)<Icon name="arrow-up" size={13} className="opacity-60 flip-rtl" /></a> : <img src={cur.u} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        {items.length > 1 && (
          <>
            <button type="button" aria-label="السابق" onClick={() => setI((i - 1 + items.length) % items.length)} className="absolute top-1/2 -translate-y-1/2 start-3 fav !w-12 !h-12"><Icon name="chev-l" size={22} className="flip-rtl" /></button>
            <button type="button" aria-label="التالي" onClick={() => setI((i + 1) % items.length)} className="absolute top-1/2 -translate-y-1/2 end-3 fav !w-12 !h-12"><Icon name="chev" size={22} className="flip-rtl" /></button>
          </>
        )}
      </div>
      <div className="flex gap-2 mt-3 p-1 -mx-1 overflow-x-auto no-sb">
        {items.map((it, k) => (
          <button key={k} type="button" onClick={() => setI(k)} className={`flex-none w-[72px] rounded-[10px] overflow-hidden ring-offset-2 transition ${k === i ? 'ring-2 ring-ink' : 'opacity-60 hover:opacity-100'}`} aria-label={`${it.plan ? 'مخطط' : 'صورة'} ${k + 1}`}>
            {isPdf(it.u) ? <span className="block aspect-[4/3] bg-paper-2 grid place-items-center text-[11px] font-semibold mono">PDF</span> : <Img src={it.u} className="aspect-[4/3] !rounded-none" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
