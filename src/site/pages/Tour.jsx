import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { dayLabel } from '../../lib/format.js';
import { Icon } from '../../components/ui.jsx';
import { Crumbs, DayPicker, LeadModal, ListingCard, dayOptions } from '../parts.jsx';
import { ERBIL, MapView, kmBetween } from '../../components/MapView.jsx';

// /tools/tour — ported from the reference pages/tour.js: head with 3-step strip → viewing list (numbered stops
// with drive times) + day picker · map + summary panel (sticky) → request CTA (the app's LeadModal).

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
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function Tour() {
  useDocTitle('الجولة الذكية');
  const S = useSite();
  const nav = useNavigate();
  const days = dayOptions(6);
  const [day, setDay] = useState(dayLabel(days[0]));
  const [modal, setModal] = useState(false);
  const route = plan(S.savedCards.filter((l) => l.status !== 'sold'));
  const km = route.reduce((s, r) => s + r.km, 0);
  const minutes = route.reduce((s, r) => s + r.drive + VISIT_MIN, 0);
  const dayValue = days.find((d) => dayLabel(d) === day) || days[0];
  const end = route.length ? 10 * 60 + minutes : 10 * 60;
  const rentN = route.filter((r) => r.l.deal === 'rent').length;

  const summary = (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3"><div className="font-semibold text-[16px]">الملخص</div><span className="tag tag-g">تقديري</span></div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
        <div><dt className="lbl">اليوم</dt><dd className="font-semibold">{day}</dd></div>
        <div><dt className="lbl">الوقت</dt><dd className="font-semibold num" dir="ltr">{route.length ? `${route[0].time}–${hm(end)}` : '—'}</dd></div>
        <div><dt className="lbl">المحطات</dt><dd className="font-semibold num">{route.length} <span className="font-normal text-ink-500">· {route.length - rentN} شراء، {rentN} إيجار</span></dd></div>
        <div><dt className="lbl">المدة الكلية</dt><dd className="font-semibold num">{(minutes / 60).toFixed(1)} ساعة <span className="font-normal text-ink-500">· {Math.max(1, Math.round(km))} كم</span></dd></div>
      </dl>
      <div className="mt-4 flex items-center gap-3 p-3 rounded-[14px] bg-paper-2"><span className="mi-ic !bg-white"><Icon name="users" size={19} /></span><div className="min-w-0 text-[13px]"><div className="font-semibold">مستشار ڤايرو</div><div className="lbl clamp-1">مستشار واحد يرافقك طول اليوم</div></div></div>
      <button type="button" className="btn btn-red btn-lg w-full mt-4" onClick={() => setModal(true)}><Icon name="route" size={18} />أكّد الجولة ويا ڤايرو</button>
      <p className="lbl text-center mt-2">المستشار يأكد ويّاك المواعيد ويا الملاك</p>
    </div>
  );

  return (
    <section className="wrap pt-6 lg:pt-8 pb-28 lg:pb-24">
      <Crumbs items={[['الرئيسية', '/'], ['الأدوات', '/tools'], ['الجولة الذكية', '']]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4 mb-7">
        <div className="max-w-2xl"><div className="eyebrow mb-3">الجولة الذكية · ڤايرو</div><h1 className="t-h1 text-[32px] sm:text-[44px]">حوّل قائمتك ليوم معاينات واحد.</h1><p className="text-ink-600 mt-3">اختار العقارات المحفوظة اللي تريد تشوفها، ونرتبلك يوم معاينات بترتيب منطقي حسب المسافات، ويا وقت لكل محطة ومستشار واحد لكل اليوم.</p></div>
        <ol className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500 flex-none">{['المحطات', 'اليوم', 'الطلب'].map((t, i) => <li key={t} className="flex items-center gap-1.5">{i > 0 && <span className="w-4 h-px bg-ink-200" />}<span className="w-5 h-5 rounded-full bg-paper-2 text-ink inline-flex items-center justify-center num text-[11px]">{i + 1}</span>{t}</li>)}</ol>
      </div>

      {route.length === 0 ? (
        <div className="panel-s p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <h2 className="t-h2 text-[26px] sm:text-[32px]">قائمة المعاينة فاضية</h2>
            <p className="text-ink-600 mt-2">احفظ العقارات اللي تريد تعاينها (♡) وراح نرتبها هنا بجولة وحدة. نرتبها على الخريطة، انت تختار اليوم، ومستشار ڤايرو يأكد كل معاينة.</p>
            <div className="mt-6 flex flex-wrap gap-2"><button type="button" className="btn btn-ink" onClick={() => nav('/buy')}><Icon name="tag" size={17} />تصفّح العقارات</button><Link to="/rent" className="btn btn-line"><Icon name="key" size={17} />تصفّح الإيجارات</Link><Link to="/saved" className="btn btn-ghost"><Icon name="heart" size={17} />المحفوظات</Link></div>
          </div>
          <div className="lg:col-span-7 order-1 lg:order-2"><div className="relative h-[220px] sm:h-[260px] rounded-[18px] overflow-hidden border hair bg-white" aria-hidden="true">
            <svg viewBox="0 0 600 260" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice"><defs><pattern id="trg" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="rgba(13,13,15,.05)" /></pattern></defs><rect width="600" height="260" fill="#F6F6F4" /><rect width="600" height="260" fill="url(#trg)" /><path d="M90 190 C 170 80, 250 210, 320 120 S 470 60, 520 150" fill="none" stroke="#C8102E" strokeWidth="2.5" strokeDasharray="7 6" />{[[90, 190, 1, '#1D1E22'], [320, 120, 2, '#C8102E'], [520, 150, 3, '#1D1E22']].map(([x, y, n, c]) => <g key={n}><circle cx={x} cy={y} r="17" fill={c} stroke="#fff" strokeWidth="3" /><text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="Instrument Sans">{n}</text></g>)}</svg>
          </div></div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div className="panel-s p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4"><div className="font-semibold text-[16px] me-auto">قائمة المعاينة <span className="lbl num">{route.length}</span></div><Link to="/saved" className="btn btn-line btn-sm"><Icon name="heart" size={16} />عدّل المحفوظات</Link></div>
              <p className="lbl mb-3">مرتّبة بأقصر طريق من مركز أربيل · مدة المعاينة {VISIT_MIN} دقيقة لكل محطة.</p>
              <ol className="space-y-0">
                {route.map(({ l, time, drive }, i) => (
                  <Fragment key={l.id}>
                    {i > 0 && <li className="flex items-center gap-2 ps-[22px] py-1 text-[12px] text-ink-500" aria-hidden="true"><span className="w-px h-5 bg-ink-200 ms-[3px]" /><Icon name="car" size={14} className="text-ink-400" /><span className="num">≈ {drive} دقيقة بالسيارة</span></li>}
                    <li className="panel p-3 sm:p-3.5 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 flex-none pt-0.5"><span className={`w-8 h-8 rounded-full ${l.deal === 'rent' ? 'bg-red' : 'bg-ink'} text-white text-[13px] font-bold inline-flex items-center justify-center num`}>{i + 1}</span><span className="text-[12px] font-semibold num text-ink-600">{time}</span></div>
                        <div className="min-w-0 flex-1"><ListingCard l={l} variant="mini" /></div>
                      </div>
                      {S.showAgent && l.agent && <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-500" style={{ paddingInlineStart: 44 }}><Icon name="users" size={14} className="text-ink-400" />{l.agent.name}</div>}
                    </li>
                  </Fragment>
                ))}
              </ol>
            </div>
            <div className="panel p-4 sm:p-5">
              <div className="flex items-center gap-2 font-semibold"><Icon name="cal" size={18} className="text-ink-400" />يوم الجولة</div>
              <div className="mt-3"><DayPicker days={days} value={dayValue} onChange={(d) => setDay(dayLabel(d))} /></div>
              <p className="lbl mt-1.5">المعاينات من السبت للخميس · الجمعة عطلة · تبدأ الساعة 10:00</p>
            </div>
          </div>
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div className="lg:sticky lg:top-[92px] space-y-4">
              <div className="relative rounded-[18px] overflow-hidden border hair">
                <MapView height={340} scrollZoom={false} bounds={route.map((r) => r.l.pos)} zoom={14} maxZoom={15}
                  markers={route.map((r, i) => ({ id: r.l.id, kind: 'num', lat: r.l.pos.lat, lng: r.l.pos.lng, html: String(i + 1), onClick: () => nav(r.l.href) }))}
                  lines={[{ id: 'route', points: route.map((r) => r.l.pos), color: '#c8102e', dash: '6 6' }]} />
                <div className="absolute top-3 start-3 z-10 flex gap-1.5"><span className="tag tag-w"><Icon name="tag" size={12} />شراء <i className="w-2.5 h-2.5 rounded-full bg-ink inline-block" /></span><span className="tag tag-w"><Icon name="key" size={12} />إيجار <i className="w-2.5 h-2.5 rounded-full bg-red inline-block" /></span></div>
              </div>
              <div className="hidden lg:block">{summary}</div>
            </div>
          </div>
          <div className="lg:hidden order-3">{summary}</div>
        </div>
      )}
      {modal && <LeadModal title="أكّد الجولة" sub={`${day} · ${route.length} عقارات تبدأ ${route[0]?.time}`} kind="tour" listingIds={route.map((r) => r.l.id)} onClose={() => setModal(false)} buildMessage={() => `يوم الجولة: ${day}\n` + route.map((r) => `${r.time} — ${r.l.id}`).join('\n')} submitLabel="أكّد الجولة" done="وصل طلب الجولة — المستشار راح يأكد ويّاك المواعيد" />}
    </section>
  );
}
