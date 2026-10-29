import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { TYPE_GROUPS, groupTypes } from '../../lib/format.js';
import { Chip, Icon } from '../../components/ui.jsx';
import { Av, Lmini, Osb, OsEmpty, OsTable, OsTabs, PageTitle, StatusBadge } from '../../staff/Shell.jsx';

const SEL = 'field !h-9 !text-[13px] !rounded-[10px] !ps-3 !pe-8 !w-auto flex-none';

// Ported from the reference's inventory table (os/inventory.js /listings): status tabs, filter row, dense os-tbl.
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
  const live = C.listings.filter((l) => l.status === 'live').length;

  return (
    <>
      <PageTitle sub={`${live} ظاهر بالموقع · ${C.listings.length - live} مخفي`} action={<a href="/" target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />الموقع</a>}>العقارات</PageTitle>
      <OsTabs items={[['', 'الكل', base.length], ['live', 'منشور', cnt('live')], ['draft', 'مسودة', cnt('draft')], ['reserved', 'محجوز', cnt('reserved')], ['sold', 'مباع', cnt('sold')]]} active={g('status')} onChange={(k) => set('status', k)} />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select className={SEL} aria-label="النوع" value={g('type')} onChange={(e) => set('type', e.target.value)}><option value="">النوع: الكل</option>{TYPE_GROUPS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
        <select className={SEL} aria-label="بيع أو إيجار" value={g('deal')} onChange={(e) => set('deal', e.target.value)}><option value="">بيع / إيجار</option><option value="sale">للبيع</option><option value="rent">للإيجار</option></select>
        <select className={SEL} aria-label="المنطقة" value={g('area')} onChange={(e) => set('area', e.target.value)}><option value="">كل المناطق</option>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select className={SEL} aria-label="الوسيط" value={g('agent')} onChange={(e) => set('agent', e.target.value)}><option value="">كل الوسطاء</option>{C.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        {q && <Chip small on onClick={() => set('q', '')}>«{g('q')}»<Icon name="close" size={13} /></Chip>}
      </div>
      <div className="text-[12.5px] text-ink-500 mb-2 num">{list.length} عقار</div>
      {list.length === 0 ? <OsEmpty icon="building" title="ماكو عقارات تطابق">جرّب تغيّر الفلاتر أو الحالة.</OsEmpty> : (
        <OsTable head={['العقار', 'النوع', 'السعر', 'الحالة', 'الوسيط', { label: 'مشاهدات / طلبات', cls: 'num' }, '']}>
          {list.map((l) => (
            <tr key={l.id} className="cursor-pointer" onClick={() => nav(`/cms/listings/${l.id}`)}>
              <td><div className="min-w-[230px]"><Lmini img={l.img} title={l.title} id={l.id} sub={`${l.areaName}${l.projName ? ' · ' + l.projName : ''}`} /></div></td>
              <td><Osb tone={l.deal === 'rent' ? 'red' : 'ink'}>{l.dealLabel}</Osb></td>
              <td className="whitespace-nowrap"><span className="num font-semibold" dir="ltr">{l.priceText}</span><span className="block text-[11.5px] text-ink-500">{l.facts}</span></td>
              <td><StatusBadge status={l.status} label={l.statusLabel} /></td>
              <td><span className="inline-flex items-center gap-2 min-w-[130px]">{l.agent ? <><Av src={l.agent.img} name={l.agent.name} size={22} /><span className="clamp-1 text-[13px]">{l.agent.name}</span></> : <span className="text-ink-400">—</span>}</span></td>
              <td className="num whitespace-nowrap">{l.views} <span className="text-ink-300">/</span> <b>{l.leads}</b></td>
              <td className="text-end"><button type="button" className="btn btn-line btn-sm !h-8" onClick={(e) => { e.stopPropagation(); nav(`/cms/listings/${l.id}`); }}>{l.canEdit ? 'تعديل' : 'عرض'}</button></td>
            </tr>
          ))}
        </OsTable>
      )}
    </>
  );
}
