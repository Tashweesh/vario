import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { TYPE_GROUPS, groupTypes } from '../../lib/format.js';
import { Chip, Empty, StatusPill } from '../../components/ui.jsx';
import { PageTitle, ScrollX, TABLE, editBtn, thead, trow } from '../../staff/Shell.jsx';

const COLS = '48px minmax(200px,1.6fr) 90px 1fr 110px 100px 120px 90px 70px';
const filterSel = { height: 36, border: '1px solid #e7e7e3', borderRadius: 10, background: '#fff', padding: '0 12px', fontSize: 13, outline: 0 };

export default function Listings() {
  useDocTitle('العقارات');
  const C = useCms();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const g = (k) => sp.get(k) || '';
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const q = g('q').trim().toLowerCase();
  const base = C.listings.filter((l) =>
    (!g('type') || groupTypes(g('type')).includes(l.type)) && (!g('deal') || l.deal === g('deal')) && (!g('area') || l.area_id === g('area')) &&
    (!g('agent') || l.agent_id === g('agent')) && (!q || [l.id, l.title, l.areaName, l.projName].join(' ').toLowerCase().includes(q)));
  const list = base.filter((l) => !g('status') || l.status === g('status'));
  const cnt = (s) => base.filter((l) => l.status === s).length;

  return (
    <>
      <PageTitle action={<>
        <Chip on={!g('status')} onClick={() => set('status', '')}>الكل {base.length}</Chip>
        {[['live', 'منشور'], ['draft', 'مسودة'], ['reserved', 'محجوز'], ['sold', 'مباع']].map(([s, t]) => <Chip key={s} on={g('status') === s} onClick={() => set('status', s)}>{t} {cnt(s)}</Chip>)}
      </>}>العقارات</PageTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="sel" aria-label="النوع" style={filterSel} value={g('type')} onChange={(e) => set('type', e.target.value)}><option value="">النوع: الكل</option>{TYPE_GROUPS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
        <select className="sel" aria-label="بيع أو إيجار" style={filterSel} value={g('deal')} onChange={(e) => set('deal', e.target.value)}><option value="">بيع / إيجار</option><option value="sale">للبيع</option><option value="rent">للإيجار</option></select>
        <select className="sel" aria-label="المنطقة" style={filterSel} value={g('area')} onChange={(e) => set('area', e.target.value)}><option value="">المنطقة</option>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select className="sel" aria-label="الوسيط" style={filterSel} value={g('agent')} onChange={(e) => set('agent', e.target.value)}><option value="">الوسيط</option>{C.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        {q && <Chip on onClick={() => set('q', '')}>«{g('q')}» ✕</Chip>}
      </div>
      {list.length === 0 ? <Empty>لا توجد عقارات مطابقة</Empty> : (
        <div style={TABLE}>
          <ScrollX min={1040}>
            <div style={thead(COLS)}><span /><span>العقار</span><span>الرقم</span><span>المنطقة</span><span>السعر</span><span>الحالة</span><span>الوسيط</span><span>مشاهدات / طلبات</span><span /></div>
            {list.map((l) => (
              <div key={l.id} className="h-row" style={trow(COLS)}>
                {l.img ? <img src={l.img} alt="" style={{ width: 48, height: 38, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 48, height: 38, borderRadius: 8, background: '#f6f6f4' }} />}
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.dealLabel} · {l.facts}</div></div>
                <span style={{ color: '#5a5e68', fontSize: 12.5 }}>{l.id}</span>
                <span>{l.areaName}</span>
                <span style={{ fontWeight: 600 }} dir="ltr">{l.priceText}</span>
                <StatusPill label={l.statusLabel} color={l.statusColor} bg={l.statusBg} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, minWidth: 0 }}>{l.agent?.img && <img src={l.agent.img} alt="" style={{ width: 22, height: 22, borderRadius: 999, objectFit: 'cover' }} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.agent?.name || '—'}</span></span>
                <span style={{ fontSize: 12.5, color: '#5a5e68' }}>{l.views} / {l.leads}</span>
                <button style={editBtn} onClick={() => nav(`/cms/listings/${l.id}`)}>{l.canEdit ? 'تعديل' : 'عرض'}</button>
              </div>
            ))}
          </ScrollX>
        </div>
      )}
    </>
  );
}
