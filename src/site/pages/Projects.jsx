import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { PROJECT_TYPES } from '../../lib/format.js';
import { Btn, Chip } from '../../components/ui.jsx';
import { CardGrid, Crumbs, H2, LeadModal, PageHead, PlanBar, Stat, Tag } from '../parts.jsx';
import NotFound from './NotFound.jsx';

export function Projects() {
  useDocTitle('مشاريع جديدة');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const type = sp.get('type') || '', status = sp.get('status') || '';
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v || sp.get(k) === v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const fid = S.settings.featured_project_id;
  const list = S.projs.filter((p) => (!type || p.type === type) && (!status || p.status === status)).sort((a, b) => (b.id === fid) - (a.id === fid));
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="مشاريع جديدة" title="مشاريع جديدة بأربيل" h1Fs={L.h1Fs} sub="أبراج ومجمعات وفلل من مطوّرين نعرفهم. نعرض نسبة الإنجاز وموعد التسليم وخطة الدفع بوضوح، ونرتب لك زيارة الموقع." />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
        <Chip h={38} px={14} fs={13.5} on={!type && !status} onClick={() => setSp(new URLSearchParams(), { replace: true })}>الكل</Chip>
        {['tower', 'compound', 'villas', 'mixed'].map((t) => <Chip key={t} h={38} px={14} fs={13.5} on={type === t} onClick={() => set('type', t)}>{t === 'tower' ? 'أبراج سكنية' : t === 'compound' ? 'مجمعات سكنية' : PROJECT_TYPES[t]}</Chip>)}
        <span style={{ width: 1, background: '#e7e7e3', margin: '0 4px' }} />
        <Chip h={38} px={14} fs={13.5} on={status === 'construction'} onClick={() => set('status', 'construction')}>قيد الإنشاء</Chip>
        <Chip h={38} px={14} fs={13.5} on={status === 'ready'} onClick={() => set('status', 'ready')}>جاهز</Chip>
      </div>
      {list.length === 0 && <div style={{ marginTop: 24, padding: 40, textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 18 }}>لا توجد مشاريع مطابقة</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 20, marginTop: 24 }}>
        {list.map((p) => (
          <button key={p.id} className="h-shadow-lg" onClick={() => nav(p.href)} style={{ textAlign: 'start', border: '1px solid #e7e7e3', borderRadius: 20, overflow: 'hidden', background: '#fff', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', aspectRatio: '16/10', background: '#f6f6f4', width: '100%' }}>
              {p.img && <img src={p.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              <span style={{ position: 'absolute', top: 12, insetInlineStart: 12, height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,.95)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>{p.statusLabel}</span>
              <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(29,30,34,.85)', color: '#fff', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>{p.typeAr}</span>
            </div>
            <div style={{ padding: 16, width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><div style={{ fontWeight: 600, fontSize: 17 }}>{p.name}</div><div style={{ fontSize: 12.5, color: '#767a83' }}>{p.areaShort}</div></div>
              <div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>{p.tagline}</div>
              <div style={{ marginTop: 14, height: 6, borderRadius: 999, background: '#eeeeeb', overflow: 'hidden' }}><div style={{ height: '100%', width: p.progressW, background: '#c8102e' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5a5e68', marginTop: 6 }}><span>الإنجاز {p.progress}%</span><span>التسليم: {p.handover}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid #e7e7e3' }}>
                <div><div style={{ fontSize: 11.5, color: '#767a83' }}>يبدأ من</div><div style={{ fontWeight: 700, fontSize: 16 }} dir="ltr">{p.fromText}</div></div>
                <div style={{ fontSize: 12.5, color: '#5a5e68' }}>{p.devName}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Project() {
  const { id } = useParams();
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [modal, setModal] = useState(null);
  const p = S.projById(id);
  useDocTitle(p?.name);
  if (!p) return <NotFound what="المشروع" />;
  const pill = { height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,.2)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };
  const legend = (c, t) => <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#767a83' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{t}</div>;
  return (
    <section style={{ paddingTop: 28 }}>
      <Crumbs items={[['الرئيسية', '/'], ['مشاريع جديدة', '/projects'], [p.name]]} />
      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: L.heroImgH, marginTop: 14, background: '#f6f6f4' }}>
        {p.img && <img src={p.img} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.65),transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 20, insetInline: 20, color: '#fff', display: 'flex', flexDirection: L.rowDir, justifyContent: 'space-between', alignItems: L.heroAlign, gap: 12 }}>
          <div><div style={{ display: 'flex', gap: 6 }}><span style={pill}>{p.typeAr}</span><span style={pill}>{p.statusLabel}</span></div><h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: '10px 0 0' }}>{p.name}</h1><div style={{ opacity: 0.85, marginTop: 4 }}>{p.tagline} · {p.areaName}</div></div>
          <div style={{ textAlign: L.heroPriceAlign }}><div style={{ fontSize: 12, opacity: 0.8 }}>يبدأ من</div><div style={{ fontSize: L.priceFs, fontWeight: 700, lineHeight: 1.1 }} dir="ltr">{p.fromText}</div></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 40, marginTop: 28, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
            <Stat label="نسبة الإنجاز" value={`${p.progress}%`}><div style={{ marginTop: 8, height: 5, borderRadius: 999, background: '#e3e3df', overflow: 'hidden' }}><div style={{ height: '100%', width: p.progressW, background: '#c8102e' }} /></div></Stat>
            <Stat label="التسليم" value={p.handover} />
            <Stat label="الطوابق" value={p.floors} />
            <Stat label="الوحدات" value={p.units} />
          </div>
          <H2 m="36px 0 10px">عن المشروع</H2>
          <p style={{ color: '#3f424a', lineHeight: 1.85, margin: 0, fontSize: 15.5 }}>{p.name} {p.typeAr} في {p.areaName} من {p.devName}. {p.tagline}. يضم {p.units} وحدة على {p.floors} طابق، مع خدمات متكاملة. فريق ڤايرو زار الموقع وتابع نسبة الإنجاز، والأرقام المعروضة من المطوّر مباشرة.</p>
          {p.amenList.length > 0 && <><H2>المرافق</H2><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{p.amenList.map((a) => <Tag key={a}>{a}</Tag>)}</div></>}
          {p.plan_months > 0 && (
            <>
              <H2>خطة الدفع</H2>
              <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 20 }}>
                <PlanBar down={p.plan_down} inst={100 - p.plan_down - p.plan_handover} handover={p.plan_handover} />
                <div style={{ display: 'grid', gridTemplateColumns: L.planCols, gap: 12, marginTop: 16, fontSize: 13 }}>
                  <div>{legend('#c8102e', 'دفعة أولى')}<div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>{p.downPct}</div></div>
                  <div>{legend('#1d1e22', `أقساط على ${p.monthsText}`)}<div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>{p.instPct}</div></div>
                  <div>{legend('#d8d8d3', 'عند التسليم')}<div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>{p.handPct}</div></div>
                </div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '40px 0 16px', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>الوحدات المتاحة</h2>
            {p.type === 'tower' && <Btn h={38} r={10} px={14} fs={13} onClick={() => nav(`/tools/tower/${p.id}`)}>افتح مستكشف البرج</Btn>}
          </div>
          <CardGrid list={p.unitList} min={230} gap={16} empty="لا توجد وحدات معروضة حالياً — اطلب قائمة الأسعار" />
        </div>
        <aside style={{ position: L.asidePos, top: 92, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 48, height: 48, borderRadius: 12, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }} dir="ltr">{p.devMono}</span><div><div style={{ fontSize: 12, color: '#767a83' }}>المطوّر</div><div style={{ fontWeight: 600, fontSize: 15 }}>{p.devName}</div></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              <Btn kind="red" h={46} fs={14.5} onClick={() => setModal('brochure')}>اطلب الكتيّب وقائمة الأسعار</Btn>
              <Btn kind="dark" h={46} fs={14.5} onClick={() => setModal('visit')}>رتّب زيارة للموقع</Btn>
              <Btn h={46} fs={14.5} onClick={() => nav(`/tools/payment?price=${p.price_from}&down=${p.plan_down}&months=${p.plan_months || 36}&handover=${p.plan_handover}`)}>احسب الأقساط</Btn>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: '#767a83', textAlign: 'center' }}>ڤايرو وسيط معتمد لهذا المشروع</div>
          </div>
          <button onClick={() => nav(`/areas/${p.area_id}`)} style={{ textAlign: 'start', border: '1px solid #e7e7e3', borderRadius: 18, padding: 16, background: '#f6f6f4', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div><div style={{ fontSize: 12, color: '#767a83' }}>المنطقة</div><div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{p.areaName}</div></div><span style={{ color: '#9da0a7', fontSize: 20 }}>‹</span>
          </button>
        </aside>
      </div>
      {modal && (
        <LeadModal title={modal === 'brochure' ? 'اطلب الكتيّب وقائمة الأسعار' : 'رتّب زيارة للموقع'} sub={`${p.name} · ${p.devName}`} kind={modal === 'brochure' ? 'brochure' : 'viewing'}
          listingIds={p.unitList.slice(0, 1).map((l) => l.id)} deal="sale" onClose={() => setModal(null)} buildMessage={() => `المشروع: ${p.name}`}
          submitLabel={modal === 'brochure' ? 'أرسل لي الكتيّب' : 'أرسل الطلب'} done={modal === 'brochure' ? 'راح نرسلك الكتيّب وقائمة الأسعار على واتساب' : 'وصل طلبك — راح نرتب ويّاك موعد الزيارة'} />
      )}
    </section>
  );
}
