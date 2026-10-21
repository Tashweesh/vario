import { useNavigate } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { useDocTitle, useViewport } from '../../lib/hooks.js';
import { StatusPill } from '../../components/ui.jsx';
import { num } from '../../lib/format.js';

const card = { background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, padding: 18 };
const DAY = 864e5;

export default function Dashboard() {
  useDocTitle('لوحة التحكم');
  const C = useCms();
  const A = useAuth();
  const nav = useNavigate();
  const L = C.listings;
  const { w } = useViewport();
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

  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 600, margin: '0 0 20px' }}>{hello}، {A.me.name.split(' ')[0]}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <Stat label="عقارات منشورة" v={L.filter((l) => l.status === 'live').length} onClick={() => nav('/cms/listings?status=live')} />
        <Stat label="مسودات" v={L.filter((l) => l.status === 'draft').length} onClick={() => nav('/cms/listings?status=draft')} />
        <Stat label="مباع هذا الشهر" v={L.filter((l) => l.status === 'sold' && new Date(l.status_changed_at) >= monthStart).length} onClick={() => nav('/cms/listings?status=sold')} />
        <Stat label="طلبات جديدة من الموقع" v={C.contacts.filter((c) => c.stage === 'new').length} red onClick={() => nav('/crm')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: w >= 1100 ? 'minmax(0,1fr) 320px' : '1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #e7e7e3' }}><div style={{ fontWeight: 600 }}>آخر العقارات</div><button onClick={() => nav('/cms/listings')} style={{ border: 0, background: 'transparent', fontSize: 13, fontWeight: 600, color: '#c8102e', cursor: 'pointer' }}>كل العقارات ←</button></div>
          {latest.map((l) => (
            <button key={l.id} className="h-row" onClick={() => nav(`/cms/listings/${l.id}`)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '48px 1fr 110px 90px', gap: 12, alignItems: 'center', padding: '10px 18px', border: 0, borderBottom: '1px solid #f0f0ed', background: 'transparent', cursor: 'pointer', textAlign: 'start' }}>
              {l.img ? <img src={l.img} alt="" style={{ width: 48, height: 38, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 48, height: 38, borderRadius: 8, background: '#f6f6f4' }} />}
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div><div style={{ fontSize: 12, color: '#767a83' }}>{l.id} · {l.areaName}</div></div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }} dir="ltr">{l.priceText}</div>
              <StatusPill label={l.statusLabel} color={l.statusColor} bg={l.statusBg} />
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>يحتاج انتباه</div>
            {attention.length === 0 && <div style={{ fontSize: 13, color: '#767a83' }}>كل شي تمام ✓</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {attention.slice(0, 6).map((x) => (
                <button key={x.t} onClick={() => nav(x.to)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', border: 0, background: 'transparent', padding: 0, textAlign: 'start', cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: x.c, marginTop: 6, flex: 'none' }} />
                  <div><div style={{ fontWeight: 600 }}>{x.t}</div><div style={{ color: '#767a83' }}>{x.d}</div></div>
                </button>
              ))}
              {attention.length > 6 && <div style={{ color: '#767a83' }}>و{attention.length - 6} أخرى</div>}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>الأكثر مشاهدة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {top.map((l) => <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.id} · {l.title}</span><span style={{ fontWeight: 600 }}>{num(l.views)}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Stat = ({ label, v, red, onClick }) => (
  <button onClick={onClick} className="h-shadow-sm" style={{ ...card, textAlign: 'start', cursor: 'pointer' }}>
    <div style={{ fontSize: 12.5, color: '#767a83' }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: red ? '#c8102e' : '#1d1e22' }}>{v}</div>
  </button>
);
