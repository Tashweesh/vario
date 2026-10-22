import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { dayLabel } from '../../lib/format.js';
import { Btn } from '../../components/ui.jsx';
import { LeadModal, PageHead, dayOptions } from '../parts.jsx';
import { ERBIL, MapView, kmBetween } from '../../components/MapView.jsx';

const VISIT_MIN = 40;

// Orders saved listings by nearest neighbour (road distance ≈ 1.3 × straight line), starting from the city centre.
function plan(cards) {
  const left = [...cards];
  const route = [];
  let cur = ERBIL;
  while (left.length) {
    left.sort((a, b) => kmBetween(cur, a.pos) - kmBetween(cur, b.pos));
    const next = left.shift();
    route.push({ l: next, km: route.length ? kmBetween(cur, next.pos) * 1.3 : 0 });
    cur = next.pos;
  }
  let t = 10 * 60;
  return route.map((r, i) => {
    const drive = i === 0 ? 0 : Math.max(8, Math.round(r.km * 2.2));
    t += drive;
    const at = t;
    t += VISIT_MIN;
    return { ...r, drive, time: `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}` };
  });
}
export default function Tour() {
  useDocTitle('الجولة الذكية');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const days = dayOptions(6);
  const [day, setDay] = useState(dayLabel(days[0]));
  const [modal, setModal] = useState(false);
  const route = plan(S.savedCards.filter((l) => l.status !== 'sold'));
  const km = route.reduce((s, r) => s + r.km, 0);
  const minutes = route.reduce((s, r) => s + r.drive + VISIT_MIN, 0);

  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="الجولة الذكية" h1Fs={L.h1Fs} sub="اختار العقارات المحفوظة اللي تريد تشوفها، ونرتبلك يوم معاينات بترتيب منطقي حسب المسافات." />
      {route.length === 0 ? (
        <div style={{ marginTop: 24, padding: 40, textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 20 }}>احفظ العقارات اللي تريد تعاينها (♡) وراح نرتبها هنا بجولة وحدة.<div style={{ marginTop: 12 }}><Btn kind="dark" onClick={() => nav('/buy')}>تصفّح العقارات</Btn></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 28, marginTop: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <MapView height={L.phone ? 240 : 320} style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e7e7e3', marginBottom: 20 }} scrollZoom={false} bounds={route.map((r) => r.l.pos)} zoom={14} maxZoom={15}
              markers={route.map((r, i) => ({ id: r.l.id, kind: 'num', lat: r.l.pos.lat, lng: r.l.pos.lng, html: String(i + 1), onClick: () => nav(r.l.href) }))}
              lines={[{ id: 'route', points: route.map((r) => r.l.pos), color: '#c8102e', dash: '6 6' }]} />
            {route.map(({ l, time, drive }, i) => (
              <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{time}</span><span style={{ flex: 1, width: 2, background: '#e7e7e3', margin: '6px 0' }} /></div>
                <button onClick={() => nav(l.href)} style={{ textAlign: 'start', display: 'flex', gap: 14, padding: 12, border: '1px solid #e7e7e3', borderRadius: 16, background: '#fff', cursor: 'pointer', marginBottom: 14, minWidth: 0 }}>
                  <img src={l.img} alt="" style={{ width: L.phone ? 72 : 96, height: L.phone ? 60 : 76, borderRadius: 12, objectFit: 'cover', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                    <div style={{ fontSize: 13, color: '#767a83' }}>{l.areaName} · {l.priceText}</div>
                    <div style={{ fontSize: 12.5, color: '#5a5e68', marginTop: 6 }}>مدة المعاينة {VISIT_MIN} دقيقة{i < route.length - 1 ? ` · التنقل للتالي ${route[i + 1].drive} دقيقة` : ''}</div>
                  </div>
                  {S.showAgent && l.agent && !L.phone && <span style={{ fontSize: 12, color: '#767a83' }}>{l.agent.name}</span>}
                </button>
              </div>
            ))}
          </div>
          <aside style={{ border: '1px solid #e7e7e3', borderRadius: 20, padding: 22, position: L.asidePos, top: 92 }}>
            <div style={{ fontSize: 12, color: '#767a83' }}>يوم الجولة</div>
            <select className="sel" aria-label="يوم الجولة" value={day} onChange={(e) => setDay(e.target.value)} style={{ fontWeight: 600, fontSize: 18, marginTop: 2, border: 0, background: 'transparent', padding: 0, outline: 0, backgroundPosition: 'left 0 center', width: '100%' }}>
              {days.map((d) => <option key={d.toISOString()}>{dayLabel(d)}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16, textAlign: 'center' }}>
              {[[route.length, 'عقارات'], [(minutes / 60).toFixed(1), 'ساعة'], [Math.max(1, Math.round(km)), 'كم']].map(([v, t]) => <div key={t} style={{ background: '#f6f6f4', borderRadius: 12, padding: 10 }}><div style={{ fontWeight: 700, fontSize: 18 }}>{v}</div><div style={{ fontSize: 11.5, color: '#767a83' }}>{t}</div></div>)}
            </div>
            <Btn kind="red" h={46} fs={14.5} style={{ marginTop: 16, width: '100%' }} onClick={() => setModal(true)}>أكّد الجولة ويا ڤايرو</Btn>
            <div style={{ fontSize: 12, color: '#767a83', marginTop: 10, textAlign: 'center' }}>مستشار واحد يرافقك طول اليوم</div>
          </aside>
        </div>
      )}
      {modal && <LeadModal title="أكّد الجولة" sub={`${day} · ${route.length} عقارات تبدأ ${route[0]?.time}`} kind="tour" listingIds={route.map((r) => r.l.id)} onClose={() => setModal(false)} buildMessage={() => `يوم الجولة: ${day}\n` + route.map((r) => `${r.time} — ${r.l.id}`).join('\n')} submitLabel="أكّد الجولة" done="وصل طلب الجولة — المستشار راح يأكد ويّاك المواعيد" />}
    </section>
  );
}
