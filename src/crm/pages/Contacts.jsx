import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCrm } from '../CrmApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Chip, Empty, StatusPill } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, thead } from '../../staff/Shell.jsx';

const COLS = 'minmax(160px,1.3fr) 1fr 90px minmax(160px,1.4fr) 110px 100px 130px 110px';

export default function Contacts() {
  useDocTitle('جهات الاتصال');
  const R = useCrm();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const filter = sp.get('f') || '';
  const qq = (sp.get('q') || '').trim().toLowerCase();
  const qDigits = qq.replace(/\D/g, '');
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const base = R.contacts.filter((c) => !qq || c.name.toLowerCase().includes(qq) || (qDigits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(qDigits)));
  const list = base.filter((c) => (filter === 'unassigned' ? !c.agent_id : filter === 'hot' ? c.isHot : true));
  return (
    <>
      <PageTitle action={<>
        <Chip on={!filter} onClick={() => set('f', '')}>الكل {base.length}</Chip>
        <Chip on={filter === 'unassigned'} onClick={() => set('f', 'unassigned')}>غير مخصّص {base.filter((c) => !c.agent_id).length}</Chip>
        <Chip on={filter === 'hot'} onClick={() => set('f', 'hot')}>ساخن</Chip>
        {qq && <Chip on onClick={() => set('q', '')}>«{sp.get('q')}» ✕</Chip>}
      </>}>جهات الاتصال</PageTitle>
      {list.length === 0 ? <Empty>لا توجد جهات اتصال مطابقة</Empty> : (
        <div style={TABLE}><ScrollX min={1060}>
          <div style={thead(COLS)}><span>الاسم</span><span>الهاتف</span><span>المصدر</span><span>مهتم بـ</span><span>الميزانية</span><span>المرحلة</span><span>الوسيط</span><span>آخر نشاط</span></div>
          {list.map((c) => (
            <button key={c.id} className="h-row" onClick={() => nav(`/crm/contacts/${c.id}`)} style={{ width: '100%', display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: '12px 18px', border: 0, borderBottom: '1px solid #f0f0ed', background: 'transparent', fontSize: 13.5, cursor: 'pointer', textAlign: 'start' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>{c.isHot && <span style={{ width: 8, height: 8, borderRadius: 999, background: '#c8102e', flex: 'none' }} />}{c.name}</span>
              <span dir="ltr" style={{ textAlign: 'right' }}>{c.phone}</span>
              <span style={{ color: '#5a5e68' }}>{c.source}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {c.listing ? <>{c.listing.img && <img src={c.listing.img} alt="" style={{ width: 36, height: 28, borderRadius: 6, objectFit: 'cover', flex: 'none' }} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{c.listing.id} · {c.listing.title}</span></> : <span style={{ color: '#9da0a7' }}>—</span>}
              </span>
              <span style={{ fontWeight: 600 }} dir="ltr">{c.budgetText}</span>
              <StatusPill label={c.stageLabel} color="#1d1e22" bg="#f1f1ef" />
              <span style={{ fontSize: 12.5, color: c.agent ? '#1d1e22' : '#c8102e' }}>{c.agentName}</span>
              <span style={{ fontSize: 12.5, color: '#767a83' }}>{c.last}</span>
            </button>
          ))}
        </ScrollX></div>
      )}
    </>
  );
}
