import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { dayLabel } from '../../lib/format.js';
import { Btn, Field, Modal, Spinner, useToast } from '../../components/ui.jsx';
import { CardGrid, Crumbs, Dot, H2, LeadModal, PlanBar, Stat, Tag, dayOptions, stripes, waLink } from '../parts.jsx';
import NotFound from './NotFound.jsx';

const pill = { height: 28, padding: '0 12px', borderRadius: 999, background: '#f6f6f4', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };
const img = { width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' };

export default function Property() {
  const { id } = useParams();
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const toast = useToast();
  const [extra, setExtra] = useState(undefined); // listing not in the public catalog (e.g. staff previewing a draft)
  const [gallery, setGallery] = useState(null);
  const [booking, setBooking] = useState(false);
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

  if (l === undefined) return <Spinner pad={140} />;
  if (!l) return <NotFound what="العقار" />;

  const agent = S.showAgent ? l.agent : null;
  const phone = agent?.phone || S.settings.office_phone;
  const waText = `مرحبا، أريد أستفسر عن العقار ${l.id} — ${l.title}`;
  const wa = waLink(agent?.phone || S.settings.office_whatsapp, waText);
  const imgs = l.imgs.length ? l.imgs : [''];
  const at = (i) => imgs[i % imgs.length];
  const similar = S.live.filter((x) => x.id !== l.id && x.deal === l.deal).sort((a, b) => (b.area_id === l.area_id) - (a.area_id === l.area_id) || (b.type === l.type) - (a.type === l.type)).slice(0, 3);
  const saved = S.saved.includes(l.id);
  const desc = l.description_ar || `${l.typeAr} في ${l.areaName} بمساحة ${l.size} م².${l.view_text ? ' ' + l.view_text + '.' : ''} ${(l.features || []).slice(0, 3).join('، ')}${l.features?.length ? '.' : ''} العقار موثّق من فريق ڤايرو ميدانياً، والمعلومات المعروضة مأخوذة من المالك ومن زيارة الموقع. تواصل ويّانا لتحديد موعد معاينة أو لطلب خطة الدفع بالتفصيل.`;
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: l.title, url });
      else { await navigator.clipboard.writeText(url); toast('نُسخ رابط العقار'); }
    } catch { /* cancelled */ }
  };
  const stats = [
    ['المساحة', `${l.size} م²`],
    l.beds != null && ['غرف النوم', l.beds],
    l.baths != null && ['الحمامات', l.baths],
    l.floor != null && l.type !== 'land' && ['الطابق', l.total_floors ? `${l.floor} / ${l.total_floors}` : l.floor],
    l.plot && ['القطعة', `${l.plot} م²`],
    l.frontage && ['الواجهة', `${l.frontage} م`],
    l.condition && ['الحالة', l.condition],
    l.deal === 'sale' ? l.payLabel && ['الدفع', l.payLabel] : l.furnishing && ['الفرش', l.furnishing],
    l.deal === 'rent' && l.deposit && ['التأمين', S.money(l.deposit)],
    l.deal === 'rent' && l.available && ['التوفر', l.available],
    l.land_use && ['الاستخدام', l.land_use],
  ].filter(Boolean).slice(0, 8);

  return (
    <section style={{ paddingTop: 28 }}>
      <Crumbs items={[['الرئيسية', '/'], [l.dealLabel, l.deal === 'rent' ? '/rent' : '/buy'], [l.areaName, `/areas/${l.area_id}`], [l.id]]} />
      {l.status === 'draft' && <div style={{ marginTop: 12, background: '#fff3e0', color: '#b26a00', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600 }}>معاينة داخلية — هذا العقار مسودة ولا يظهر للزوار</div>}
      {L.phone ? (
        <div onClick={() => setGallery(0)} style={{ position: 'relative', marginTop: 14, borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', background: '#f6f6f4' }}>
          {imgs[0] && <img src={imgs[0]} alt={l.title} style={img} />}
          <span style={{ position: 'absolute', bottom: 12, insetInlineEnd: 12, ...pill, background: 'rgba(255,255,255,.95)', height: 28, fontSize: 12 }}>1 / {l.photoCount}</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: L.galCols, gridAutoRows: '200px', gap: 8, marginTop: 14, borderRadius: 24, overflow: 'hidden' }}>
          <img src={at(0)} alt={l.title} style={{ ...img, gridRow: 'span 2' }} onClick={() => setGallery(0)} />
          <img src={at(1)} alt="" style={img} onClick={() => setGallery(1 % imgs.length)} />
          <img src={at(2)} alt="" style={img} onClick={() => setGallery(2 % imgs.length)} />
          <img src={at(3)} alt="" style={img} onClick={() => setGallery(3 % imgs.length)} />
          <div style={{ position: 'relative', background: '#f6f6f4', cursor: 'pointer' }} onClick={() => setGallery(0)}>
            <img src={at(4)} alt="" style={{ ...img, opacity: 0.6 }} />
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 14 }}>كل الصور ({l.photoCount}{l.plans.length ? ` + ${l.plans.length} مخطط` : ''})</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 40, marginTop: 28, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={pill}>{l.dealLabel}</span><span style={pill}>{l.typeAr}</span>
            {l.isInstall && <span style={{ ...pill, background: '#fde8eb', color: '#c8102e' }}>متاح بالتقسيط</span>}
            {l.status === 'reserved' && <span style={{ ...pill, background: '#fff3e0', color: '#b26a00' }}>محجوز</span>}
            {l.status === 'sold' && <span style={{ ...pill, background: '#1d1e22', color: '#fff' }}>{l.deal === 'rent' ? 'مؤجّر' : 'مباع'}</span>}
            {l.verified && <span style={{ ...pill, background: '#e6f6ee', color: '#0f8a4f', gap: 4 }}>✓ موثّق من ڤايرو</span>}
          </div>
          <h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: '14px 0 0', letterSpacing: '-.01em' }}>{l.title}</h1>
          <div style={{ color: '#5a5e68', marginTop: 6, fontSize: 15 }}>{l.areaName} · أربيل{l.hasProj && <> · <a onClick={() => nav(l.project.id ? `/projects/${l.project.id}` : '/projects')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{l.projName}</a></>}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            <div style={{ fontSize: L.priceFs, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} dir="ltr">{l.priceText}</div>
            <span style={{ color: '#767a83', fontSize: 14 }}>{l.per} {l.ppm}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginTop: 24 }}>
            {stats.map(([k, v]) => <Stat key={k} label={k} value={v} />)}
          </div>
          <H2 m="36px 0 10px">عن العقار</H2>
          <p style={{ color: '#3f424a', lineHeight: 1.85, margin: 0, fontSize: 15.5, whiteSpace: 'pre-line' }}>{desc}</p>
          {(l.features?.length > 0 || l.view_text) && (
            <>
              <H2>المميزات</H2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{[...(l.features || []), l.view_text].filter(Boolean).map((t) => <Tag key={t}>{t}</Tag>)}</div>
            </>
          )}
          {l.plan && !l.hide_price && (
            <>
              <H2>خطة الدفع</H2>
              <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 20 }}>
                <PlanBar down={l.plan.down} inst={l.plan.inst} handover={l.plan.handover} />
                <div style={{ display: 'grid', gridTemplateColumns: L.planCols, gap: 12, marginTop: 16, fontSize: 13 }}>
                  <div><div style={{ color: '#767a83' }}>دفعة أولى {l.plan.down}%</div><div style={{ fontWeight: 600, fontSize: 16, marginTop: 2, whiteSpace: 'nowrap' }} dir="ltr">{S.money(l.plan.downAmt)}</div></div>
                  <div><div style={{ color: '#767a83' }}>{l.plan.months} قسط شهري</div><div style={{ fontWeight: 600, fontSize: 16, marginTop: 2, whiteSpace: 'nowrap' }} dir="ltr">{S.money(l.plan.monthly)} / شهر</div></div>
                  <div><div style={{ color: '#767a83' }}>عند التسليم {l.plan.handover}%</div><div style={{ fontWeight: 600, fontSize: 16, marginTop: 2, whiteSpace: 'nowrap' }} dir="ltr">{S.money(l.plan.handAmt)}</div></div>
                </div>
                {(l.plan.note || l.plan.date) && <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 12 }}>{[l.plan.date && `التسليم: ${l.plan.date}`, l.plan.note].filter(Boolean).join(' · ')}</div>}
                <Btn style={{ marginTop: 16 }} onClick={() => nav(`/tools/payment?price=${l.price}&down=${l.plan.down}&months=${l.plan.months}`)}>جرّب خطة مختلفة في مختبر الدفع ←</Btn>
              </div>
            </>
          )}
          {l.video_url && (
            <>
              <H2>جولة فيديو</H2>
              <a href={l.video_url} target="_blank" rel="noreferrer"><Btn>شاهد الجولة ↗</Btn></a>
            </>
          )}
          <H2>الموقع</H2>
          <button onClick={() => nav(`/map?deal=${l.deal}&area=${l.area_id}`)} style={{ width: '100%', height: 260, borderRadius: 18, border: '1px solid #e7e7e3', background: stripes(), position: 'relative', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
            <Dot />
            <span style={{ position: 'absolute', bottom: 14, insetInlineStart: 14, background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>{l.areaName} · {l.area.vibe}</span>
          </button>
          {similar.length > 0 && (<><H2 m="40px 0 16px">عقارات مشابهة</H2><CardGrid list={similar} min={230} gap={16} /></>)}
        </div>

        <aside style={{ position: L.asidePos, top: 92, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,.06)' }}>
            {agent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {agent.img ? <img src={agent.img} alt="" style={{ width: 52, height: 52, borderRadius: 999, objectFit: 'cover' }} /> : <TeamMark />}
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{agent.name}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{agent.title} · ڤايرو</div></div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <TeamMark />
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>فريق ڤايرو</div><div style={{ fontSize: 12.5, color: '#767a83' }}>نرد خلال دقائق · 9 ص – 7 م</div></div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              <a href={wa} target="_blank" rel="noreferrer" style={{ display: 'contents' }}><Btn kind="red" h={46} fs={14.5}>واتساب</Btn></a>
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} style={{ display: 'contents' }}><Btn kind="dark" h={46} fs={14.5}><span dir="ltr">{phone}</span></Btn></a>
              <Btn h={46} fs={14.5} onClick={() => setBooking(true)} disabled={l.status === 'sold'}>احجز معاينة</Btn>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn h={40} r={10} fs={13} style={{ flex: 1, color: saved ? '#c8102e' : undefined }} onClick={() => S.toggleSave(l.id)}>{saved ? '♥ محفوظ' : '♡ حفظ'}</Btn>
              <Btn h={40} r={10} fs={13} style={{ flex: 1 }} onClick={() => { if (!saved) S.toggleSave(l.id); nav('/compare'); }}>قارن</Btn>
              <Btn h={40} r={10} fs={13} style={{ flex: 1 }} onClick={share}>مشاركة</Btn>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: '#767a83', textAlign: 'center' }}>رقم العقار {l.id} · أُدرج في {l.listed_at}</div>
          </div>
          {l.hasProj && (
            <button onClick={() => nav(`/projects/${l.project.id}`)} style={{ textAlign: 'start', border: '1px solid #e7e7e3', borderRadius: 18, padding: 16, background: '#f6f6f4', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><div style={{ fontSize: 12, color: '#767a83' }}>جزء من مشروع</div><div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{l.projName}</div></div><span style={{ color: '#9da0a7', fontSize: 20 }}>‹</span>
            </button>
          )}
        </aside>
      </div>

      {L.phone && (
        <div style={{ position: 'sticky', bottom: 60, zIndex: 50, margin: '16px -16px -80px', padding: '10px 16px', background: 'rgba(255,255,255,.97)', borderTop: '1px solid #e7e7e3', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap' }} dir="ltr">{l.priceText}</div><div style={{ fontSize: 11.5, color: '#767a83', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div></div>
          <a href={wa} target="_blank" rel="noreferrer"><Btn kind="red" h={42} px={14}>واتساب</Btn></a>
          <Btn kind="dark" h={42} px={14} onClick={() => setBooking(true)} disabled={l.status === 'sold'}>احجز معاينة</Btn>
        </div>
      )}

      {gallery !== null && <Gallery l={l} start={gallery} onClose={() => setGallery(null)} />}
      {booking && (
        <LeadModal title="احجز معاينة" sub={`${l.title} · ${l.id}`} kind="viewing" listingIds={[l.id]} deal={l.deal} onClose={() => setBooking(false)}
          submitLabel="أرسل طلب المعاينة" done="وصل طلبك — راح نأكد ويّاك الموعد قريباً"
          extra={(x, setX) => (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="اليوم المفضّل"><select className="inp sel" value={x.day || ''} onChange={(e) => setX({ ...x, day: e.target.value })}><option value="">أي يوم</option>{dayOptions().map((d) => <option key={d.toISOString()} value={dayLabel(d)}>{dayLabel(d)}</option>)}</select></Field>
              <Field label="الوقت"><select className="inp sel" value={x.time || ''} onChange={(e) => setX({ ...x, time: e.target.value })}><option value="">أي وقت</option><option>صباحاً</option><option>بعد الظهر</option><option>مساءً</option></select></Field>
            </div>
          )}
          buildMessage={(x) => [x.day && `اليوم: ${x.day}`, x.time && `الوقت: ${x.time}`].filter(Boolean).join(' · ')} />
      )}
    </section>
  );
}

const TeamMark = () => (
  <span style={{ width: 52, height: 52, borderRadius: 999, background: '#c8102e', display: 'grid', placeItems: 'center', flex: 'none' }} dir="ltr">
    <svg width="26" height="26" viewBox="0 0 34 34"><path d="M9 10l8 15 8-15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

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
  const isPdf = /\.pdf($|\?)/i.test(cur.u);
  return (
    <Modal title={`${cur.plan ? 'مخطط' : 'صورة'} ${i + 1} / ${items.length}`} onClose={onClose} width={1000}>
      <div style={{ position: 'relative', background: '#f6f6f4', borderRadius: 14, overflow: 'hidden', aspectRatio: '16/10', display: 'grid', placeItems: 'center' }}>
        {isPdf ? <a href={cur.u} target="_blank" rel="noreferrer"><Btn kind="dark">افتح المخطط (PDF) ↗</Btn></a> : <img src={cur.u} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        {items.length > 1 && (
          <>
            <button aria-label="السابق" onClick={() => setI((i - 1 + items.length) % items.length)} style={navBtn('right')}>›</button>
            <button aria-label="التالي" onClick={() => setI((i + 1) % items.length)} style={navBtn('left')}>‹</button>
          </>
        )}
      </div>
      <div className="no-scrollbar" style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
        {items.map((it, k) => (
          <button key={k} onClick={() => setI(k)} style={{ flex: 'none', width: 72, height: 54, borderRadius: 8, overflow: 'hidden', border: k === i ? '2px solid #c8102e' : '1px solid #e7e7e3', padding: 0, cursor: 'pointer', background: '#f6f6f4', fontSize: 11 }}>
            {/\.pdf($|\?)/i.test(it.u) ? 'PDF' : <img src={it.u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
const navBtn = (side) => ({ position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 999, border: 0, background: 'rgba(255,255,255,.95)', fontSize: 22, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.12)' });
