import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrm, ListingSelect, ViewingModal } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { SCORES, SOURCES, STAGES, ago, dayLabel, hhmm } from '../../lib/format.js';
import { Btn, Card, Empty, Modal, Field, Spinner, StatusPill, useToast } from '../../components/ui.jsx';
import { waLink } from '../../site/parts.jsx';

const KIND = { note: ['ملاحظة', '#c8102e'], call: ['مكالمة', '#1d1e22'], task: ['مهمة', '#b26a00'], web: ['طلب من الموقع', '#0f8a4f'], system: ['تحديث', '#d8d8d3'] };
const sel = { height: 30, padding: '0 10px', border: '1px solid #d8d8d3', borderRadius: 8, fontSize: 13, background: '#fff', outline: 0 };

export default function ContactDetail() {
  const { id } = useParams();
  const R = useCrm();
  const A = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const c = R.CI[id];
  useDocTitle(c?.name);
  const [acts, setActs] = useState(null);
  const [kind, setKind] = useState('note');
  const [body, setBody] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [linkId, setLinkId] = useState('');

  const loadActs = () => supabase.from('activities').select('*').eq('contact_id', id).order('created_at', { ascending: false }).then(({ data }) => setActs(data || []));
  useEffect(() => { setActs(null); loadActs(); }, [id]);
  if (!c) return <Empty>جهة الاتصال غير موجودة <Btn style={{ marginInlineStart: 8 }} onClick={() => nav('/crm/contacts')}>رجوع</Btn></Empty>;

  const log = (b) => supabase.from('activities').insert({ contact_id: c.id, kind: 'system', body: b, agent_id: A.me.agent_id });
  const update = async (patch, note) => {
    try { await q(supabase.from('contacts').update(patch).eq('id', c.id)); if (note) await log(note); await R.reload(); loadActs(); } catch (e) { toast(e.message, 'error'); }
  };
  const add = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (kind === 'task' && !due) return toast('حدد موعد المهمة', 'error');
    setBusy(true);
    try {
      await q(supabase.from('activities').insert({ contact_id: c.id, kind, body: body.trim(), due_at: kind === 'task' ? new Date(due).toISOString() : null, agent_id: A.me.agent_id }));
      if (kind !== 'task' && c.stage === 'new') await q(supabase.from('contacts').update({ stage: 'contacted' }).eq('id', c.id));
      if (kind === 'note') await q(supabase.from('contacts').update({ note: body.trim() }).eq('id', c.id));
      setBody(''); setDue('');
      await R.reload(); loadActs();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const toggleTask = async (a) => {
    setActs((s) => s.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    const { error } = await supabase.from('activities').update({ done: !a.done }).eq('id', a.id);
    if (error) { toast(error.message, 'error'); loadActs(); }
  };
  const link = async () => {
    if (!linkId) return;
    try { await q(supabase.from('contact_listings').insert({ contact_id: c.id, listing_id: linkId })); setLinkId(''); await R.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const unlink = async (lid) => {
    try { await q(supabase.from('contact_listings').delete().eq('contact_id', c.id).eq('listing_id', lid)); await R.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const del = async () => {
    if (!window.confirm(`حذف ${c.name} وكل نشاطه ومعايناته؟`)) return;
    try { await q(supabase.from('contacts').delete().eq('id', c.id)); await R.reload(); nav('/crm/contacts', { replace: true }); toast('حُذف'); } catch (e) { toast(e.message, 'error'); }
  };
  const callNow = async () => { await supabase.from('activities').insert({ contact_id: c.id, kind: 'call', body: 'مكالمة صادرة', agent_id: A.me.agent_id }); if (c.stage === 'new') await supabase.from('contacts').update({ stage: 'contacted' }).eq('id', c.id); R.reload(); loadActs(); };
  const nextTask = (acts || []).filter((a) => a.kind === 'task' && !a.done).sort((a, b) => (a.due_at || '').localeCompare(b.due_at || ''))[0];
  const upcoming = R.viewings.filter((v) => v.contact_id === c.id && v.at > new Date(Date.now() - 864e5)).slice(0, 3);
  const score = SCORES[c.score];
  const phoneDigits = (c.phone || '').replace(/[^\d+]/g, '');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => nav(-1)} aria-label="رجوع" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', cursor: 'pointer', fontSize: 16 }}>→</button>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>{c.name[0]}</div>
        <div><h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{c.name}</h1><div style={{ fontSize: 13, color: '#767a83' }} dir="ltr">{c.phone}</div></div>
        <StatusPill label={c.stageLabel} color="#1d1e22" bg="#f1f1ef" h={26} fs={12} />
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={waLink(c.phone, `مرحبا ${c.name}، معك ${A.me.name} من ڤايرو`)} target="_blank" rel="noreferrer"><Btn kind="green">واتساب</Btn></a>
          <a href={`tel:${phoneDigits}`} onClick={callNow}><Btn>اتصال</Btn></a>
          <Btn onClick={() => setModal('edit')}>تعديل</Btn>
          <Btn kind="dark" onClick={() => setModal('viewing')}>+ معاينة</Btn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridColumn: 'span 2', minWidth: 0 }}>
          <Card><div style={{ fontWeight: 600, marginBottom: 14 }}>المرحلة</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STAGES.map(([s, t]) => (
                <button key={s} onClick={() => s !== c.stage && update({ stage: s, score: s === 'closed' ? 'won' : c.score === 'won' ? 'warm' : c.score }, `نُقل إلى مرحلة «${t}»`)} style={{ flex: 1, minWidth: 80, height: 38, borderRadius: 10, border: s === c.stage ? 0 : '1px solid #d8d8d3', background: s === c.stage ? '#1d1e22' : '#fff', color: s === c.stage ? '#fff' : '#1d1e22', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: '#767a83', marginTop: 10 }}>المرحلة الحالية: <b style={{ color: '#1d1e22' }}>{c.stageLabel}</b> · اضغط لتغييرها</div>
          </Card>
          <Card>
            <form onSubmit={add}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 600 }}>النشاط</div>
                <div style={{ display: 'flex', gap: 4 }}>{['note', 'call', 'task'].map((k) => <button type="button" key={k} onClick={() => setKind(k)} style={{ height: 30, padding: '0 10px', borderRadius: 8, background: kind === k ? '#f6f6f4' : 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: kind === k ? '#1d1e22' : '#767a83', cursor: 'pointer' }}>{KIND[k][0]}</button>)}</div>
              </div>
              <textarea className="inp" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'call' ? 'ملخص المكالمة…' : kind === 'task' ? 'شنو المطلوب؟' : 'اكتب ملاحظة…'} style={{ fontSize: 14, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {kind === 'task' && <input className="inp-sm" type="datetime-local" aria-label="موعد المهمة" value={due} onChange={(e) => setDue(e.target.value)} style={{ width: 220, height: 36 }} />}
                <Btn type="submit" kind="dark" h={36} r={10} px={14} fs={13} disabled={busy || !body.trim()}>إضافة</Btn>
              </div>
            </form>
            <div style={{ marginTop: 20 }}>
              {acts === null ? <Spinner pad={20} /> : acts.length === 0 ? <div style={{ fontSize: 13, color: '#767a83' }}>لا يوجد نشاط بعد</div> : acts.map((a, i) => (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: i === 0 ? '#c8102e' : KIND[a.kind][1] === '#1d1e22' ? '#d8d8d3' : KIND[a.kind][1], marginTop: 4, opacity: a.kind === 'system' ? 0.7 : 1 }} />
                    {i < acts.length - 1 && <span style={{ flex: 1, width: 2, background: '#e7e7e3', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: 16, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {a.kind === 'task' && <input type="checkbox" checked={a.done} onChange={() => toggleTask(a)} aria-label="تمت" style={{ width: 16, height: 16, accentColor: '#0f8a4f' }} />}
                      <b>{KIND[a.kind][0]}</b> · {R.G[a.agent_id]?.name || (a.kind === 'web' ? c.source : 'النظام')} · {ago(a.created_at)}
                      {a.due_at && <span style={{ color: a.done ? '#0f8a4f' : new Date(a.due_at) < new Date() ? '#c8102e' : '#b26a00' }}>· {a.done ? 'تمت' : `${dayLabel(new Date(a.due_at))} ${hhmm(new Date(a.due_at))}`}</span>}
                    </div>
                    <div style={{ fontSize: 13.5, color: '#3f424a', marginTop: 4, lineHeight: 1.6, whiteSpace: 'pre-line', textDecoration: a.kind === 'task' && a.done ? 'line-through' : 'none' }}>{a.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>العقارات المرتبطة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.links.length === 0 && <div style={{ fontSize: 13, color: '#767a83' }}>لا يوجد عقار مرتبط</div>}
              {c.links.map((l) => (
                <div key={l.id} style={{ display: 'flex', gap: 10, padding: 8, border: '1px solid #e7e7e3', borderRadius: 12, alignItems: 'center' }}>
                  <a href={`/property/${l.id}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0, color: '#1d1e22' }}>
                    {l.img && <img src={l.img} alt="" style={{ width: 64, height: 50, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />}
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83' }}>{l.id} · {l.priceText}</div></div>
                  </a>
                  <button aria-label="إلغاء الربط" onClick={() => unlink(l.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e7e7e3', background: '#fff', cursor: 'pointer', fontSize: 11, flex: 'none' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <ListingSelect value={linkId} onChange={setLinkId} exclude={c.links.map((l) => l.id)} />
              <Btn h={40} r={10} px={12} fs={12.5} disabled={!linkId} onClick={link}>+ ربط</Btn>
            </div>
          </Card>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>التفاصيل</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
              <Row k="الميزانية"><b dir="ltr">{c.budgetText}</b></Row>
              <Row k="يريد"><select className="sel" style={sel} value={c.deal || ''} onChange={(e) => update({ deal: e.target.value || null })}><option value="sale">شراء</option><option value="rent">إيجار</option><option value="">غير محدد</option></select></Row>
              <Row k="المصدر"><select className="sel" style={sel} value={c.source} onChange={(e) => update({ source: e.target.value })}>{[...new Set([...SOURCES, c.source])].map((s) => <option key={s}>{s}</option>)}</select></Row>
              <Row k="الوسيط"><select className="sel" style={sel} value={c.agent_id || ''} onChange={(e) => update({ agent_id: e.target.value || null }, `خُصّص إلى ${R.G[e.target.value]?.name || 'لا أحد'}`)}><option value="">غير مخصّص</option>{R.agents.filter((a) => a.active || a.id === c.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Row>
              <Row k="الحرارة"><select className="sel" style={{ ...sel, background: score[2], color: score[1], border: 0, fontWeight: 600 }} value={c.score} onChange={(e) => update({ score: e.target.value })}>{Object.entries(SCORES).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></Row>
              <Row k="أُضيف"><span>{ago(c.created_at)}</span></Row>
            </div>
          </Card>
          <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>المهمة التالية</div>
            {nextTask ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
                <input type="checkbox" checked={false} onChange={() => toggleTask(nextTask)} aria-label="تمت" style={{ width: 18, height: 18, marginTop: 2, accentColor: '#0f8a4f' }} />
                <div><div style={{ fontWeight: 600 }}>{nextTask.body}</div>{nextTask.due_at && <div style={{ color: new Date(nextTask.due_at) < new Date() ? '#c8102e' : '#767a83', fontSize: 12.5 }}>{dayLabel(new Date(nextTask.due_at))} · {hhmm(new Date(nextTask.due_at))}</div>}</div>
              </div>
            ) : <div style={{ fontSize: 13, color: '#767a83' }}>لا توجد مهام مفتوحة — أضف مهمة من «النشاط»</div>}
          </Card>
          {upcoming.length > 0 && (
            <Card pad={18}><div style={{ fontWeight: 600, marginBottom: 12 }}>المعاينات</div>
              {upcoming.map((v) => <button key={v.id} onClick={() => setModal(v)} style={{ display: 'block', width: '100%', textAlign: 'start', border: 0, borderInlineStart: '3px solid #c8102e', background: '#f6f6f4', borderRadius: 10, padding: 10, cursor: 'pointer', marginBottom: 6, fontSize: 13 }}><b>{dayLabel(v.at)} · {hhmm(v.at)}</b> · {v.statusLabel}<div style={{ color: '#767a83', fontSize: 12 }}>{v.listing?.title || '—'}</div></button>)}
            </Card>
          )}
          {A.isAdmin && <Btn h={36} style={{ color: '#c8102e', borderColor: '#f5c6cf' }} onClick={del}>حذف جهة الاتصال</Btn>}
        </div>
      </div>
      {modal === 'viewing' && <ViewingModal preset={{ contact_id: c.id }} onClose={() => { setModal(null); loadActs(); }} />}
      {modal && modal.id && <ViewingModal v={modal} onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditContact c={c} onClose={() => setModal(null)} onSaved={loadActs} />}
    </>
  );
}

const Row = ({ k, children }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ color: '#767a83' }}>{k}</span>{children}</div>;

function EditContact({ c, onClose, onSaved }) {
  const R = useCrm();
  const toast = useToast();
  const [f, setF] = useState({ name: c.name, phone: c.phone || '', email: c.email || '', budget: c.budget ?? '' });
  const save = async (e) => {
    e.preventDefault();
    try { await q(supabase.from('contacts').update({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, budget: f.budget === '' ? null : +f.budget }).eq('id', c.id)); await R.reload(); onSaved(); onClose(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal title="تعديل جهة الاتصال" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الاسم"><input className="inp-sm" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الهاتف"><input className="inp-sm" dir="ltr" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="البريد"><input className="inp-sm" type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="الميزانية ($)"><input className="inp-sm" type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}><Btn type="submit" kind="red">حفظ</Btn></div>
      </form>
    </Modal>
  );
}
