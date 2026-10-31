import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle, useSearchQuery } from '../../lib/hooks.js';
import { Btn, Field, Icon, Modal, useToast } from '../../components/ui.jsx';
import { OsEmpty, OsTable, PageTitle, SearchChip } from '../../staff/Shell.jsx';

const EMPTY = { name: '', mono: '', founded: '', focus: '', delivered: 0, units: 0, description: '', phone: '', email: '' };
const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's developers directory (os/web.js /web/developers): dense table + editor sheet.
export default function Developers() {
  useDocTitle('المطوّرون');
  const C = useCms();
  const [edit, setEdit] = useState(null);
  const S = useSearchQuery();
  const list = C.devs.filter((d) => S.hit(d.name, d.mono, d.focus, d.phone, d.email));
  return (
    <>
      <PageTitle sub="ملفات المطوّرين بالموقع — عدّل الملف وشوف مشاريعهم" action={<><a href="/developers" target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />المطوّرون بالموقع</a><Btn kind="red" size="sm" onClick={() => setEdit({ ...EMPTY })}><Icon name="plus" size={15} />مطوّر جديد</Btn></>}>المطوّرون</PageTitle>
      <SearchChip S={S} count={list.length} unit="مطوّر" />
      {C.devs.length === 0 ? <OsEmpty icon="briefcase" title="لا يوجد مطوّرون بعد">أضف أول مطوّر حتى تربطه بالمشاريع.</OsEmpty>
      : list.length === 0 ? <OsEmpty icon="briefcase" title="ماكو مطوّرون يطابقون" action={<Btn size="sm" onClick={S.clear}>مسح البحث</Btn>}>جرّب اسماً أو تخصصاً آخر.</OsEmpty> : (
        <OsTable head={['المطوّر', 'التخصص', { label: 'مشاريع', cls: 'num' }, 'الهاتف', 'البريد', '']}>
          {list.map((d) => (
            <tr key={d.id} className="cursor-pointer" onClick={() => setEdit(d)}>
              <td><span className="flex items-center gap-2.5 min-w-[200px]"><span className="w-9 h-9 rounded-[10px] bg-paper-2 border hair inline-flex items-center justify-center text-[11px] font-bold tracking-wider flex-none" dir="ltr">{d.mono}</span><span className="min-w-0"><span className="block text-[13px] font-semibold clamp-1">{d.name}</span><span className="block text-[11.5px] text-ink-500 clamp-1">{d.founded ? `منذ ${d.founded} · ` : ''}{d.delivered} مشروع مسلّم</span></span></span></td>
              <td className="text-[13px]">{d.focus}</td>
              <td className="num">{C.projects.filter((p) => p.developer_id === d.id).length}</td>
              <td><span className="mono text-[12.5px]" dir="ltr">{d.phone || '—'}</span></td>
              <td><span className="mono text-[12.5px] text-ink-500" dir="ltr">{d.email || '—'}</span></td>
              <td className="text-end"><button type="button" className="btn btn-line btn-sm !h-8" onClick={(e) => { e.stopPropagation(); setEdit(d); }}>تعديل</button></td>
            </tr>
          ))}
        </OsTable>
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
    <Modal title={d.id ? `تعديل ${d.name}` : 'مطوّر جديد'} sub={d.id ? 'يظهر في دليل المطوّرين وصفحات المشاريع' : undefined} onClose={onClose} width={620}>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم"><input className={F} required value={f.name} onChange={set('name')} /></Field>
        <Field label="الأحرف المختصرة (شعار)"><input className={`${F} mono`} dir="ltr" maxLength={3} value={f.mono} onChange={set('mono')} placeholder="LD" /></Field>
        <Field label="التخصص"><input className={F} value={f.focus} onChange={set('focus')} placeholder="أبراج سكنية" /></Field>
        <Field label="سنة التأسيس"><input className={`${F} num`} type="number" min="1950" max="2100" dir="ltr" value={f.founded} onChange={set('founded')} /></Field>
        <Field label="مشاريع مسلّمة"><input className={`${F} num`} type="number" min="0" dir="ltr" value={f.delivered} onChange={set('delivered')} /></Field>
        <Field label="عدد الوحدات"><input className={`${F} num`} type="number" min="0" dir="ltr" value={f.units} onChange={set('units')} /></Field>
        <Field label="الهاتف"><input className={`${F} mono`} dir="ltr" value={f.phone || ''} onChange={set('phone')} /></Field>
        <Field label="البريد"><input className={`${F} mono`} type="email" dir="ltr" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label="نبذة" className="sm:col-span-2"><textarea className="field !text-[13.5px]" rows={3} value={f.description} onChange={set('description')} /></Field>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2 justify-between pt-3 border-t hair">
          {d.id ? <Btn size="sm" className="text-red" disabled={used} title={used ? 'مرتبط بمشاريع' : undefined} onClick={del}><Icon name="trash" size={15} />حذف</Btn> : <span />}
          <Btn type="submit" kind="red" size="sm" disabled={busy}><Icon name="globe" size={15} />حفظ</Btn>
        </div>
        {used && <p className="sm:col-span-2 text-[12px] text-ink-500">لا يمكن حذف مطوّر مرتبط بمشاريع.</p>}
      </form>
    </Modal>
  );
}
