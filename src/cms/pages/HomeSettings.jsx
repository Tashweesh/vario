import { useMemo, useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Field, Icon, Img, Modal, Toggle, useToast } from '../../components/ui.jsx';
import { Lmini, Osb, OsCard, PageTitle, StatusBadge, SwRow } from '../../staff/Shell.jsx';

const SECTIONS = [['types', 'أنواع العقارات'], ['featured', 'عقارات مميزة'], ['areas', 'المناطق والخريطة'], ['tools', 'الأدوات'], ['owners', 'الملاك والاستثمار']];
const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's homepage + site settings pages (os/web_pages.js /web/home, /web/settings).
export default function HomeSettings() {
  useDocTitle('الرئيسية وإعدادات الموقع');
  const C = useCms();
  const toast = useToast();
  const initFeatured = useMemo(() => C.listings.filter((l) => l.featured).sort((a, b) => (a.featured_rank ?? 99) - (b.featured_rank ?? 99)).map((l) => l.id), [C.listings]);
  const S0 = C.settings;
  const init = useMemo(() => ({
    hero_kicker: S0.hero_kicker || '', hero_title: S0.hero_title || '', announcement: S0.announcement || '', show_agent: S0.show_agent !== false, show_listing_id: S0.show_listing_id !== false,
    sections: { types: true, featured: true, areas: true, tools: true, owners: true, ...(S0.sections || {}) }, home_areas: S0.home_areas || [], featured_project_id: S0.featured_project_id || '',
    office_phone: S0.office_phone || '', office_whatsapp: S0.office_whatsapp || '', office_address: S0.office_address || '', office_hours: S0.office_hours || '', office_map_url: S0.office_map_url || '',
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
      await q(supabase.from('site_settings').update({ ...f, announcement: f.announcement.trim() || null, featured_project_id: f.featured_project_id || null }).eq('id', 1));
      if (JSON.stringify(feat) !== JSON.stringify(initFeatured)) await q(supabase.rpc('set_featured_order', { p_ids: feat }));
      await C.reload();
      toast('نُشرت التغييرات على الموقع');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const moveFeat = (from, to) => { if (from == null || from === to) return; const a = [...feat]; const [x] = a.splice(from, 1); a.splice(to, 0, x); setFeat(a); };
  const toggleArea = (id) => setF({ ...f, home_areas: f.home_areas.includes(id) ? f.home_areas.filter((x) => x !== id) : [...f.home_areas, id] });
  const fp = C.P[f.featured_project_id];
  const publishBtn = <Btn kind="red" size="sm" disabled={busy || !dirty} onClick={publish}><Icon name="globe" size={15} />نشر التغييرات</Btn>;

  return (
    <>
      <PageTitle sub="أول صفحة يشوفها الزبون — العنوان والأقسام والمميز، وبيانات المكتب" action={<>{dirty && <Osb tone="amber">تغييرات غير منشورة</Osb>}<a href="/" target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />شوف الرئيسية</a>{publishBtn}</>}>الصفحة الرئيسية وإعدادات الموقع</PageTitle>
      <div className="os-cols" style={{ '--side': '400px' }}>
        <div className="grid gap-5 min-w-0">
          <OsCard title="عقارات مميزة · «مختارات للبيع / للإيجار»" sub="اسحب لإعادة الترتيب · حتى 8 عقارات" extra={<span className="text-[12px] text-ink-500 num">{feat.length}/8</span>}>
            {feat.length === 0 ? <p className="text-[13px] text-ink-500">ماكو اختيار — القسم يختفي من الرئيسية.</p> : (
              <ol className="divide-y hair">
                {feat.map((id, i) => {
                  const l = byId[id];
                  if (!l) return null;
                  return (
                    <li key={id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { moveFeat(drag, i); setDrag(null); }} className={`flex items-center gap-2 sm:gap-3 py-2 ${drag === i ? 'dragging' : ''}`}>
                      <span className="w-6 text-center num text-[12px] text-ink-400 flex-none">{i + 1}</span>
                      <span className="text-ink-300 cursor-grab flex-none" aria-hidden="true"><Icon name="drag" size={16} /></span>
                      <div className="min-w-0 flex-1"><Lmini img={l.img} title={l.title} id={l.id} sub={`${l.areaName} · ${l.priceText}`} /></div>
                      <StatusBadge status={l.status} label={l.statusLabel} />
                      <button type="button" className="icon-btn !w-8 !h-8 text-ink-400 hover:text-red" aria-label="إزالة" onClick={() => setFeat(feat.filter((x) => x !== id))}><Icon name="close" size={15} /></button>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3"><Btn size="sm" disabled={feat.length >= 8} onClick={() => setPicker(true)}><Icon name="plus" size={15} />إضافة من العقارات</Btn></div>
            <p className="text-[11.5px] text-ink-500 mt-2">المختارة تجي أول بالصفحة الرئيسية، والمباع أو المخفي ينترك تلقائياً.</p>
          </OsCard>
          <OsCard title="المناطق في الرئيسية" sub="أول 4 مناطق مختارة تظهر في قسم «وين تريد تسكن؟»">
            <div className="flex flex-wrap gap-1.5">
              {C.areas.map((a) => { const idx = f.home_areas.indexOf(a.id); const on = idx >= 0; return (
                <button type="button" key={a.id} onClick={() => toggleArea(a.id)} className={`chip chip-sm ${on ? 'on' : ''}`} aria-pressed={on}>{on && <b className="num opacity-70">{idx + 1}</b>}{a.short}</button>
              ); })}
            </div>
          </OsCard>
          <OsCard title="المشروع المميز · صفحة المشاريع" sub="يظهر أولاً في صفحة «مشاريع جديدة»">
            <div className="flex items-center gap-3 p-2 rounded-[12px] border hair">
              {fp?.img && <Img src={fp.img} className="w-16 h-12 rounded-[8px] flex-none" />}
              <select className={`${F} flex-1 min-w-0`} value={f.featured_project_id} onChange={set('featured_project_id')}>
                <option value="">— بدون —</option>{C.projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.areaName} · {p.statusLabel}</option>)}
              </select>
            </div>
          </OsCard>
          <div className="sticky bottom-[72px] lg:bottom-4 z-20 os-card shadow-pop p-3 flex flex-wrap items-center gap-2">
            <span className="flex gap-2">{publishBtn}</span>
            <span className="text-[12.5px] text-ink-600 flex items-center gap-2 min-w-0 flex-1"><span className={`w-2 h-2 rounded-full flex-none ${dirty ? 'bg-warn' : 'bg-ok'}`} /><span>{dirty ? 'تغييرات مو منشورة — الموقع بعده يعرض النسخة المنشورة' : 'منشور · الموقع محدّث'}</span></span>
          </div>
        </div>
        <aside className="os-aside grid gap-5 min-w-0">
          <OsCard title="الواجهة" sub="نص أعلى الصفحة الرئيسية">
            <div className="grid gap-4">
              <Field label="العنوان الصغير"><input className={F} value={f.hero_kicker} onChange={set('hero_kicker')} /></Field>
              <Field label="العنوان الرئيسي" hint="حط الكلمات بين *نجمتين* حتى تطلع باللون الأحمر."><textarea className="field !text-[13.5px] !min-h-[76px]" rows={2} value={f.hero_title} onChange={set('hero_title')} /></Field>
              <Field label="شريط الإعلان (اختياري)" hint="يظهر بشريط الموقع لحد ما ينشال."><input className={F} value={f.announcement} onChange={set('announcement')} placeholder="مثلاً: معرض العقارات 1–3 نوفمبر" /></Field>
            </div>
          </OsCard>
          <OsCard title="إعدادات العرض العامة" sub="تنطبق على كل صفحات العقارات والمشاريع">
            <div className="divide-y hair -my-1">
              <SwRow label="إظهار الوسيط المسؤول" sub={f.show_agent ? 'يظهر اسم الوسيط وصورته ورقمه على صفحة كل عقار' : 'مخفي — يظهر «فريق ڤايرو» ورقم المكتب بدلاً عنه'}><Toggle on={f.show_agent} label="إظهار الوسيط المسؤول" onChange={set('show_agent')} /></SwRow>
              <SwRow label="إظهار رقم العقار" sub="VS-1001 وما شابه على البطاقات"><Toggle on={f.show_listing_id} label="إظهار رقم العقار" onChange={set('show_listing_id')} /></SwRow>
            </div>
          </OsCard>
          <OsCard title="أقسام الصفحة الرئيسية" sub="اخفي قسم لحملة أو وقت تحديث محتواه. الترتيب يبقى مثل التصميم.">
            <div className="divide-y hair -my-1">
              {SECTIONS.map(([k, t]) => <SwRow key={k} label={t}><Toggle small on={f.sections[k]} label={t} onChange={(v) => setF({ ...f, sections: { ...f.sections, [k]: v } })} /></SwRow>)}
            </div>
          </OsCard>
          <OsCard title="بيانات المكتب" sub="التواصل، الدوام، العملة">
            <div className="grid gap-4">
              <Field label="هاتف المكتب"><input className={`${F} mono`} dir="ltr" value={f.office_phone} onChange={set('office_phone')} /></Field>
              <Field label="واتساب"><input className={`${F} mono`} dir="ltr" value={f.office_whatsapp} onChange={set('office_whatsapp')} /></Field>
              <Field label="العنوان"><input className={F} value={f.office_address} onChange={set('office_address')} /></Field>
              <Field label="ساعات الدوام" hint="تظهر في صفحة التواصل وصفحات العقارات"><input className={F} value={f.office_hours} onChange={set('office_hours')} placeholder="السبت – الخميس · 9:00 – 19:00" /></Field>
              <Field label="رابط الموقع على خرائط Google"><input className={`${F} mono`} dir="ltr" value={f.office_map_url} onChange={set('office_map_url')} placeholder="https://maps.google.com/?q=…" /></Field>
            </div>
          </OsCard>
        </aside>
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
    <Modal title="إضافة عقار مميز" sub="العقارات المنشورة أو المحجوزة فقط" onClose={onClose}>
      <div className="relative"><span className="absolute top-1/2 -translate-y-1/2 start-3 text-ink-400"><Icon name="search" size={16} /></span><input className="field !h-10 !text-[13.5px] !ps-9" autoFocus placeholder="ابحث برقم العقار أو الاسم…" value={qq} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grid gap-1.5 mt-3 max-h-[380px] overflow-y-auto">
        {list.length === 0 && <p className="text-[13px] text-ink-500 py-4 text-center">لا توجد عقارات منشورة متاحة</p>}
        {list.map((l) => (
          <button type="button" key={l.id} onClick={() => onPick(l.id)} className="flex items-center gap-2.5 p-2 rounded-[12px] border hair hover:border-ink text-start min-w-0">
            <Lmini img={l.img} title={l.title} id={l.id} sub={`${l.areaName} · ${l.priceText}`} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
