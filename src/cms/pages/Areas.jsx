import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { usd } from '../../lib/format.js';
import { Btn, Field, Modal, useToast } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, editBtn, thead, trow } from '../../staff/Shell.jsx';

const COLS = '56px minmax(160px,1.4fr) 1.4fr 120px 110px 110px 70px';
const DNA = { family: 'للعوائل', convenience: 'قرب الخدمات', green: 'مساحات خضراء', dining: 'مطاعم ومقاهي', growth: 'نمو', quiet: 'هدوء' };

export default function Areas() {
  useDocTitle('المناطق');
  const C = useCms();
  const [edit, setEdit] = useState(null);
  const live = C.listings.filter((l) => l.status === 'live' || l.status === 'reserved');
  return (
    <>
      <PageTitle sub="الوصف والصورة ومؤشرات «هوية المنطقة» تظهر في صفحات المناطق" action={<Btn onClick={() => setEdit({})}>+ منطقة</Btn>}>المناطق</PageTitle>
      <div style={TABLE}><ScrollX min={880}>
        <div style={thead(COLS)}><span /><span>المنطقة</span><span>الوصف المختصر</span><span>سعر المتر</span><span>للبيع</span><span>للإيجار</span><span /></div>
        {C.areas.map((a) => (
          <div key={a.id} className="h-row" style={trow(COLS)}>
            {a.img ? <img src={a.img} alt="" style={{ width: 56, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 56, height: 40, borderRadius: 8, background: '#f6f6f4' }} />}
            <div style={{ fontWeight: 600 }}>{a.name}</div>
            <span style={{ color: '#5a5e68', fontSize: 13 }}>{a.vibe}</span>
            <span style={{ fontWeight: 600 }} dir="ltr">{usd(a.ppm)}</span>
            <span>{live.filter((l) => l.area_id === a.id && l.deal === 'sale').length}</span>
            <span>{live.filter((l) => l.area_id === a.id && l.deal === 'rent').length}</span>
            <button style={editBtn} onClick={() => setEdit(a)}>تعديل</button>
          </div>
        ))}
      </ScrollX></div>
      {edit && <AreaModal a={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function AreaModal({ a, onClose }) {
  const C = useCms();
  const toast = useToast();
  const isNew = !a.id;
  const [f, setF] = useState({ id: '', name: '', short: '', vibe: '', description: '', ppm: 0, rent: 0, img: '', x: 50, y: 50, tags: [], dna: { family: 5, convenience: 5, green: 5, dining: 5, growth: 5, quiet: 5 }, ...a, tagsText: (a.tags || []).join('، ') });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const used = !isNew && (C.listings.some((l) => l.area_id === a.id) || C.projects.some((p) => p.area_id === a.id));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = { name: f.name.trim(), short: f.short.trim() || f.name.trim(), vibe: f.vibe, description: f.description, ppm: +f.ppm || 0, rent: +f.rent || 0, img: f.img || null, x: Math.min(100, Math.max(0, +f.x)), y: Math.min(100, Math.max(0, +f.y)), tags: f.tagsText.split(/[،,]/).map((t) => t.trim()).filter(Boolean), dna: Object.fromEntries(Object.keys(DNA).map((k) => [k, +f.dna[k]])) };
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
    <Modal title={isNew ? 'منطقة جديدة' : `تعديل ${a.name}`} onClose={onClose} width={720}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الاسم"><input className="inp-sm" required value={f.name} onChange={set('name')} /></Field>
        <Field label="الاسم المختصر"><input className="inp-sm" value={f.short} onChange={set('short')} /></Field>
        {isNew && <Field label="المعرّف (إنجليزي، للرابط)"><input className="inp-sm" dir="ltr" required pattern="[a-z0-9-]+" value={f.id} onChange={set('id')} placeholder="dream-city" /></Field>}
        <Field label="الوصف المختصر" style={isNew ? {} : { gridColumn: '1/-1' }}><input className="inp-sm" value={f.vibe} onChange={set('vibe')} /></Field>
        <Field label="الوصف" style={{ gridColumn: '1/-1' }}><textarea className="inp" rows={3} value={f.description} onChange={set('description')} style={{ fontSize: 14 }} /></Field>
        <Field label="متوسط سعر المتر للبيع ($)"><input className="inp-sm" type="number" min="0" value={f.ppm} onChange={set('ppm')} /></Field>
        <Field label="متوسط الإيجار ($ / م² شهرياً)"><input className="inp-sm" type="number" min="0" step="0.1" value={f.rent} onChange={set('rent')} /></Field>
        <Field label="الوسوم (افصل بفاصلة)" style={{ gridColumn: '1/-1' }}><input className="inp-sm" value={f.tagsText} onChange={set('tagsText')} placeholder="عوائل، مدارس، هادئ" /></Field>
        <Field label="الصورة" style={{ gridColumn: '1/-1' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {f.img && <img src={f.img} alt="" style={{ width: 96, height: 60, borderRadius: 8, objectFit: 'cover' }} />}
            <input className="inp-sm" dir="ltr" value={f.img || ''} onChange={set('img')} placeholder="https://…" />
            <label style={{ height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #d8d8d3', display: 'grid', placeItems: 'center', cursor: 'pointer', whiteSpace: 'nowrap', color: '#1d1e22' }}>رفع<input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} /></label>
          </div>
        </Field>
        <div style={{ gridColumn: '1/-1', fontSize: 12.5, fontWeight: 600, color: '#5a5e68', marginTop: 4 }}>هوية المنطقة (0–10)</div>
        {Object.entries(DNA).map(([k, t]) => (
          <Field key={k} label={`${t}: ${f.dna[k]}`}><input type="range" min="0" max="10" value={f.dna[k]} onChange={(e) => setF({ ...f, dna: { ...f.dna, [k]: +e.target.value } })} /></Field>
        ))}
        <Field label="موقعها على الخريطة — أفقي %" hint="0 = يمين، 100 = يسار"><input className="inp-sm" type="number" min="0" max="100" value={f.x} onChange={set('x')} /></Field>
        <Field label="عمودي %" hint="0 = أعلى، 100 = أسفل"><input className="inp-sm" type="number" min="0" max="100" value={f.y} onChange={set('y')} /></Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {!isNew ? <Btn style={{ color: '#c8102e' }} disabled={used} title={used ? 'مرتبطة بعقارات أو مشاريع' : undefined} onClick={del}>حذف</Btn> : <span />}
          <Btn type="submit" kind="red" disabled={busy}>حفظ</Btn>
        </div>
      </form>
    </Modal>
  );
}
