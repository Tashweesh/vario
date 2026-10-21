import { useState } from 'react';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { ROLE_AR } from '../../lib/format.js';
import { Btn, Card, Field, Modal, Toggle, useToast } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, editBtn, thead, trow } from '../../staff/Shell.jsx';

const COLS = '40px minmax(160px,1.4fr) 1fr 140px 90px 90px 70px';

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
  return (
    <>
      <PageTitle action={<Btn onClick={() => setEdit({})}>+ دعوة مستخدم</Btn>}>المستخدمون والصلاحيات</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...TABLE, gridColumn: 'span 2' }}><ScrollX min={780}>
          <div style={thead(COLS)}><span /><span>الاسم</span><span>الهاتف</span><span>الدور</span><span>عقارات</span><span>عملاء</span><span /></div>
          {C.agents.map((g) => {
            const s = staff[g.id];
            return (
              <div key={g.id} className="h-row" style={{ ...trow(COLS), opacity: g.active ? 1 : 0.5 }}>
                {g.img ? <img src={g.img} alt="" style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover' }} /> : <span style={{ width: 36, height: 36, borderRadius: 999, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{g.name[0]}</span>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{g.name}{!g.active && ' · موقوف'}</div>
                  <div style={{ fontSize: 12, color: '#767a83', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}{s ? (s.user_id ? '' : ' · بانتظار التفعيل') : ' · بدون حساب'}</div>
                </div>
                <span dir="ltr" style={{ textAlign: 'right' }}>{g.phone}</span>
                {s ? (
                  <select className="sel" aria-label="الدور" value={s.role} onChange={(e) => setRole(g.id, e.target.value)} style={{ height: 34, border: '1px solid #d8d8d3', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff', outline: 0 }}>
                    {Object.entries(ROLE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                  </select>
                ) : <span style={{ fontSize: 12.5, color: '#767a83' }}>—</span>}
                <span>{C.listings.filter((l) => l.agent_id === g.id).length}</span>
                <span>{C.contacts.filter((c) => c.agent_id === g.id).length}</span>
                <button style={editBtn} onClick={() => setEdit({ ...g, staff: s })}>تعديل</button>
              </div>
            );
          })}
        </ScrollX></div>
        <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>الأدوار</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div><div style={{ fontWeight: 600 }}>مدير النظام</div><div style={{ color: '#767a83', lineHeight: 1.6 }}>كل شي، بما فيه المستخدمون والصفحة الرئيسية</div></div>
            <div><div style={{ fontWeight: 600 }}>محرر محتوى</div><div style={{ color: '#767a83', lineHeight: 1.6 }}>إنشاء وتعديل ونشر العقارات والمشاريع والمناطق</div></div>
            <div><div style={{ fontWeight: 600 }}>وسيط</div><div style={{ color: '#767a83', lineHeight: 1.6 }}>تعديل عقاراته فقط، حفظ كمسودة بدون نشر، وصول كامل للـ CRM</div></div>
            <div style={{ paddingTop: 10, borderTop: '1px solid #e7e7e3', color: '#767a83', lineHeight: 1.6 }}>بعد الدعوة، المستخدم يفتح <b dir="ltr">/login</b> ويختار «فعّل حسابك» بنفس البريد.</div>
          </div>
        </Card>
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
    <Modal title={isNew ? 'دعوة مستخدم' : `تعديل ${u.name}`} onClose={onClose} width={560}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الاسم"><input className="inp-sm" required value={f.name} onChange={set('name')} /></Field>
        <Field label="المسمّى"><input className="inp-sm" value={f.title} onChange={set('title')} placeholder="مستشار مبيعات" /></Field>
        <Field label="البريد (لتسجيل الدخول)"><input className="inp-sm" type="email" dir="ltr" required={isNew} value={f.email} onChange={set('email')} /></Field>
        <Field label="الهاتف"><input className="inp-sm" dir="ltr" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="الدور"><select className="inp-sm sel" value={f.role} onChange={set('role')}>{Object.entries(ROLE_AR).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
        <Field label="الصورة">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {f.img && <img src={f.img} alt="" style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover' }} />}
            <label style={{ height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #d8d8d3', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#1d1e22' }}>رفع صورة<input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} /></label>
          </div>
        </Field>
        {!isNew && (
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #e7e7e3' }}>
            <div><div style={{ fontWeight: 600, fontSize: 14, color: '#1d1e22' }}>الحساب مفعّل</div><div style={{ fontSize: 12.5, color: '#767a83' }}>الإيقاف يمنع الدخول ويخفيه من الموقع، وتبقى عقاراته وعملاؤه</div></div>
            <Toggle on={f.active} label="الحساب مفعّل" onChange={set('active')} disabled={u.id === A.me.agent_id} />
          </div>
        )}
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}><Btn type="submit" kind="red" disabled={busy}>{isNew ? 'إرسال الدعوة' : 'حفظ'}</Btn></div>
      </form>
    </Modal>
  );
}
