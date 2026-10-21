import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Empty, Field, Modal, useToast } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, editBtn, thead, trow } from '../../staff/Shell.jsx';

const COLS = '44px minmax(180px,1.5fr) 1fr 90px 1fr 1fr 70px';
const EMPTY = { name: '', mono: '', founded: '', focus: '', delivered: 0, units: 0, description: '', phone: '', email: '' };

export default function Developers() {
  useDocTitle('المطوّرون');
  const C = useCms();
  const [edit, setEdit] = useState(null);
  return (
    <>
      <PageTitle action={<Btn onClick={() => setEdit({ ...EMPTY })}>+ مطوّر جديد</Btn>}>المطوّرون</PageTitle>
      {C.devs.length === 0 ? <Empty>لا يوجد مطوّرون بعد</Empty> : (
        <div style={TABLE}><ScrollX min={900}>
          <div style={thead(COLS)}><span /><span>المطوّر</span><span>التخصص</span><span>مشاريع</span><span>الهاتف</span><span>البريد</span><span /></div>
          {C.devs.map((d) => (
            <div key={d.id} className="h-row" style={trow(COLS)}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }} dir="ltr">{d.mono}</span>
              <div><div style={{ fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: 12, color: '#767a83' }}>{d.founded ? `منذ ${d.founded} · ` : ''}{d.delivered} مشروع مسلّم</div></div>
              <span>{d.focus}</span><span>{C.projects.filter((p) => p.developer_id === d.id).length}</span>
              <span dir="ltr" style={{ textAlign: 'right' }}>{d.phone}</span><span style={{ color: '#5a5e68', overflow: 'hidden', textOverflow: 'ellipsis' }} dir="ltr">{d.email}</span>
              <button style={editBtn} onClick={() => setEdit(d)}>تعديل</button>
            </div>
          ))}
        </ScrollX></div>
      )}
      {edit && <DevModal d={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function DevModal({ d, onClose }) {
  const C = useCms();
  const toast = useToast();
  const [f, setF] = useState({ ...EMPTY, ...d, founded: d.founded ?? '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const used = d.id && C.projects.some((p) => p.developer_id === d.id);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const row = { name: f.name.trim(), mono: (f.mono || f.name.slice(0, 2)).toUpperCase().slice(0, 3), founded: f.founded ? +f.founded : null, focus: f.focus, delivered: +f.delivered || 0, units: +f.units || 0, description: f.description, phone: f.phone || null, email: f.email || null };
      if (d.id) await q(supabase.from('developers').update(row).eq('id', d.id)); else await q(supabase.from('developers').insert(row));
      await C.reload(); toast('تم الحفظ'); onClose();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`حذف ${d.name}؟`)) return;
    try { await q(supabase.from('developers').delete().eq('id', d.id)); await C.reload(); toast('حُذف'); onClose(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal title={d.id ? `تعديل ${d.name}` : 'مطوّر جديد'} onClose={onClose} width={620}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الاسم"><input className="inp-sm" required value={f.name} onChange={set('name')} /></Field>
        <Field label="الأحرف المختصرة (شعار)"><input className="inp-sm" dir="ltr" maxLength={3} value={f.mono} onChange={set('mono')} placeholder="LD" /></Field>
        <Field label="التخصص"><input className="inp-sm" value={f.focus} onChange={set('focus')} placeholder="أبراج سكنية" /></Field>
        <Field label="سنة التأسيس"><input className="inp-sm" type="number" min="1950" max="2100" value={f.founded} onChange={set('founded')} /></Field>
        <Field label="مشاريع مسلّمة"><input className="inp-sm" type="number" min="0" value={f.delivered} onChange={set('delivered')} /></Field>
        <Field label="عدد الوحدات"><input className="inp-sm" type="number" min="0" value={f.units} onChange={set('units')} /></Field>
        <Field label="الهاتف"><input className="inp-sm" dir="ltr" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label="البريد"><input className="inp-sm" type="email" dir="ltr" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="نبذة" style={{ gridColumn: '1/-1' }}><textarea className="inp" rows={3} value={f.description} onChange={set('description')} style={{ fontSize: 14 }} /></Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
          {d.id ? <Btn style={{ color: '#c8102e' }} disabled={used} title={used ? 'مرتبط بمشاريع' : undefined} onClick={del}>حذف</Btn> : <span />}
          <Btn type="submit" kind="red" disabled={busy}>حفظ</Btn>
        </div>
        {used && <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#767a83' }}>لا يمكن حذف مطوّر مرتبط بمشاريع.</div>}
      </form>
    </Modal>
  );
}
