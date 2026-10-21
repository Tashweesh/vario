import { useState } from 'react';
import { useCrm, ViewingModal } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { AR_DAYS, dateShort, hhmm } from '../../lib/format.js';
import { Chip } from '../../components/ui.jsx';
import { PageTitle } from '../../staff/Shell.jsx';

// Erbil work week: Saturday → Thursday.
const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); return x; };
const navBtn = { width: 34, height: 34, borderRadius: 10, border: '1px solid #d8d8d3', background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const STATUS_COLOR = { confirmed: '#c8102e', pending: '#b26a00', second: '#1d1e22', done: '#0f8a4f', cancelled: '#9da0a7' };

export default function Viewings() {
  useDocTitle('المعاينات');
  const R = useCrm();
  const A = useAuth();
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [mine, setMine] = useState(false);
  const [modal, setModal] = useState(null);
  const days = Array.from({ length: 6 }, (_, i) => new Date(start.getTime() + i * 864e5));
  const end = new Date(start.getTime() + 7 * 864e5);
  const week = R.viewings.filter((v) => v.at >= start && v.at < end && (!mine || v.agent_id === A.me.agent_id));
  const shift = (n) => setStart(new Date(start.getTime() + n * 7 * 864e5));
  const today = new Date().toDateString();

  return (
    <>
      <PageTitle sub={`الأسبوع ${dateShort(days[0])} – ${dateShort(days[5])} · ${week.length} معاينة`} action={<>
        <Chip on={!mine} onClick={() => setMine(false)}>الكل</Chip>
        <Chip on={mine} onClick={() => setMine(true)}>معايناتي</Chip>
        <button style={navBtn} aria-label="الأسبوع السابق" onClick={() => shift(-1)}>›</button>
        <button style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 13 }} onClick={() => setStart(weekStart(new Date()))}>اليوم</button>
        <button style={navBtn} aria-label="الأسبوع التالي" onClick={() => shift(1)}>‹</button>
      </>}>المعاينات</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(180px,1fr))', gap: 10, alignItems: 'start', overflowX: 'auto', paddingBottom: 8 }}>
        {days.map((d) => {
          const items = week.filter((v) => v.at.toDateString() === d.toDateString()).sort((a, b) => a.at - b.at);
          const isToday = d.toDateString() === today;
          return (
            <div key={d.toISOString()} style={{ background: '#fff', border: `1px solid ${isToday ? '#1d1e22' : '#e7e7e3'}`, borderRadius: 16, minHeight: 420, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #e7e7e3' }}><div style={{ fontWeight: 600, fontSize: 14 }}>{AR_DAYS[d.getDay()]}{isToday && <span style={{ color: '#c8102e', fontSize: 12 }}> · اليوم</span>}</div><div style={{ fontSize: 12, color: '#767a83' }}>{dateShort(d)}</div></div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((v) => (
                  <button key={v.id} onClick={() => setModal(v)} style={{ textAlign: 'start', border: 0, borderInlineStart: `3px solid ${STATUS_COLOR[v.status]}`, background: '#f6f6f4', borderRadius: 10, padding: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, width: '100%', opacity: v.status === 'cancelled' ? 0.55 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><b>{hhmm(v.at)}</b><span style={{ color: '#767a83' }}>{v.statusLabel}</span></div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{v.contact?.name || '—'}</div>
                    {v.listing && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{v.listing.img && <img src={v.listing.img} alt="" style={{ width: 36, height: 28, borderRadius: 6, objectFit: 'cover' }} />}<div style={{ fontSize: 12, minWidth: 0 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.listing.title}</div><div style={{ color: '#767a83' }}>{v.listing.areaName}</div></div></div>}
                    {v.agent && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#767a83' }}>{v.agent.img && <img src={v.agent.img} alt="" style={{ width: 16, height: 16, borderRadius: 999, objectFit: 'cover' }} />}{v.agent.name}</div>}
                  </button>
                ))}
                <button onClick={() => setModal({ preset: d })} style={{ height: 36, borderRadius: 10, border: '1px dashed #d8d8d3', background: 'transparent', fontSize: 12.5, color: '#9da0a7', cursor: 'pointer' }}>+ معاينة</button>
              </div>
            </div>
          );
        })}
      </div>
      {modal?.id && <ViewingModal v={modal} onClose={() => setModal(null)} />}
      {modal?.preset && <ViewingModal preset={{ date: modal.preset }} onClose={() => setModal(null)} />}
    </>
  );
}
