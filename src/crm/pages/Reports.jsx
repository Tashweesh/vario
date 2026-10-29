import { useState } from 'react';
import { useCrm, OsPage, Kpi, Sec, HBar, Bars, Av, Lmini } from '../CrmApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { STAGES } from '../../lib/format.js';
import { Chip } from '../../components/ui.jsx';

const PERIODS = { week: ['هذا الأسبوع', 7, 'الأسبوع الماضي'], month: ['هذا الشهر', 30, 'الشهر الماضي'], quarter: ['الربع', 90, 'الربع الماضي'] };

// Reports (reference os/dashboard.js): KPI row → pipeline bars + team leaderboard → lead sources + top listings.
export default function Reports() {
  useDocTitle('التقارير');
  const R = useCrm();
  const [p, setP] = useState('month');
  const days = PERIODS[p][1];
  const now = Date.now();
  const from = now - days * 864e5, prevFrom = from - days * 864e5;
  const inP = (iso, a = from, b = now) => iso && new Date(iso).getTime() >= a && new Date(iso).getTime() < b;

  const fresh = R.contacts.filter((c) => inP(c.created_at));
  const prev = R.contacts.filter((c) => inP(c.created_at, prevFrom, from)).length;
  const delta = prev ? Math.round(((fresh.length - prev) / prev) * 100) : null;
  const views = R.viewings.filter((v) => inP(v.scheduled_at, from, now + days * 864e5) && v.status !== 'cancelled');
  const contacted = R.contacts.filter((c) => c.stage !== 'new').length;
  const closed = R.contacts.filter((c) => c.stage === 'closed' && inP(c.closed_at));
  const resp = R.contacts.filter((c) => c.first_response_at && inP(c.created_at)).map((c) => (new Date(c.first_response_at) - new Date(c.created_at)) / 60000).filter((m) => m >= 0);
  const avg = resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length) : null;
  const fmtMin = (m) => (m == null ? '—' : m < 60 ? `${m} د` : m < 1440 ? `${(m / 60).toFixed(1)} س` : `${Math.round(m / 1440)} يوم`);

  const stages = STAGES.map(([id, label]) => ({ id, label, count: R.contacts.filter((c) => c.stage === id).length }));
  const srcBase = fresh.length ? fresh : R.contacts;
  const srcCount = srcBase.reduce((m, c) => ({ ...m, [c.source]: (m[c.source] || 0) + 1 }), {});
  const sources = Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([s, n]) => [s, Math.round((n / srcBase.length) * 100), n]);
  const maxSrc = Math.max(1, ...sources.map((s) => s[2]));
  const top = [...R.listings].filter((l) => l.status !== 'draft').sort((a, b) => b.leads - a.leads).slice(0, 4);
  const maxLeads = Math.max(1, ...top.map((l) => l.leads || 0));
  const team = R.agents.filter((a) => a.active).map((g) => ({ ...g, leads: R.contacts.filter((c) => c.agent_id === g.id).length, listings: R.listings.filter((l) => l.agent_id === g.id).length, won: R.contacts.filter((c) => c.agent_id === g.id && c.stage === 'closed').length })).sort((a, b) => b.won - a.won || b.leads - a.leads);
  const maxWon = Math.max(1, ...team.map((g) => g.won));
  const viewRate = contacted ? Math.round((R.contacts.filter((c) => ['viewing', 'offer', 'closed'].includes(c.stage)).length / contacted) * 100) : 0;
  const period = PERIODS[p][0];

  return (
    <>
      <OsPage title="التقارير" sub="أداء المبيعات والفريق · عملاء جدد، معاينات، صفقات ووقت الرد" actions={Object.entries(PERIODS).map(([k, [t]]) => <Chip small key={k} on={p === k} onClick={() => setP(k)}>{t}</Chip>)} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="عملاء جدد" value={fresh.length} icon="users" delta={delta} sub={delta == null ? `لا بيانات عن ${PERIODS[p][2]}` : `عن ${PERIODS[p][2]}`} />
        <Kpi label="معاينات" value={views.length} icon="cal" sub={`${viewRate}% من العملاء المتواصَل معهم`} />
        <Kpi label="صفقات مغلقة" value={closed.length} icon="key" sub={`${closed.filter((c) => c.deal !== 'rent').length} بيع · ${closed.filter((c) => c.deal === 'rent').length} إيجار`} />
        <Kpi label="متوسط وقت الرد" value={fmtMin(avg)} icon="clock" tone={avg != null && avg > 30 ? 'red' : undefined} sub={<span className={avg != null && avg > 30 ? 'text-red' : 'text-ok'}>الهدف: أقل من 30 دقيقة</span>} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Sec title="قمع التحويل" sub="العملاء المفتوحون حسب المرحلة" className="lg:col-span-2">
          <Bars series={stages.map((s) => ({ label: s.label, value: s.count, color: s.id === 'new' ? '#C8102E' : s.id === 'closed' ? '#1F7A4D' : '#1D1E22' }))} h={180} />
        </Sec>
        <Sec title="أداء الفريق" sub={`الصفقات المغلقة لكل وسيط · ${period}`}>
          {team.length === 0 ? <p className="lbl py-6 text-center">لا يوجد وسطاء نشطون.</p> : (
            <div className="grid gap-1">
              {team.map((g, i) => (
                <div key={g.id} className="grid items-center gap-x-2.5 gap-y-1 rounded-[10px] px-1.5 py-2 hover:bg-paper-2" style={{ gridTemplateColumns: '20px minmax(0,1fr) auto' }}>
                  <span className={`text-[12px] font-semibold num ${i === 0 ? 'text-red' : 'text-ink-400'}`}>{i + 1}</span>
                  <span className="flex items-center gap-2 min-w-0"><Av name={g.name} img={g.img} seed={g.id} size={26} /><span className="min-w-0"><span className="block text-[13px] font-semibold clamp-1">{g.name}</span><span className="block text-[11.5px] text-ink-500 clamp-1">{g.leads} عميل · {g.listings} عقار</span></span></span>
                  <span className="text-[13px] font-semibold num text-ok">{g.won} صفقة</span>
                  <span /><span className="col-span-2"><HBar v={g.won} max={maxWon} color={i === 0 ? '#C8102E' : '#3D4047'} h={4} /></span>
                </div>
              ))}
            </div>
          )}
        </Sec>
        <Sec title="مصادر العملاء" sub={`${srcBase.length} عميل · ${fresh.length ? period : 'كل الفترات'}`}>
          {sources.length === 0 ? <p className="lbl py-6 text-center">لا يوجد عملاء في هذه الفترة.</p> : (
            <div className="grid gap-2.5">
              {sources.map(([s, pct, n]) => (
                <div key={s} className="block rounded-[8px] -mx-1.5 px-1.5 py-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5"><span className="text-[12.5px] text-ink-600">{s}</span><span className="text-[12px] text-ink-500 num whitespace-nowrap"><b className="text-ink font-semibold">{n}</b> · {pct}%</span></div>
                  <HBar v={n} max={maxSrc} color={s === 'الموقع' ? '#C8102E' : '#3D4047'} h={5} />
                </div>
              ))}
            </div>
          )}
        </Sec>
        <Sec title="أكثر العقارات طلباً" sub="حسب عدد الطلبات على كل عقار" className="lg:col-span-2">
          {top.length === 0 ? <p className="lbl py-6 text-center">لا توجد عقارات منشورة بعد.</p> : (
            <div className="grid gap-2.5">
              {top.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 justify-between">
                  <Lmini l={l} className="flex-1 min-w-[200px]" />
                  <span className="flex items-center gap-3 flex-none"><span className="w-24 hidden sm:block"><HBar v={l.leads || 0} max={maxLeads} h={5} /></span><span className="num text-[13px] font-semibold whitespace-nowrap">{l.leads || 0} طلب</span></span>
                </div>
              ))}
            </div>
          )}
        </Sec>
      </div>
    </>
  );
}
