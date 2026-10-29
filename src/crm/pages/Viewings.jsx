import { useState } from 'react';
import { useCrm, ViewingModal, OsPage, Av, Badge, VIEW_TONE } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { AR_DAYS, AR_MONTHS, dateShort, hhmm } from '../../lib/format.js';
import { Btn, Chip, Icon } from '../../components/ui.jsx';

// Erbil work week: Saturday → Thursday. Friday is the day off but still drawn (muted) so a visit booked
// on a Friday is never hidden from the calendar.
const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); return x; };
// Event card tone per status (reference os/ops.js week calendar)
const EV = { confirmed: 'bg-white', pending: 'bg-red-50 border-red-200', second: 'bg-white', done: 'bg-paper-2 text-ink-500', cancelled: 'bg-paper-2 text-ink-400 line-through' };

export default function Viewings() {
  useDocTitle('المعاينات');
  const R = useCrm();
  const A = useAuth();
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [mine, setMine] = useState(false);
  const [modal, setModal] = useState(null);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 864e5));
  const end = new Date(start.getTime() + 7 * 864e5);
  const week = R.viewings.filter((v) => v.at >= start && v.at < end && (!mine || v.agent_id === A.me.agent_id));
  const shift = (n) => setStart(new Date(start.getTime() + n * 7 * 864e5));
  const today = new Date().toDateString();

  return (
    <>
      <OsPage title={mine ? 'معايناتي' : 'المعاينات'} sub={mine ? 'المعاينات التي أنت وسيطها فقط' : 'كل الوسطاء · الأسبوع من السبت إلى الخميس'} actions={<>
        <Chip small on={!mine} onClick={() => setMine(false)}>الكل</Chip>
        <Chip small on={mine} onClick={() => setMine(true)}>معايناتي</Chip>
      </>} />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Btn size="sm" className="!h-9 !px-3" aria-label="الأسبوع السابق" onClick={() => shift(-1)}><Icon name="chev" size={15} /></Btn>
        <Btn size="sm" className="!h-9" onClick={() => setStart(weekStart(new Date()))}>هذا الأسبوع</Btn>
        <Btn size="sm" className="!h-9 !px-3" aria-label="الأسبوع التالي" onClick={() => shift(1)}><Icon name="chev" size={15} className="flip-rtl" /></Btn>
        <span className="font-semibold text-[14px] ms-1 num">{dateShort(days[0])} – {dateShort(days[6])} {days[6].getFullYear()}</span>
        <span className="ms-auto lbl">{week.length} معاينة هذا الأسبوع</span>
      </div>
      <div className="os-card overflow-x-auto"><div className="grid grid-cols-7 min-w-[880px]">
        {days.map((d) => {
          const items = week.filter((v) => v.at.toDateString() === d.toDateString()).sort((a, b) => a.at - b.at);
          const isToday = d.toDateString() === today;
          const off = d.getDay() === 5; // Friday
          return (
            <div key={d.toISOString()} className={`border-e hair last:border-e-0 min-h-[380px] flex flex-col ${off ? 'bg-paper-2/40' : ''}`}>
              <div className={`px-3 py-2.5 border-b hair text-start ${isToday ? 'bg-red-50' : ''}`}>
                <span className={`block text-[11.5px] font-semibold ${isToday ? 'text-red' : off ? 'text-ink-300' : 'text-ink-500'}`}>{AR_DAYS[d.getDay()]}{isToday && ' · اليوم'}{off && ' · عطلة'}</span>
                <span className={`block text-[17px] font-semibold num ${off ? 'text-ink-400' : ''}`}>{d.getDate()} <span className="text-[11.5px] font-medium text-ink-400">{AR_MONTHS[d.getMonth()]}</span></span>
              </div>
              <div className="p-2 grid gap-1.5 content-start flex-1">
                {items.map((v) => (
                  <button key={v.id} type="button" onClick={() => setModal(v)} className={`w-full text-start rounded-[10px] px-2.5 py-2 text-[12px] border hair hover:border-ink-300 transition-colors ${EV[v.status] || 'bg-white'}`}>
                    <span className="flex items-center gap-1.5 font-semibold"><span className="num" dir="ltr">{hhmm(v.at)}</span><span className="ms-auto"><Badge tone={VIEW_TONE[v.status]}>{v.statusLabel}</Badge></span></span>
                    <span className="block clamp-1 mt-1 text-[12.5px] font-semibold">{v.contact?.name || '—'}</span>
                    {v.listing && <span className="block clamp-1 text-[11.5px] text-ink-500 mt-0.5"><span className="mono">{v.listing.id}</span> · {v.listing.title}{v.listing.areaName ? ` · ${v.listing.areaName}` : ''}</span>}
                    {v.agent && <span className="flex items-center gap-1.5 mt-1.5"><Av name={v.agent.name} img={v.agent.img} seed={v.agent.id} size={16} /><span className="clamp-1 text-[11px] text-ink-500">{v.agent.name}</span></span>}
                  </button>
                ))}
                <button type="button" onClick={() => setModal({ preset: d })} className="h-9 rounded-[10px] border border-dashed border-line-2 text-[12px] text-ink-400 hover:text-ink hover:border-ink-300 transition-colors inline-flex items-center justify-center gap-1"><Icon name="plus" size={13} />معاينة</button>
              </div>
            </div>
          );
        })}
      </div></div>
      <p className="lbl mt-2">اضغط على المعاينة لتعديلها أو تغيير حالتها · «+ معاينة» داخل اليوم يحدد موعداً في ذلك اليوم.</p>
      {modal?.id && <ViewingModal v={modal} onClose={() => setModal(null)} />}
      {modal?.preset && <ViewingModal preset={{ date: modal.preset }} onClose={() => setModal(null)} />}
    </>
  );
}
