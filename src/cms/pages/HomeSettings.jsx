import { useMemo, useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Card, Field, Modal, StatusPill, Toggle, useToast } from '../../components/ui.jsx';
import { PageTitle } from '../../staff/Shell.jsx';

const SECTIONS = [['types', 'أنواع العقارات'], ['featured', 'عقارات مميزة'], ['areas', 'المناطق والخريطة'], ['tools', 'الأدوات'], ['owners', 'الملاك والاستثمار']];

export default function HomeSettings() {
  useDocTitle('الرئيسية وإعدادات الموقع');
  const C = useCms();
  const toast = useToast();
  const initFeatured = useMemo(() => C.listings.filter((l) => l.featured).sort((a, b) => (a.featured_rank ?? 99) - (b.featured_rank ?? 99)).map((l) => l.id), [C.listings]);
  const S0 = C.settings;
  const init = useMemo(() => ({
    hero_kicker: S0.hero_kicker || '', hero_title: S0.hero_title || '', announcement: S0.announcement || '', show_agent: S0.show_agent !== false, show_listing_id: S0.show_listing_id !== false,
    sections: { types: true, featured: true, areas: true, tools: true, owners: true, ...(S0.sections || {}) }, home_areas: S0.home_areas || [], featured_project_id: S0.featured_project_id || '',
    office_phone: S0.office_phone || '', office_whatsapp: S0.office_whatsapp || '', office_address: S0.office_address || '', iqd_rate: S0.iqd_rate || 1310,
  }), [S0]);
  const [f, setF] = useState(init);
  const [feat, setFeat] = useState(initFeatured);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(init) || JSON.stringify(feat) !== JSON.stringify(initFeatured);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const byId = Object.fromEntries(C.listings.map((l) => [l.id, l]));

  const publish = async () => {
    setBusy(true);
    try {
      await q(supabase.from('site_settings').update({ ...f, announcement: f.announcement.trim() || null, featured_project_id: f.featured_project_id || null, iqd_rate: +f.iqd_rate || 1310 }).eq('id', 1));
      if (JSON.stringify(feat) !== JSON.stringify(initFeatured)) await q(supabase.rpc('set_featured_order', { p_ids: feat }));
      await C.reload();
      toast('نُشرت التغييرات على الموقع');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const moveFeat = (from, to) => { if (from == null || from === to) return; const a = [...feat]; const [x] = a.splice(from, 1); a.splice(to, 0, x); setFeat(a); };
  const toggleArea = (id) => setF({ ...f, home_areas: f.home_areas.includes(id) ? f.home_areas.filter((x) => x !== id) : [...f.home_areas, id] });
  const fp = C.P[f.featured_project_id];

  return (
    <>
      <PageTitle sub="ما يظهر للزائر أول ما يفتح الموقع" action={<>{dirty && <span style={{ alignSelf: 'center', fontSize: 12.5, color: '#b26a00' }}>تغييرات غير منشورة</span>}<Btn kind="red" disabled={busy || !dirty} onClick={publish}>نشر التغييرات</Btn></>}>الصفحة الرئيسية</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridColumn: 'span 2', minWidth: 0 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}><div><div style={{ fontWeight: 600 }}>عقارات مميزة</div><div style={{ fontSize: 12.5, color: '#767a83' }}>اسحب لإعادة الترتيب · حتى 8 عقارات</div></div><Btn h={34} r={10} px={12} fs={13} disabled={feat.length >= 8} onClick={() => setPicker(true)}>+ إضافة من العقارات</Btn></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feat.length === 0 && <div style={{ fontSize: 13, color: '#767a83' }}>لا توجد عقارات مميزة — القسم يختفي من الرئيسية</div>}
              {feat.map((id, i) => {
                const l = byId[id];
                if (!l) return null;
                return (
                  <div key={id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { moveFeat(drag, i); setDrag(null); }} className={drag === i ? 'dragging' : ''} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid #e7e7e3', borderRadius: 12, background: '#fff' }}>
                    <span style={{ color: '#9da0a7', cursor: 'grab' }}>⋮⋮</span>
                    {l.img ? <img src={l.img} alt="" style={{ width: 56, height: 42, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 56, height: 42, borderRadius: 8, background: '#f6f6f4' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83' }}>{l.id} · {l.areaName} · {l.priceText}</div></div>
                    <StatusPill label={l.statusLabel} color={l.statusColor} bg={l.statusBg} />
                    <button aria-label="إزالة" onClick={() => setFeat(feat.filter((x) => x !== id))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #d8d8d3', background: '#fff', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>المناطق في الرئيسية</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {C.areas.map((a) => { const idx = f.home_areas.indexOf(a.id); const on = idx >= 0; return (
                <button key={a.id} onClick={() => toggleArea(a.id)} style={{ height: 34, padding: '0 12px', borderRadius: 999, border: on ? 0 : '1px solid #d8d8d3', background: on ? '#1d1e22' : '#fff', color: on ? '#fff' : '#1d1e22', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>{on && <b style={{ fontSize: 11, opacity: 0.7 }}>{idx + 1}</b>}{a.short}</button>
              ); })}
            </div>
            <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 10 }}>أول 4 مناطق مختارة تظهر في قسم «وين تريد تسكن؟»</div>
          </Card>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>المشروع المميز في القائمة</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid #d8d8d3', borderRadius: 12 }}>
              {fp?.img && <img src={fp.img} alt="" style={{ width: 64, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
              <select className="sel" value={f.featured_project_id} onChange={set('featured_project_id')} style={{ flex: 1, border: 0, outline: 0, fontWeight: 600, fontSize: 14, background: 'transparent', height: 40 }}>
                <option value="">— بدون —</option>{C.projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.areaName} · {p.statusLabel}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 10 }}>يظهر أولاً في صفحة «مشاريع جديدة».</div>
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>نص الواجهة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="السطر العلوي"><input className="inp-sm" value={f.hero_kicker} onChange={set('hero_kicker')} /></Field>
              <Field label="العنوان (استخدم *نجمتين* للتلوين)"><textarea className="inp" rows={2} value={f.hero_title} onChange={set('hero_title')} style={{ fontSize: 14 }} /></Field>
              <Field label="شريط الإعلان (اختياري)"><input className="inp-sm" value={f.announcement} onChange={set('announcement')} placeholder="مثلاً: معرض العقارات 1–3 نوفمبر" /></Field>
            </div>
          </Card>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 4 }}>إعدادات العرض العامة</div><div style={{ fontSize: 12.5, color: '#767a83', marginBottom: 12 }}>تنطبق على كل صفحات العقارات والمشاريع</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>إظهار الوسيط المسؤول</div><div style={{ fontSize: 12.5, color: '#767a83', lineHeight: 1.5 }}>{f.show_agent ? 'يظهر اسم الوسيط وصورته ورقمه على صفحة كل عقار' : 'مخفي — يظهر «فريق ڤايرو» ورقم المكتب بدلاً عنه'}</div></div>
              <Toggle on={f.show_agent} label="إظهار الوسيط المسؤول" onChange={set('show_agent')} />
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e7e7e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>إظهار رقم العقار</div><div style={{ fontSize: 12.5, color: '#767a83' }}>VS-1001 وما شابه على البطاقات</div></div>
              <Toggle on={f.show_listing_id} label="إظهار رقم العقار" onChange={set('show_listing_id')} />
            </div>
          </Card>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>أقسام الرئيسية</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              {SECTIONS.map(([k, t]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{t}<Toggle small on={f.sections[k]} label={t} onChange={(v) => setF({ ...f, sections: { ...f.sections, [k]: v } })} /></div>)}
            </div>
          </Card>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>بيانات المكتب</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="هاتف المكتب"><input className="inp-sm" dir="ltr" value={f.office_phone} onChange={set('office_phone')} /></Field>
              <Field label="واتساب"><input className="inp-sm" dir="ltr" value={f.office_whatsapp} onChange={set('office_whatsapp')} /></Field>
              <Field label="العنوان"><input className="inp-sm" value={f.office_address} onChange={set('office_address')} /></Field>
              <Field label="سعر الصرف (دينار لكل دولار)"><input className="inp-sm" type="number" min="1" value={f.iqd_rate} onChange={set('iqd_rate')} /></Field>
            </div>
          </Card>
        </div>
      </div>
      {picker && <ListingPicker exclude={feat} onPick={(id) => { setFeat([...feat, id]); setPicker(false); }} onClose={() => setPicker(false)} />}
    </>
  );
}

function ListingPicker({ exclude, onPick, onClose }) {
  const C = useCms();
  const [qq, setQ] = useState('');
  const list = C.listings.filter((l) => (l.status === 'live' || l.status === 'reserved') && !exclude.includes(l.id) && (!qq || (l.id + l.title + l.areaName).includes(qq)));
  return (
    <Modal title="إضافة عقار مميز" onClose={onClose}>
      <input className="inp-sm" autoFocus placeholder="ابحث…" value={qq} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, maxHeight: 400, overflowY: 'auto' }}>
        {list.length === 0 && <div style={{ fontSize: 13, color: '#767a83' }}>لا توجد عقارات منشورة متاحة</div>}
        {list.map((l) => (
          <button key={l.id} className="h-row" onClick={() => onPick(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '1px solid #e7e7e3', borderRadius: 10, background: '#fff', cursor: 'pointer', textAlign: 'start' }}>
            {l.img && <img src={l.img} alt="" style={{ width: 48, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83' }}>{l.id} · {l.priceText}</div></div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
