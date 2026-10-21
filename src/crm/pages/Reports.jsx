import { useState } from 'react';
import { useCrm } from '../CrmApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { STAGES } from '../../lib/format.js';
import { Chip } from '../../components/ui.jsx';
import { PageTitle } from '../../staff/Shell.jsx';

const card = { background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, padding: 18 };
const panel = { background: '#fff', border: '1px solid #e7e7e3', borderRadius: 16, padding: 22 };
const PERIODS = { week: ['هذا الأسبوع', 7, 'الأسبوع الماضي'], month: ['هذا الشهر', 30, 'الشهر الماضي'], quarter: ['الربع', 90, 'الربع الماضي'] };

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
  const maxStage = Math.max(1, ...stages.map((s) => s.count));
  const srcBase = fresh.length ? fresh : R.contacts;
  const srcCount = srcBase.reduce((m, c) => ({ ...m, [c.source]: (m[c.source] || 0) + 1 }), {});
  const sources = Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([s, n]) => [s, Math.round((n / srcBase.length) * 100)]);
  const top = [...R.listings].filter((l) => l.status !== 'draft').sort((a, b) => b.leads - a.leads).slice(0, 4);
  const team = R.agents.filter((a) => a.active).map((g) => ({ ...g, leads: R.contacts.filter((c) => c.agent_id === g.id).length, listings: R.listings.filter((l) => l.agent_id === g.id).length, won: R.contacts.filter((c) => c.agent_id === g.id && c.stage === 'closed').length }));
  const bar = (w, c) => <span style={{ height: 22, borderRadius: 6, background: '#f6f6f4', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: w + '%', background: c, borderRadius: 6, minWidth: w ? 4 : 0 }} /></span>;

  return (
    <>
      <PageTitle action={Object.entries(PERIODS).map(([k, [t]]) => <Chip key={k} on={p === k} onClick={() => setP(k)}>{t}</Chip>)}>التقارير</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div style={card}><div style={{ fontSize: 12.5, color: '#767a83' }}>عملاء جدد</div><div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{fresh.length}</div><div style={{ fontSize: 12, color: delta == null ? '#767a83' : delta >= 0 ? '#0f8a4f' : '#c8102e', marginTop: 2 }}>{delta == null ? `لا بيانات عن ${PERIODS[p][2]}` : `${delta >= 0 ? '+' : ''}${delta}% عن ${PERIODS[p][2]}`}</div></div>
        <div style={card}><div style={{ fontSize: 12.5, color: '#767a83' }}>معاينات</div><div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{views.length}</div><div style={{ fontSize: 12, color: '#767a83', marginTop: 2 }}>{contacted ? Math.round((R.contacts.filter((c) => ['viewing', 'offer', 'closed'].includes(c.stage)).length / contacted) * 100) : 0}% من العملاء المتواصَل معهم</div></div>
        <div style={card}><div style={{ fontSize: 12.5, color: '#767a83' }}>صفقات مغلقة</div><div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{closed.length}</div><div style={{ fontSize: 12, color: '#767a83', marginTop: 2 }}>{closed.filter((c) => c.deal !== 'rent').length} بيع · {closed.filter((c) => c.deal === 'rent').length} إيجار</div></div>
        <div style={card}><div style={{ fontSize: 12.5, color: '#767a83' }}>متوسط وقت الرد</div><div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{fmtMin(avg)}</div><div style={{ fontSize: 12, color: avg != null && avg > 30 ? '#c8102e' : '#0f8a4f', marginTop: 2 }}>الهدف: أقل من 30 دقيقة</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div style={panel}><div style={{ fontWeight: 600, marginBottom: 16 }}>قمع التحويل</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{stages.map((s) => <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', gap: 12, alignItems: 'center', fontSize: 13 }}><span>{s.label}</span>{bar(Math.round((s.count / maxStage) * 100), '#1d1e22')}<b>{s.count}</b></div>)}</div>
        </div>
        <div style={panel}><div style={{ fontWeight: 600, marginBottom: 16 }}>أداء الفريق</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{team.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 64px 64px 56px', gap: 10, alignItems: 'center', fontSize: 13 }}>
              {g.img ? <img src={g.img} alt="" style={{ width: 28, height: 28, borderRadius: 999, objectFit: 'cover' }} /> : <span style={{ width: 28, height: 28, borderRadius: 999, background: '#1d1e22' }} />}
              <span style={{ fontWeight: 600 }}>{g.name}</span><span style={{ color: '#767a83' }}>{g.leads} عميل</span><span style={{ color: '#767a83' }}>{g.listings} عقار</span><span style={{ color: '#0f8a4f' }}>{g.won} صفقة</span>
            </div>
          ))}</div>
        </div>
        <div style={panel}><div style={{ fontWeight: 600, marginBottom: 16 }}>مصادر العملاء</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>{sources.map(([s, pct]) => <div key={s} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', gap: 12, alignItems: 'center' }}><span>{s}</span>{bar(pct, '#c8102e')}<b>{pct}%</b></div>)}</div>
        </div>
        <div style={panel}><div style={{ fontWeight: 600, marginBottom: 16 }}>أكثر العقارات طلباً</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{top.map((l) => <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>{l.img && <img src={l.img} alt="" style={{ width: 40, height: 32, borderRadius: 6, objectFit: 'cover' }} />}<span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</span><span style={{ color: '#767a83' }}>{l.leads} طلب</span></div>)}</div>
        </div>
      </div>
    </>
  );
}
