import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrm, ListingSelect, ViewingModal, Av, Badge, OsEmpty, KV, Lmini, FIELD, STAGE_TONE, SCORE_TONE, VIEW_TONE, DEAL_AR } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase, q } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { SCORES, SOURCES, STAGES, ago, dayLabel, hhmm } from '../../lib/format.js';
import { Btn, Icon, Modal, Field, Spinner, useToast } from '../../components/ui.jsx';
import { Crumbs, waLink } from '../../site/parts.jsx';

// Activity kinds → label + timeline icon (reference os/crm.js timeline)
const KIND = { note: ['ملاحظة', 'note'], call: ['مكالمة', 'phone'], task: ['مهمة', 'check'], web: ['طلب من الموقع', 'globe'], system: ['تحديث', 'info'] };
// Inline selects inside the details card (reference lead 360 header selects)
const INLINE = 'bg-transparent text-[13.5px] font-medium outline-none text-end cursor-pointer max-w-full';
const Sec = ({ title, extra, children }) => <div className="os-card p-4 sm:p-5"><div className="flex items-center justify-between gap-2 mb-3"><h2 className="font-semibold">{title}</h2>{extra}</div>{children}</div>;

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
  if (!c) return <OsEmpty icon="search" title="جهة الاتصال غير موجودة" text={id} action={<Btn kind="dark" size="sm" onClick={() => nav('/crm/contacts')}>رجوع لجهات الاتصال</Btn>} />;

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
  const ci = STAGES.findIndex(([s]) => s === c.stage);
  const moveTo = (s, t) => s !== c.stage && update({ stage: s, score: s === 'closed' ? 'won' : c.score === 'won' ? 'warm' : c.score }, `نُقل إلى مرحلة «${t}»`);

  return (
    <>
      <div className="mb-3"><Crumbs items={[['جهات الاتصال', '/crm/contacts'], [c.name]]} /></div>
      {/* header card (reference contact 360 + lead 360 stage stepper) */}
      <div className="os-card p-4 sm:p-5 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <Av name={c.name} seed={c.id} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge tone={STAGE_TONE[c.stage]}>{c.stageLabel}</Badge>
              {score && <Badge tone={SCORE_TONE[c.score]}>{score[0]}</Badge>}
              {c.deal && <Badge tone="gray">{DEAL_AR[c.deal]}</Badge>}
              <span className="text-[12px] text-ink-400">{c.source}</span>
            </div>
            <h1 className="t-h2 text-[24px] sm:text-[28px] leading-tight">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[13px] text-ink-600">
              <span className="mono text-[12.5px]" dir="ltr">{c.phone || '—'}</span>
              {c.email && <span dir="ltr">{c.email}</span>}
              <span className="inline-flex items-center gap-1.5"><Av name={c.agent?.name} img={c.agent?.img} seed={c.agent?.id} size={18} /><span className={c.agent ? '' : 'text-red'}>{c.agentName}</span></span>
              <span className="text-ink-500">أُضيف {ago(c.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <a href={`tel:${phoneDigits}`} onClick={callNow} className="btn btn-ink btn-sm"><Icon name="phone" size={16} />اتصال</a>
            <a href={waLink(c.phone, `مرحبا ${c.name}، معك ${A.me.name} من ڤايرو`)} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="wa" size={16} />واتساب</a>
            <Btn size="sm" onClick={() => setModal('edit')}><Icon name="edit" size={16} />تعديل</Btn>
            <Btn kind="red" size="sm" onClick={() => setModal('viewing')}><Icon name="cal" size={16} />حدد معاينة</Btn>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto no-sb -mx-1 px-1">
          <ol className="flex items-center gap-1 min-w-max">
            {STAGES.map(([s, t], i) => {
              const done = i < ci, cur = i === ci;
              return (
                <span key={s} className="contents">
                  <li><button type="button" onClick={() => moveTo(s, t)} className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${cur ? (s === 'closed' ? 'bg-ok text-white' : 'bg-red text-white') : done ? 'bg-ink text-white hover:bg-ink-800' : 'bg-paper-2 text-ink-500 hover:bg-paper-3'}`}>{done && <Icon name="check" size={12} />}{t}</button></li>
                  {i < STAGES.length - 1 && <li className="w-3 h-px bg-line-2" />}
                </span>
              );
            })}
          </ol>
        </div>
        <div className="text-[12px] text-ink-500 mt-2">المرحلة الحالية: <b className="text-ink">{c.stageLabel}</b> · اضغط على مرحلة لنقل العميل إليها</div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 grid gap-4 min-w-0">
          {/* activity: note / call / task form + timeline */}
          <Sec title="النشاط" extra={
            <div className="seg">{['note', 'call', 'task'].map((k) => <button type="button" key={k} className={`!h-8 !px-3 !text-[12.5px] ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}><Icon name={KIND[k][1]} size={14} />{KIND[k][0]}</button>)}</div>
          }>
            <form onSubmit={add}>
              <textarea className="field !min-h-[90px] !text-[13.5px]" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === 'call' ? 'ملخص المكالمة…' : kind === 'task' ? 'شنو المطلوب؟' : 'اكتب ملاحظة…'} />
              <div className="flex flex-wrap gap-2 items-center mt-2.5">
                {kind === 'task' && <input className={`${FIELD} !w-auto`} type="datetime-local" aria-label="موعد المهمة" value={due} onChange={(e) => setDue(e.target.value)} />}
                <Btn type="submit" kind="dark" size="sm" className="ms-auto" disabled={busy || !body.trim()}><Icon name="plus" size={15} />إضافة</Btn>
              </div>
            </form>
            <div className="mt-5 pt-4 border-t hair">
              {acts === null ? <Spinner pad={20} /> : acts.length === 0 ? <div className="lbl py-2">لا يوجد نشاط بعد</div> : (
                <ol className="relative">
                  {acts.map((a, i) => {
                    const k = KIND[a.kind] || KIND.system;
                    const late = a.due_at && !a.done && new Date(a.due_at) < new Date();
                    return (
                      <li key={a.id} className={`flex gap-3 relative ${i < acts.length - 1 ? 'pb-4' : ''}`}>
                        {i < acts.length - 1 && <span className="absolute top-8 bottom-0 start-[15px] w-px bg-line" />}
                        <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center flex-none relative ${i === 0 || a.kind === 'web' ? 'bg-red-50 text-red' : a.kind === 'task' && a.done ? 'bg-paper-2 text-ok' : 'bg-paper-2 text-ink-500'}`}><Icon name={k[1]} size={15} /></span>
                        <div className="min-w-0 flex-1 pt-1">
                          <div className="text-[13.5px] leading-snug flex items-start gap-2">
                            {a.kind === 'task' && <input type="checkbox" checked={!!a.done} onChange={() => toggleTask(a)} aria-label="تمت" className="w-4 h-4 mt-0.5 accent-[#C8102E] flex-none" />}
                            <span className={`min-w-0 ${a.kind === 'task' && a.done ? 'line-through text-ink-400' : ''}`} style={{ whiteSpace: 'pre-line' }}><b>{k[0]}</b> · {a.body}</span>
                          </div>
                          <div className="text-[11.5px] text-ink-400 mt-0.5 flex flex-wrap gap-x-2">
                            <span>{ago(a.created_at)} · {R.G[a.agent_id]?.name || (a.kind === 'web' ? c.source : 'النظام')}</span>
                            {a.due_at && <span className={a.done ? 'text-ok' : late ? 'text-red font-medium' : 'text-amber'}>{a.done ? 'تمت' : `موعدها ${dayLabel(new Date(a.due_at))} ${hhmm(new Date(a.due_at))}`}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Sec>
        </div>

        <div className="grid gap-4 min-w-0">
          {/* linked listings */}
          <Sec title="العقارات المرتبطة" extra={<span className="os-cnt">{c.links.length}</span>}>
            {c.links.length === 0 && <div className="lbl mb-2">لا يوجد عقار مرتبط</div>}
            {c.links.length > 0 && <div className="grid gap-2.5 mb-3">
              {c.links.map((l) => (
                <div key={l.id} className="flex items-center gap-2 justify-between">
                  <a href={`/property/${l.id}`} target="_blank" rel="noreferrer" className="flex-1 min-w-0 hover:text-red"><Lmini l={l} className="flex-1" /></a>
                  <span className="num text-[12.5px] font-semibold whitespace-nowrap" dir="ltr">{l.priceText}</span>
                  <button type="button" aria-label="إلغاء الربط" title="إلغاء الربط" onClick={() => unlink(l.id)} className="icon-btn !w-7 !h-7 border hair text-ink-500 hover:text-red"><Icon name="close" size={13} /></button>
                </div>
              ))}
            </div>}
            <div className="flex gap-2">
              <ListingSelect value={linkId} onChange={setLinkId} exclude={c.links.map((l) => l.id)} className={`${FIELD} !h-10 flex-1 min-w-0`} />
              <Btn size="sm" className="!h-10" disabled={!linkId} onClick={link}><Icon name="plus" size={15} />ربط</Btn>
            </div>
          </Sec>
          {/* details */}
          <Sec title="التفاصيل">
            <KV k="الميزانية"><span className="num" dir="ltr">{c.budgetText}</span></KV>
            <KV k="يريد"><select className={INLINE} value={c.deal || ''} onChange={(e) => update({ deal: e.target.value || null })}><option value="sale">شراء</option><option value="rent">إيجار</option><option value="">غير محدد</option></select></KV>
            <KV k="المصدر"><select className={INLINE} value={c.source} onChange={(e) => update({ source: e.target.value })}>{[...new Set([...SOURCES, c.source])].map((s) => <option key={s}>{s}</option>)}</select></KV>
            <KV k="الوسيط"><select className={`${INLINE} ${c.agent ? '' : 'text-red'}`} value={c.agent_id || ''} onChange={(e) => update({ agent_id: e.target.value || null }, `خُصّص إلى ${R.G[e.target.value]?.name || 'لا أحد'}`)}><option value="">غير مخصّص</option>{R.agents.filter((a) => a.active || a.id === c.agent_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></KV>
            <KV k="الحرارة"><select className={`osb osb-${SCORE_TONE[c.score] || 'gray'} cursor-pointer outline-none`} style={{ border: 0 }} value={c.score} onChange={(e) => update({ score: e.target.value })}>{Object.entries(SCORES).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></KV>
            <KV k="أُضيف">{ago(c.created_at)}</KV>
          </Sec>
          {/* next task */}
          <Sec title="المهمة التالية">
            {nextTask ? (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={false} onChange={() => toggleTask(nextTask)} aria-label="تمت" className="w-4 h-4 mt-0.5 accent-[#C8102E]" />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">{nextTask.body}</span>{nextTask.due_at && <span className={`block text-[11.5px] ${new Date(nextTask.due_at) < new Date() ? 'text-red' : 'text-ink-500'}`}>{dayLabel(new Date(nextTask.due_at))} · {hhmm(new Date(nextTask.due_at))}</span>}</span>
              </label>
            ) : <div className="lbl">لا توجد مهام مفتوحة — أضف مهمة من «النشاط»</div>}
          </Sec>
          {/* upcoming viewings */}
          {upcoming.length > 0 && (
            <Sec title="المعاينات">
              <div className="grid gap-1">
                {upcoming.map((v) => (
                  <button key={v.id} type="button" onClick={() => setModal(v)} className="flex items-center gap-2 text-start p-2 -mx-2 rounded-[10px] hover:bg-paper-2">
                    <Badge tone={VIEW_TONE[v.status]}>{v.statusLabel}</Badge>
                    <span className="text-[13px] min-w-0"><span className="block">{dayLabel(v.at)} · <span className="num">{hhmm(v.at)}</span></span><span className="block text-[11.5px] text-ink-500 clamp-1">{v.listing?.title || '—'}</span></span>
                  </button>
                ))}
              </div>
            </Sec>
          )}
          {A.isAdmin && <Btn size="sm" className="text-red" onClick={del}><Icon name="trash" size={15} />حذف جهة الاتصال</Btn>}
        </div>
      </div>
      {modal === 'viewing' && <ViewingModal preset={{ contact_id: c.id }} onClose={() => { setModal(null); loadActs(); }} />}
      {modal && modal.id && <ViewingModal v={modal} onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditContact c={c} onClose={() => setModal(null)} onSaved={loadActs} />}
    </>
  );
}

function EditContact({ c, onClose, onSaved }) {
  const R = useCrm();
  const toast = useToast();
  const [f, setF] = useState({ name: c.name, phone: c.phone || '', email: c.email || '', budget: c.budget ?? '' });
  const save = async (e) => {
    e.preventDefault();
    try { await q(supabase.from('contacts').update({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || null, budget: f.budget === '' ? null : +f.budget }).eq('id', c.id)); await R.reload(); onSaved(); onClose(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Modal title="تعديل جهة الاتصال" sub={c.name} onClose={onClose}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <Field label="الاسم"><input className={FIELD} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="الهاتف"><input className={`${FIELD} mono text-end`} dir="ltr" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="البريد"><input className={`${FIELD} text-end`} type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="الميزانية ($)"><input className={`${FIELD} num`} type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
        <div className="col-span-2 flex justify-end pt-1"><Btn type="submit" kind="red" size="sm"><Icon name="check" size={16} />حفظ</Btn></div>
      </form>
    </Modal>
  );
}
