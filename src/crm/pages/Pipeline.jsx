import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '../CrmApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { STAGES, usd } from '../../lib/format.js';
import { Chip, useToast } from '../../components/ui.jsx';
import { PageTitle } from '../../staff/Shell.jsx';

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

  const list = R.contacts.filter((c) => (!mine || c.agent_id === A.me.agent_id) && (!deal || c.deal === deal)).map((c) => (local[c.id] ? { ...c, stage: local[c.id] } : c));
  const drop = async (stage) => {
    const c = R.CI[drag];
    setOver(null); setDrag(null);
    if (!c || c.stage === stage) return;
    setLocal((s) => ({ ...s, [c.id]: stage }));
    const { error } = await supabase.from('contacts').update({ stage, score: stage === 'closed' ? 'won' : c.score === 'won' ? 'warm' : c.score }).eq('id', c.id);
    if (!error) await supabase.from('activities').insert({ contact_id: c.id, kind: 'system', body: `نُقل إلى مرحلة «${STAGES.find((s) => s[0] === stage)[1]}»`, agent_id: A.me.agent_id });
    if (error) toast(error.message, 'error');
    await R.reload();
    setLocal((s) => { const n = { ...s }; delete n[c.id]; return n; });
  };

  return (
    <>
      <PageTitle sub="اسحب البطاقة بين الأعمدة لتغيير المرحلة" action={<>
        <Chip on={!mine} onClick={() => setMine(false)}>كل الفريق</Chip>
        <Chip on={mine} onClick={() => setMine(true)}>عملائي فقط</Chip>
        <Chip on={deal === 'sale'} onClick={() => setDeal(deal === 'sale' ? '' : 'sale')}>شراء</Chip>
        <Chip on={deal === 'rent'} onClick={() => setDeal(deal === 'rent' ? '' : 'rent')}>إيجار</Chip>
      </>}>المسار</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(200px,1fr))', gap: 12, overflowX: 'auto', alignItems: 'start', paddingBottom: 8 }}>
        {STAGES.map(([id, label]) => {
          const items = list.filter((c) => c.stage === id);
          const value = items.reduce((s, c) => s + (c.deal === 'sale' && c.budget ? c.budget : 0), 0);
          return (
            <div key={id} onDragOver={(e) => { e.preventDefault(); setOver(id); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); drop(id); }}
              style={{ background: over === id ? '#e3e3df' : '#eeeeeb', borderRadius: 16, padding: 10, minHeight: 400, transition: 'background .15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 10px' }}><div style={{ fontWeight: 600, fontSize: 14 }}>{label} <span style={{ color: '#767a83', fontWeight: 500 }}>{items.length}</span></div><div style={{ fontSize: 11.5, color: '#767a83' }} dir="ltr">{usd(value)}</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((c) => (
                  <button key={c.id} draggable onDragStart={(e) => { setDrag(c.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDrag(null)} onClick={() => nav(`/crm/contacts/${c.id}`)} className={'h-shadow-sm' + (drag === c.id ? ' dragging' : '')}
                    style={{ textAlign: 'start', background: '#fff', border: '1px solid #e7e7e3', borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>{c.isHot && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#c8102e' }} />}</div>
                    {c.listing && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {c.listing.img && <img src={c.listing.img} alt="" style={{ width: 40, height: 32, borderRadius: 6, objectFit: 'cover', flex: 'none' }} />}
                        <div style={{ minWidth: 0, fontSize: 12 }}><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.listing.title}</div><div style={{ color: '#767a83' }}>{c.listing.id} · {c.listing.priceText}</div></div>
                      </div>
                    )}
                    {c.note && <div style={{ fontSize: 12, color: '#5a5e68', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.note}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#767a83', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c.agent ? '#767a83' : '#c8102e' }}>{c.agent?.img && <img src={c.agent.img} alt="" style={{ width: 18, height: 18, borderRadius: 999, objectFit: 'cover' }} />}{c.agentName}</span>
                      <span>{c.last}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
