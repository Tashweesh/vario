import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { ROLE_AR } from '../../lib/format.js';
import { Btn, Field, Icon, Modal, Toggle, useToast } from '../../components/ui.jsx';
import { Av, Osb, OsCard, OsTable, PageTitle, SwRow } from '../../staff/Shell.jsx';

const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's staff directory (os/people.js): directory table + roles card + invite sheet.
export default function Users() {
  useDocTitle('المستخدمون والصلاحيات');
  const C = useCms();
  const A = useAuth();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const staff = Object.fromEntries(C.staff.map((s) => [s.agent_id, s]));
  const setRole = async (agentId, role) => {
    try { await q(supabase.from('staff').update({ role }).eq('agent_id', agentId)); await C.reload(); toast('تم تغيير الدور'); if (agentId === A.me.agent_id) A.refreshMe(); } catch (e) { toast(e.message, 'error'); }
  };
  const active = C.agents.filter((g) => g.active).length;
  return (
    <>
      <PageTitle sub={`${active} فعّال · ${C.agents.length - active} موقوف · ${C.staff.filter((s) => !s.user_id).length} بانتظار التفعيل`} action={<Btn kind="red" size="sm" onClick={() => setEdit({})}><Icon name="plus" size={15} />دعوة مستخدم</Btn>}>المستخدمون والصلاحيات</PageTitle>
      <div className="os-cols">
        <div className="min-w-0">
          <OsTable head={['الاسم', 'الهاتف', 'الدور', { label: 'عقارات', cls: 'num' }, { label: 'عملاء', cls: 'num' }, '']}>
            {C.agents.map((g) => {
              const s = staff[g.id];
              return (
                <tr key={g.id} style={{ opacity: g.active ? 1 : 0.5 }}>
                  <td><span className="inline-flex items-center gap-2.5 min-w-[200px]"><Av src={g.img} name={g.name} size={32} /><span className="min-w-0"><span className="flex items-center gap-1.5 text-[13px] font-semibold"><span className="clamp-1">{g.name}</span>{!g.active && <Osb tone="gray">موقوف</Osb>}{s && !s.user_id && <Osb tone="amber">بانتظار التفعيل</Osb>}</span><span className="block text-[11.5px] text-ink-500 clamp-1">{g.title || '—'}{s ? '' : ' · بدون حساب'}</span></span></span></td>
                  <td><span className="mono text-[12.5px]" dir="ltr">{g.phone || '—'}</span></td>
                  <td>{s ? (
                    <select className="field !h-8 !text-[12px] !font-semibold !rounded-[8px] !w-auto !ps-2.5 !pe-7" aria-label="الدور" value={s.role} onChange={(e) => setRole(g.id, e.target.value)}>
                      {Object.entries(ROLE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </select>
                  ) : <span className="text-[12.5px] text-ink-400">—</span>}</td>
                  <td className="num">{C.listings.filter((l) => l.agent_id === g.id).length}</td>
                  <td className="num">{C.contacts.filter((c) => c.agent_id === g.id).length}</td>
                  <td className="text-end"><button type="button" className="btn btn-line btn-sm !h-8" onClick={() => setEdit({ ...g, staff: s })}>تعديل</button></td>
                </tr>
              );
            })}
          </OsTable>
        </div>
        <aside className="os-aside grid gap-5 min-w-0">
          <OsCard title="الأدوار" sub="شنو يگدر يسوي كل دور">
            <div className="grid gap-3 text-[13px]">
              {[['admin', 'كل شي، بما فيه المستخدمون والصفحة الرئيسية', 'ink'], ['editor', 'إنشاء وتعديل ونشر العقارات والمشاريع والمناطق', 'green'], ['agent', 'تعديل عقاراته فقط، حفظ كمسودة بدون نشر، وصول كامل للـ CRM', 'amber']].map(([k, d, tone]) => (
                <div key={k} className="flex items-start gap-2.5"><Osb tone={tone} className="flex-none mt-0.5">{ROLE_AR[k]}</Osb><span className="text-ink-600 leading-relaxed">{d}</span></div>
              ))}
              <div className="pt-3 border-t hair text-ink-500 leading-relaxed">بعد الدعوة، المستخدم يفتح <b dir="ltr" className="mono">/login</b> ويختار «فعّل حسابك» بنفس البريد.</div>
            </div>
          </OsCard>
        </aside>
      </div>
      {edit && <UserModal u={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function UserModal({ u, onClose }) {
  const C = useCms();
  const A = useAuth();
  const toast = useToast();
  const isNew = !u.id;
  const [f, setF] = useState({ name: u.name || '', title: u.title || '', phone: u.phone || '', img: u.img || '', active: u.active !== false, email: u.staff?.email || '', role: u.staff?.role || 'agent' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const prof = { name: f.name.trim(), title: f.title.trim(), phone: f.phone || null, img: f.img || null, active: f.active };
      let id = u.id;
      if (isNew) id = (await q(supabase.from('agents').insert(prof).select('id').single())).id;
      else await q(supabase.from('agents').update(prof).eq('id', id));
      const email = f.email.trim().toLowerCase();
      if (email) {
        if (u.staff) await q(supabase.from('staff').update({ email, role: f.role }).eq('agent_id', id));
        else await q(supabase.from('staff').insert({ agent_id: id, email, role: f.role }));
      }
      await C.reload();
      if (id === A.me.agent_id) A.refreshMe();
      toast(isNew ? 'أُرسلت الدعوة — يفعّل حسابه من صفحة الدخول' : 'تم الحفظ');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      await C.reload();
    } finally { setBusy(false); }
  };
  const upload = async (file) => {
    if (!file) return;
    try { const up = await uploadMedia(file, 'team'); setF((s) => ({ ...s, img: up.url })); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal title={isNew ? 'دعوة مستخدم' : `تعديل ${u.name}`} sub={isNew ? 'يستلم الدعوة على بريده ويفعّل حسابه من صفحة الدخول' : u.staff?.email} onClose={onClose} width={560}>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم"><input className={F} required value={f.name} onChange={set('name')} /></Field>
        <Field label="المسمّى"><input className={F} value={f.title} onChange={set('title')} placeholder="مستشار مبيعات" /></Field>
        <Field label="البريد (لتسجيل الدخول)"><input className={`${F} mono`} type="email" dir="ltr" required={isNew} value={f.email} onChange={set('email')} /></Field>
        <Field label="الهاتف"><input className={`${F} mono`} dir="ltr" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="الدور"><select className={F} value={f.role} onChange={set('role')}>{Object.entries(ROLE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
        <Field label="الصورة">
          <div className="flex items-center gap-2.5">
            <Av src={f.img} name={f.name} size={40} />
            <span className="btn btn-line btn-sm cursor-pointer" role="button"><Icon name="upload" size={15} />رفع صورة<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></span>
          </div>
        </Field>
        {!isNew && (
          <SwRow className="sm:col-span-2 border-t hair pt-3" label="الحساب مفعّل" sub="الإيقاف يمنع الدخول ويخفيه من الموقع، وتبقى عقاراته وعملاؤه">
            <Toggle on={f.active} label="الحساب مفعّل" onChange={set('active')} disabled={u.id === A.me.agent_id} />
          </SwRow>
        )}
        <div className="sm:col-span-2 flex justify-end pt-3 border-t hair"><Btn type="submit" kind="red" size="sm" disabled={busy}><Icon name={isNew ? 'mail' : 'check'} size={15} />{isNew ? 'إرسال الدعوة' : 'حفظ'}</Btn></div>
      </form>
    </Modal>
  );
}
