import { Link, useNavigate } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Icon } from '../../components/ui.jsx';
import { Kpi, Lmini, OsCard, OsTable, PageTitle, StatusBadge } from '../../staff/Shell.jsx';
import { num } from '../../lib/format.js';

const DAY = 864e5;

// Ported from the reference's website overview (os/web.js) + command centre: KPI row, recent list, attention card.
export default function Dashboard() {
  useDocTitle('لوحة التحكم');
  const C = useCms();
  const A = useAuth();
  const nav = useNavigate();
  const L = C.listings;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'صباح الخير' : 'مساء الخير';

  const attention = [
    ...L.filter((l) => l.status !== 'sold' && l.photos.length < 5).map((l) => ({ c: '#c8102e', id: l.id, t: `${l.id} بدون صور كافية`, d: `${l.photos.length === 0 ? 'لا توجد صور' : l.photos.length === 1 ? 'صورة واحدة' : l.photos.length === 2 ? 'صورتان فقط' : `${l.photos.length} صور فقط`} · الحد الأدنى 5`, to: `/cms/listings/${l.id}?tab=photos` })),
    ...L.filter((l) => l.status === 'reserved' && Date.now() - new Date(l.status_changed_at) > 10 * DAY).map((l) => ({ c: '#b26a00', id: l.id, t: `${l.id} محجوز منذ ${Math.floor((Date.now() - new Date(l.status_changed_at)) / DAY)} يوم`, d: 'تأكيد البيع أو إعادة النشر', to: `/cms/listings/${l.id}?tab=status` })),
    ...(A.isEditor ? C.projects.filter((p) => p.status === 'construction' && Date.now() - new Date(p.progress_updated_at) > 30 * DAY).map((p) => ({ c: '#b26a00', id: p.id, t: `${p.name} · نسبة الإنجاز قديمة`, d: `آخر تحديث قبل ${Math.floor((Date.now() - new Date(p.progress_updated_at)) / DAY)} يوم`, to: `/cms/projects/${p.id}` })) : []),
    ...(A.isEditor ? L.filter((l) => l.status === 'draft' && l.agent_id && l.photos.length >= 5).map((l) => ({ c: '#0f8a4f', id: l.id, t: `${l.id} جاهز للمراجعة والنشر`, d: `مسودة من ${l.agent?.name || 'وسيط'}`, to: `/cms/listings/${l.id}?tab=status` })) : []),
  ];
  const top = [...L].filter((l) => l.status !== 'draft').sort((a, b) => b.views - a.views).slice(0, 3);
  const latest = L.slice(0, 6);
  const live = L.filter((l) => l.status === 'live').length;
  const drafts = L.filter((l) => l.status === 'draft').length;
  const soldMonth = L.filter((l) => l.status === 'sold' && new Date(l.status_changed_at) >= monthStart).length;
  const newLeads = C.contacts.filter((c) => c.stage === 'new').length;

  return (
    <>
      <PageTitle sub={`${live} عقار ظاهر بالموقع · ${L.length - live} مخفي · أي تغيير هنا ينزل على الموقع فوراً`} action={<Btn size="sm" onClick={() => nav('/')}><Icon name="globe" size={15} />افتح الموقع</Btn>}>{hello}، {A.me.name.split(' ')[0]}</PageTitle>
      <div className="os-kpis">
        <Kpi label="عقارات منشورة" value={live} sub={`${L.filter((l) => l.status === 'live' && l.deal === 'sale').length} بيع · ${L.filter((l) => l.status === 'live' && l.deal === 'rent').length} إيجار`} icon="globe" onClick={() => nav('/cms/listings?status=live')} />
        <Kpi label="مسودات" value={drafts} sub="بانتظار الصور أو النشر" icon="doc" onClick={() => nav('/cms/listings?status=draft')} />
        <Kpi label="مباع هذا الشهر" value={soldMonth} sub="منذ بداية الشهر" icon="tag" onClick={() => nav('/cms/listings?status=sold')} />
        <Kpi label="طلبات جديدة من الموقع" value={newLeads} sub="بانتظار رد" icon="mail" tone={newLeads ? 'red' : ''} onClick={() => nav('/crm')} />
      </div>
      <div className="os-cols split">
        <div className="grid gap-5 min-w-0">
          <OsCard title="آخر العقارات" extra={<Link to="/cms/listings" className="link text-[12.5px] text-ink-600">كل العقارات<Icon name="chev" size={13} className="flip-rtl" /></Link>}>
            {latest.length === 0 ? <p className="text-[13px] text-ink-500">ماكو عقارات بعد — أضف أول عقار من «عقار جديد».</p> : (
              <OsTable inCard head={['العقار', 'السعر', 'الحالة']}>
                {latest.map((l) => (
                  <tr key={l.id} className="cursor-pointer" onClick={() => nav(`/cms/listings/${l.id}`)}>
                    <td><div className="min-w-[200px]"><Lmini img={l.img} title={l.title} id={l.id} sub={l.areaName} /></div></td>
                    <td className="num whitespace-nowrap font-semibold"><span dir="ltr">{l.priceText}</span></td>
                    <td><StatusBadge status={l.status} label={l.statusLabel} /></td>
                  </tr>
                ))}
              </OsTable>
            )}
          </OsCard>
        </div>
        <div className="grid gap-5 min-w-0">
          <OsCard title="يحتاج انتباه" extra={<span className="text-[12px] text-ink-500 num">{attention.length}</span>}>
            {attention.length === 0 && <p className="text-[13px] text-ink-500 inline-flex items-center gap-1.5"><Icon name="check" size={15} className="text-ok" />كل شي تمام</p>}
            <div className="grid gap-3">
              {attention.slice(0, 6).map((x) => (
                <button type="button" key={x.t} onClick={() => nav(x.to)} className="flex items-start gap-2.5 text-start min-w-0">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ background: x.c }} />
                  <span className="min-w-0"><span className="block text-[13.5px] font-semibold clamp-1">{x.t}</span><span className="block text-[12px] text-ink-500">{x.d}</span></span>
                </button>
              ))}
              {attention.length > 6 && <div className="text-[12.5px] text-ink-500">و{attention.length - 6} أخرى</div>}
            </div>
          </OsCard>
          <OsCard title="الأكثر مشاهدة">
            {top.length === 0 ? <p className="text-[13px] text-ink-500">ماكو مشاهدات بعد.</p> : (
              <div className="divide-y hair -my-1">
                {top.map((l) => <button type="button" key={l.id} onClick={() => nav(`/cms/listings/${l.id}`)} className="w-full flex items-center justify-between gap-3 py-2 text-[13px] text-start min-w-0"><span className="clamp-1 min-w-0"><span className="mono text-[12px] text-ink-500">{l.id}</span> · {l.title}</span><span className="num font-semibold whitespace-nowrap inline-flex items-center gap-1 text-ink-600"><Icon name="eye" size={13} className="text-ink-400" />{num(l.views)}</span></button>)}
              </div>
            )}
          </OsCard>
        </div>
      </div>
    </>
  );
}
