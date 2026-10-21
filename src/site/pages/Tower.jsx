import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Chip, Spinner } from '../../components/ui.jsx';
import { LeadModal, PageHead } from '../parts.jsx';

const ST = { free: ['#fff', '#1d1e22', 'متاح'], reserved: ['#f5c6cf', '#1d1e22', 'محجوز'], sold: ['#1d1e22', '#fff', 'مباع'] };

export default function Tower() {
  const { projectId } = useParams();
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const towers = S.projs.filter((p) => p.type === 'tower');
  const proj = towers.find((p) => p.id === projectId) || towers[0];
  useDocTitle('مستكشف البرج');
  const [units, setUnits] = useState(null);
  const [floor, setFloor] = useState(null);
  const [all, setAll] = useState(false);
  const [unit, setUnit] = useState(null);
  const [lead, setLead] = useState(false);

  useEffect(() => {
    if (!proj) return;
    setUnits(null); setUnit(null);
    supabase.from('project_units').select('*').eq('project_id', proj.id).order('floor', { ascending: false }).order('unit')
      .then(({ data }) => { setUnits(data || []); const top = data?.[0]?.floor; setFloor(top ? Math.max(1, Math.round(top * 0.56)) : null); });
  }, [proj?.id]);

  const floors = useMemo(() => {
    const m = new Map();
    (units || []).forEach((u) => { if (!m.has(u.floor)) m.set(u.floor, []); m.get(u.floor).push(u); });
    return [...m.entries()].map(([n, us]) => ({ n, us }));
  }, [units]);

  if (!proj) return <section style={{ paddingTop: 28 }}><PageHead kicker="الأدوات" title="مستكشف البرج" h1Fs={L.h1Fs} sub="لا توجد أبراج منشورة حالياً." /></section>;
  const shown = all ? floors : floors.slice(0, 12);
  const cur = floors.find((f) => f.n === floor);
  const free = cur ? cur.us.filter((u) => u.status === 'free') : [];

  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker={`الأدوات · ${proj.name}`} title="مستكشف البرج" h1Fs={L.h1Fs} sub="اختار الطابق، ثم الوحدة. الطوابق العليا = إطلالة أوسع وسعر أعلى بقليل." />
      {towers.length > 1 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>{towers.map((t) => <Chip key={t.id} on={t.id === proj.id} onClick={() => nav(`/tools/tower/${t.id}`, { replace: true })}>{t.name}</Chip>)}</div>}
      {!units ? <Spinner /> : floors.length === 0 ? (
        <div style={{ marginTop: 24, padding: 40, textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 20 }}>مخطط الوحدات لهذا البرج غير متوفر بعد.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: L.sideCols, gap: 28, marginTop: 24, alignItems: 'start' }}>
          <div style={{ border: '1px solid #e7e7e3', borderRadius: 20, padding: L.phone ? 10 : 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#767a83', padding: '0 8px 8px' }}>
              {Object.values(ST).map(([bg, , t]) => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: bg === '#fff' ? '1px solid #d8d8d3' : 0 }} />{t}</span>)}
            </div>
            {shown.map((f) => (
              <button key={f.n} className="h-bg" onClick={() => { setFloor(f.n); setUnit(null); }} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 8, alignItems: 'center', padding: '4px 8px', borderRadius: 10, border: 0, background: f.n === floor ? '#f6f6f4' : 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', outline: f.n === floor ? '1.5px solid #1d1e22' : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: f.n === floor ? '#1d1e22' : '#767a83', fontVariantNumeric: 'tabular-nums' }}>{f.n}</span>
                <span style={{ display: 'grid', gridTemplateColumns: `repeat(${f.us.length},1fr)`, gap: 4 }}>
                  {f.us.map((u) => <span key={u.id} style={{ height: 28, borderRadius: 6, border: '1px solid #d8d8d3', background: ST[u.status][0], color: ST[u.status][1], fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{u.unit}</span>)}
                </span>
              </button>
            ))}
            {floors.length > 12 && <button onClick={() => setAll(!all)} style={{ fontSize: 12.5, color: '#767a83', textAlign: 'center', padding: 8, border: 0, background: 'transparent', cursor: 'pointer' }}>{all ? 'إخفاء الطوابق السفلى' : `… الطوابق 1–${floors[11].n - 1} · اعرض الكل`}</button>}
          </div>
          <aside style={{ position: L.asidePos, top: 92, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid #e7e7e3', borderRadius: 20, padding: 22 }}>
              <div style={{ fontSize: 12, color: '#767a83' }}>الطابق المختار</div>
              <div style={{ fontSize: 34, fontWeight: 700, marginTop: 2 }}>{floor ?? '—'}</div>
              {cur && <div style={{ fontSize: 13.5, color: '#5a5e68', marginTop: 4 }}>{cur.us.length} وحدات · {free.length} متاحة</div>}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {free.length === 0 && cur && <div style={{ fontSize: 13.5, color: '#767a83' }}>كل وحدات هذا الطابق محجوزة أو مباعة.</div>}
                {free.map((u) => (
                  <button key={u.id} onClick={() => setUnit(u)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', border: unit?.id === u.id ? '2px solid #1d1e22' : '1px solid #e7e7e3', borderRadius: 12, fontSize: 14, background: '#fff', cursor: 'pointer', gap: 8 }}>
                    <span>وحدة {u.unit} · {u.beds} غرف · {u.size} م²</span><span style={{ fontWeight: 700 }} dir="ltr">{S.money(u.price)}</span>
                  </button>
                ))}
              </div>
              <Btn kind="dark" h={46} fs={14.5} style={{ marginTop: 16, width: '100%' }} disabled={!unit && !free[0]} onClick={() => { const u = unit || free[0]; nav(`/tools/payment?price=${u.price}&down=${proj.plan_down || 20}&months=${proj.plan_months || 36}&handover=${proj.plan_handover}`); }}>احسب الأقساط لهذي الوحدة</Btn>
              <Btn h={42} style={{ marginTop: 8, width: '100%' }} disabled={!unit} onClick={() => setLead(true)}>اطلب حجز الوحدة</Btn>
            </div>
          </aside>
        </div>
      )}
      {lead && unit && <LeadModal title="طلب حجز وحدة" sub={`${proj.name} · الطابق ${unit.floor} · وحدة ${unit.unit} · ${S.money(unit.price)}`} kind="brochure" deal="sale" budget={unit.price} onClose={() => setLead(false)} buildMessage={() => `${proj.name} — الطابق ${unit.floor} وحدة ${unit.unit} (${unit.beds} غرف، ${unit.size} م²) بسعر $${unit.price}`} submitLabel="أرسل طلب الحجز" />}
    </section>
  );
}
