import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { usd } from '../../lib/format.js';
import { Btn, Field, Icon, Img, Modal, useToast } from '../../components/ui.jsx';
import { ERBIL, LocationPicker } from '../../components/MapView.jsx';
import { Lmini, OsEmpty, OsTable, PageTitle } from '../../staff/Shell.jsx';

const DNA = { family: 'للعوائل', convenience: 'قرب الخدمات', green: 'مساحات خضراء', dining: 'مطاعم ومقاهي', growth: 'نمو', quiet: 'هدوء' };
const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's areas list (os/web.js /web/areas): table with price guides + editor sheet.
export default function Areas() {
  useDocTitle('المناطق');
  const C = useCms();
  const [edit, setEdit] = useState(null);
  const live = C.listings.filter((l) => l.status === 'live' || l.status === 'reserved');
  return (
    <>
      <PageTitle sub={`${C.areas.length} منطقة بالموقع — الأسماء والأوصاف ومؤشرات الأسعار و«هوية المنطقة»`} action={<><a href="/areas" target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />المناطق بالموقع</a><Btn kind="red" size="sm" onClick={() => setEdit({})}><Icon name="plus" size={15} />منطقة</Btn></>}>المناطق</PageTitle>
      {C.areas.length === 0 ? <OsEmpty icon="compass" title="لا توجد مناطق بعد">أضف أول منطقة حتى تربط بيها العقارات.</OsEmpty> : (
        <OsTable head={['المنطقة', { label: 'مؤشر السعر', cls: 'num' }, { label: 'ظاهر بيع / إيجار', cls: 'num' }, '']}>
          {C.areas.map((a) => (
            <tr key={a.id} className="cursor-pointer" onClick={() => setEdit(a)}>
              <td><div className="min-w-[220px]"><Lmini img={a.img} title={a.name} id={a.id} sub={a.vibe} /></div></td>
              <td className="num whitespace-nowrap"><span dir="ltr">{usd(a.ppm)}</span><span className="text-ink-400">/م²</span><span className="block text-[11.5px] text-ink-500"><span dir="ltr">${(+a.rent || 0).toFixed(1)}</span>/م²/شهر</span></td>
              <td className="num whitespace-nowrap"><b>{live.filter((l) => l.area_id === a.id && l.deal === 'sale').length}</b> <span className="text-ink-300">/</span> <b>{live.filter((l) => l.area_id === a.id && l.deal === 'rent').length}</b></td>
              <td className="text-end"><button type="button" className="btn btn-line btn-sm !h-8" onClick={(e) => { e.stopPropagation(); setEdit(a); }}>تعديل</button></td>
            </tr>
          ))}
        </OsTable>
      )}
      {edit && <AreaModal a={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function AreaModal({ a, onClose }) {
  const C = useCms();
  const toast = useToast();
  const isNew = !a.id;
  const [f, setF] = useState({ id: '', name: '', short: '', vibe: '', description: '', ppm: 0, rent: 0, img: '', lat: ERBIL.lat, lng: ERBIL.lng, tags: [], dna: { family: 5, convenience: 5, green: 5, dining: 5, growth: 5, quiet: 5 }, ...a, tagsText: (a.tags || []).join('، ') });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const used = !isNew && (C.listings.some((l) => l.area_id === a.id) || C.projects.some((p) => p.area_id === a.id));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = { name: f.name.trim(), short: f.short.trim() || f.name.trim(), vibe: f.vibe, description: f.description, rent: +f.rent || 0, img: f.img || null, lat: +f.lat, lng: +f.lng, tags: f.tagsText.split(/[،,]/).map((t) => t.trim()).filter(Boolean), dna: Object.fromEntries(Object.keys(DNA).map((k) => [k, +f.dna[k]])) };
      if (isNew) {
        const id = f.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!id) throw new Error('أدخل معرّف المنطقة بالإنجليزي (مثلاً dream-city)');
        await q(supabase.from('areas').insert({ ...row, id, sort: C.areas.length }));
      } else await q(supabase.from('areas').update(row).eq('id', a.id));
      await C.reload(); toast('تم الحفظ'); onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`حذف ${a.name}؟`)) return;
    try { await q(supabase.from('areas').delete().eq('id', a.id)); await C.reload(); toast('حُذفت'); onClose(); } catch (err) { toast(err.message, 'error'); }
  };
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const up = await uploadMedia(file, 'areas'); setF((s) => ({ ...s, img: up.url })); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title={isNew ? 'منطقة جديدة' : `تعديل ${a.name}`} sub="تظهر في مستكشف المناطق والفلاتر وصفحة المنطقة" onClose={onClose} width={720}>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم"><input className={F} required value={f.name} onChange={set('name')} /></Field>
        <Field label="الاسم المختصر · الخرائط والفلاتر"><input className={F} value={f.short} onChange={set('short')} /></Field>
        {isNew && <Field label="المعرّف (إنجليزي، للرابط)"><input className={`${F} mono`} dir="ltr" required pattern="[a-z0-9-]+" value={f.id} onChange={set('id')} placeholder="dream-city" /></Field>}
        <Field label="وصف بسطر" className={isNew ? '' : 'sm:col-span-2'}><input className={F} value={f.vibe} onChange={set('vibe')} /></Field>
        <Field label="نص دليل المنطقة" className="sm:col-span-2"><textarea className="field !text-[13.5px]" rows={3} value={f.description} onChange={set('description')} /></Field>
        <Field label="سعر الطلب (دولار / م²)" hint="يُحسب تلقائياً من متوسط سعر المتر للعقارات المعروضة للبيع في المنطقة"><div className={`${F} num flex items-center bg-paper-2 text-ink-600`} dir="ltr">{usd(f.ppm)}<span className="text-ink-400 ms-1">/m²</span></div></Field>
        <Field label="الإيجار (دولار / م² / شهر)"><input className={`${F} num`} type="number" min="0" step="0.1" dir="ltr" value={f.rent} onChange={set('rent')} /></Field>
        <Field label="الوسوم (افصل بفاصلة)" className="sm:col-span-2"><input className={F} value={f.tagsText} onChange={set('tagsText')} placeholder="عوائل، مدارس، هادئ" /></Field>
        <Field label="الصورة" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {f.img && <Img src={f.img} className="w-24 h-16 rounded-[10px] flex-none" />}
            <input className={`${F} mono flex-1 min-w-0`} dir="ltr" value={f.img || ''} onChange={set('img')} placeholder="https://…" />
            <label className="btn btn-line btn-sm !h-10 flex-none cursor-pointer"><Icon name="upload" size={15} />رفع<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>
          </div>
        </Field>
        <div className="sm:col-span-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wide mt-1">هوية المنطقة (0–10)</div>
        {Object.entries(DNA).map(([k, t]) => (
          <Field key={k} label={<span className="flex justify-between"><span>{t}</span><span className="num text-ink-500">{f.dna[k]}</span></span>}><input type="range" min="0" max="10" className="w-full" value={f.dna[k]} onChange={(e) => setF({ ...f, dna: { ...f.dna, [k]: +e.target.value } })} /></Field>
        ))}
        <Field label="مركز المنطقة على الخريطة" className="sm:col-span-2">
          <LocationPicker value={{ lat: f.lat, lng: f.lng }} onChange={(p) => p && setF((s) => ({ ...s, lat: p.lat, lng: p.lng }))} height={220} hint="العقارات والمشاريع التي بدون موقع دقيق تظهر عند هذه النقطة" />
        </Field>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-3 border-t hair">
          {!isNew ? <Btn size="sm" className="text-red" disabled={used} title={used ? 'مرتبطة بعقارات أو مشاريع' : undefined} onClick={del}><Icon name="trash" size={15} />حذف</Btn> : <span />}
          <Btn type="submit" kind="red" size="sm" disabled={busy}><Icon name="globe" size={15} />حفظ</Btn>
        </div>
      </form>
    </Modal>
  );
}
