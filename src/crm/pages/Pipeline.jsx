import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm, ViewingModal, Av, Badge, DEAL_AR, OsPage } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { STAGES, usd } from '../../lib/format.js';
import { Chip, Icon, Img, useToast } from '../../components/ui.jsx';

// Column dot colour per stage (reference os/crm.js pipeline board)
const DOT = { new: 'bg-red', closed: 'bg-ok' };

export default function Pipeline() {
  useDocTitle('المسار');
  const R = useCrm();
  const A = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [mine, setMine] = useState(false);
  const [deal, setDeal] = useState('');
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [local, setLocal] = useState({}); // optimistic stage moves
  const [viewingFor, setViewingFor] = useState(null); // contact id → schedule-a-viewing dialog

  const list = R.contacts.filter((c) => (!mine || c.agent_id === A.me.agent_id) && (!deal || c.deal === deal)).map((c) => (local[c.id] ? { ...c, stage: local[c.id] } : c));
  const drop = async (stage) => {
    const c = R.CI[drag];
    setOver(null); setDrag(null);
    if (!c || c.stage === stage) return;
    setLocal((s) => ({ ...s, [c.id]: stage }));
    const { error } = await supabase.from('contacts').update({ stage, score: stage === 'closed' ? 'won' : c.score === 'won' ? 'warm' : c.score }).eq('id', c.id);
    if (!error) await supabase.from('activities').insert({ contact_id: c.id, kind: 'system', body: `نُقل إلى مرحلة «${STAGES.find((s) => s[0] === stage)[1]}»`, agent_id: A.me.agent_id });
    if (error) toast(error.message, 'error');
    // dropping on «معاينة» also puts the visit on the calendar; the card stays in the pipeline
    if (!error && stage === 'viewing') setViewingFor(c.id);
    await R.reload();
    setLocal((s) => { const n = { ...s }; delete n[c.id]; return n; });
  };
  const openViewing = (e, id) => { e.stopPropagation(); setViewingFor(id); };

  // Column paging: two arrows above the board replace the horizontal scrollbar. Each click moves one column.
  // RTL scrollLeft runs 0 → negative, so compare on the absolute value.
  const board = useRef(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  const measure = () => { const el = board.current; if (!el) return; const x = Math.abs(el.scrollLeft); setEnds({ start: x < 2, end: x + el.clientWidth >= el.scrollWidth - 2 }); };
  useEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, [list.length]);
  const page = (dir) => { const el = board.current; if (!el) return; const col = el.querySelector('[data-col]'); const step = (col ? col.offsetWidth : 288) + 12; el.scrollBy({ left: dir * step, behavior: 'smooth' }); };

  return (
    <>
      <OsPage title="المسار" sub="اسحب البطاقة بين الأعمدة لتغيير المرحلة · إسقاطها في «معاينة» يفتح جدولة الموعد" actions={<>
        <Chip small on={!mine} onClick={() => setMine(false)}>كل الفريق</Chip>
        <Chip small on={mine} onClick={() => setMine(true)}>عملائي فقط</Chip>
        <span className="w-px h-5 bg-line mx-1 hidden sm:block" />
        <Chip small on={deal === 'sale'} onClick={() => setDeal(deal === 'sale' ? '' : 'sale')}>شراء</Chip>
        <Chip small on={deal === 'rent'} onClick={() => setDeal(deal === 'rent' ? '' : 'rent')}>إيجار</Chip>
      </>} />
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="icon-btn bg-white border hair" aria-label="الأعمدة السابقة" title="الأعمدة السابقة" disabled={ends.start} style={{ opacity: ends.start ? 0.35 : 1 }} onClick={() => page(1)}><Icon name="chev" size={18} /></button>
        <span className="lbl">{STAGES.length} مراحل</span>
        <button type="button" className="icon-btn bg-white border hair" aria-label="الأعمدة التالية" title="الأعمدة التالية" disabled={ends.end} style={{ opacity: ends.end ? 0.35 : 1 }} onClick={() => page(-1)}><Icon name="chev-l" size={18} /></button>
      </div>
      <div ref={board} onScroll={measure} className="flex gap-3 overflow-x-auto no-sb snap-x pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 items-start">
        {STAGES.map(([id, label]) => {
          const items = list.filter((c) => c.stage === id);
          const value = items.reduce((s, c) => s + (c.deal === 'sale' && c.budget ? c.budget : 0), 0);
          return (
            <section key={id} data-col={id} onDragOver={(e) => { e.preventDefault(); setOver(id); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); drop(id); }}
              className={`flex-none w-[84vw] sm:w-[288px] snap-start flex flex-col rounded-[16px] bg-paper-3/60 border hair transition-colors min-h-[380px] ${over === id ? 'drop-target !border-ink !bg-white' : ''}`}>
              <header className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${DOT[id] || 'bg-ink'}`} /><span className="font-semibold text-[13.5px] clamp-1 flex-1">{label}</span><span className="os-cnt">{items.length}</span></div>
                <div className="text-[11.5px] text-ink-500 mt-1">مجموع الميزانيات <b className="text-ink num" dir="ltr">{usd(value)}</b></div>
              </header>
              <div className="flex-1 px-2 pb-2 grid gap-2 content-start min-h-[120px]">
                {items.map((c) => (
                  <button key={c.id} type="button" draggable onDragStart={(e) => { setDrag(c.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDrag(null)} onClick={() => nav(`/crm/contacts/${c.id}`)}
                    className={`block w-full text-start bg-white rounded-[12px] border hair p-3 hover:border-ink-300 transition-colors cursor-grab active:cursor-grabbing ${drag === c.id ? 'dragging' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5"><span className="font-semibold text-[13.5px] clamp-1">{c.name}</span>{c.isHot && <span className="w-2 h-2 rounded-full bg-red flex-none" title="ساخن" />}</div>
                        <div className="text-[12px] text-ink-500 clamp-1 mt-0.5">{c.listing ? <><span className="num">{c.listing.priceText}</span>{c.listing.areaName ? ` · ${c.listing.areaName}` : ''}</> : c.budget ? <>ميزانية <span className="num">{c.budgetText}</span></> : 'الطلب غير محدد'}</div>
                      </div>
                      {c.listing && <Img src={c.listing.img} className="w-11 h-9 rounded-[8px] flex-none" />}
                    </div>
                    {c.listing && <div className="text-[12px] clamp-1 mt-1.5"><span className="mono text-ink-400">{c.listing.id}</span> · {c.listing.title}</div>}
                    {c.note && <div className="text-[12px] text-ink-600 leading-relaxed clamp-2 mt-1.5">{c.note}</div>}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {c.agent ? <Av name={c.agent.name} img={c.agent.img} seed={c.agent.id} size={22} /> : <Badge tone="red">غير مخصّص</Badge>}
                      {c.deal && <Badge tone={c.deal === 'rent' ? 'red' : 'ink'}>{DEAL_AR[c.deal]}</Badge>}
                      <span className="ms-auto text-[11px] text-ink-400 whitespace-nowrap inline-flex items-center gap-1" title="آخر نشاط"><Icon name="clock" size={12} />{c.last}</span>
                      <span role="button" tabIndex={0} aria-label={`حدد معاينة لـ ${c.name}`} title="حدد معاينة" className="icon-btn !w-7 !h-7 -me-1 text-ink-500 hover:bg-paper-2 hover:text-ink"
                        onClick={(e) => openViewing(e, c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewing(e, c.id); } }}><Icon name="cal" size={15} /></span>
                    </div>
                  </button>
                ))}
                {!items.length && <div className="text-center text-[12px] text-ink-400 py-6 border border-dashed border-line-2 rounded-[12px]">اسحب هنا</div>}
              </div>
            </section>
          );
        })}
      </div>
      {viewingFor && <ViewingModal preset={{ contact_id: viewingFor }} onClose={() => setViewingFor(null)} />}
    </>
  );
}
