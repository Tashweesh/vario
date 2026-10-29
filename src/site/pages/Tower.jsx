import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { supabase } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Chip, Icon, Spinner } from '../../components/ui.jsx';
import { Crumbs, LeadModal, PageHead } from '../parts.jsx';

// Ported from the design reference: pages/tower.js (Tower Explorer). Unit data and selection logic are the app's.

// status → [background, text colour, label, border]
const ST = { free: ['#fff', '#1d1e22', 'متاح', '#1d1e22'], reserved: ['repeating-linear-gradient(135deg,#C6C8CC 0 2px,#F1F1EE 2px 5px)', '#1d1e22', 'محجوز', '#9DA0A7'], sold: ['#1d1e22', '#fff', 'مباع', '#1d1e22'] };
const Swatch = ({ s }) => <span className="w-3 h-3 rounded-[3px] border flex-none" style={{ background: ST[s][0], borderColor: ST[s][3] }} />;
const Legend = ({ className = '' }) => <div className={`flex flex-wrap items-center gap-3 text-[12.5px] text-ink-600 ${className}`}>{Object.keys(ST).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><Swatch s={s} />{ST[s][2]}</span>)}</div>;

export default function Tower() {
  const { projectId } = useParams();
  const S = useSite();
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

  if (!proj) return <section className="wrap pt-6 lg:pt-8 pb-16"><Crumbs items={[['الرئيسية', '/'], ['مشاريع جديدة', '/projects'], ['مستكشف البرج']]} /><div className="mt-5"><PageHead kicker="الأدوات" title="مستكشف البرج" sub="لا توجد أبراج منشورة حالياً." /></div><Link to="/projects" className="btn btn-line btn-sm mt-6">كل المشاريع</Link></section>;
  const shown = all ? floors : floors.slice(0, 12);
  const cur = floors.find((f) => f.n === floor);
  const free = cur ? cur.us.filter((u) => u.status === 'free') : [];
  const totalFree = floors.reduce((a, f) => a + f.us.filter((u) => u.status === 'free').length, 0);
  const idx = floors.findIndex((f) => f.n === floor);
  const go = (f) => { if (f) { setFloor(f.n); setUnit(null); } };
  const up = floors[idx - 1], down = floors[idx + 1];
  const from = free.length ? Math.min(...free.map((u) => u.price)) : null;
  const beds = cur ? [...new Set(cur.us.map((u) => u.beds))].sort((a, b) => a - b).join(' · ') : '';
  const calc = () => { const u = unit || free[0]; nav(`/tools/payment?price=${u.price}&down=${proj.plan_down || 20}&months=${proj.plan_months || 36}&handover=${proj.plan_handover}`); };
  const canCalc = !!(unit || free[0]);

  const UnitRow = ({ u }) => <button key={u.id} type="button" onClick={() => setUnit(u)} className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-[12px] border text-start transition-colors ${unit?.id === u.id ? 'border-ink bg-paper-2' : 'hair hover:border-ink'}`}><span><span className="font-semibold mono">{u.unit}</span> <span className="lbl">· {u.beds} غرف · {u.size} م²</span></span><b className="num text-[13.5px]" dir="ltr">{S.money(u.price)}</b></button>;

  return (
    <div className="pb-[90px] lg:pb-16">
      <style>{'.tw-u:not(:disabled):hover{border-color:#1D1E22;box-shadow:inset 0 0 0 1px #1D1E22}.tw-u:disabled{cursor:default}.tw-u:focus-visible{outline:2px solid #C8102E;outline-offset:2px}'}</style>
      <div className="wrap pt-5 lg:pt-7">
        <Crumbs items={[['مشاريع جديدة', '/projects'], [proj.name, proj.href], ['مستكشف البرج']]} />
        <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
          <div><div className="eyebrow mb-2">مستكشف البرج</div><h1 className="t-h1 text-[30px] sm:text-[42px]">{proj.name}</h1><p className="text-ink-600 mt-1">{proj.typeAr} · {proj.areaName}{proj.floors ? ` · ${proj.floors} طابق` : ''} · {proj.status === 'construction' ? <>{proj.progress}% منجز · <span dir="ltr">{proj.handover}</span></> : 'جاهز'}</p></div>
          <Link to={proj.href} className="btn btn-line btn-sm">تفاصيل المشروع<Icon name="arrow" size={15} className="flip-rtl" /></Link>
        </div>
        {towers.length > 1 && <div className="mt-5 flex gap-2 overflow-x-auto no-sb -mx-4 px-4 md:mx-0 md:px-0">{towers.map((t) => <Chip key={t.id} className="flex-none" on={t.id === proj.id} onClick={() => nav(`/tools/tower/${t.id}`, { replace: true })}><Icon name="tower" size={15} />{t.name}{t.floors ? <span className="opacity-60 num">{t.floors}F</span> : null}</Chip>)}</div>}
        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] bg-paper-2 px-4 py-3 text-[13px] text-ink-600"><Icon name="info" size={16} className="text-ink-400 mt-0.5" /><span><b className="text-ink">اختار الطابق، ثم الوحدة.</b> الطوابق العليا = إطلالة أوسع وسعر أعلى بقليل. ڤايرو يتأكد من الحالة الفعلية ويا المطوّر قبل أي حجز.</span></div>
        <div className="mt-5 flex flex-wrap items-center gap-2"><Legend className="ms-auto" /></div>
      </div>

      {!units ? <Spinner /> : floors.length === 0 ? (
        <div className="wrap mt-6"><div className="panel-s p-10 text-center"><div className="t-h3 text-[20px]">مخطط الوحدات لهذا البرج غير متوفر بعد.</div><p className="text-ink-600 mt-2">اسأل ڤايرو عن الوحدات المتاحة وقائمة الأسعار.</p><Link to={proj.href} className="btn btn-ink btn-sm mt-5">تفاصيل المشروع</Link></div></div>
      ) : (
        <div className="wrap mt-5 grid lg:grid-cols-[250px_minmax(0,1fr)_360px] gap-5 items-start">
          <div className="panel p-4 lg:sticky top-[88px]">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-[14px]">الواجهة</div><div className="lbl">{totalFree} متاح</div></div>
            <div className="flex flex-col gap-0.5">
              {shown.map((f) => {
                const on = f.n === floor, nf = f.us.filter((u) => u.status === 'free').length;
                return (
                  <button key={f.n} type="button" onClick={() => go(f)} className={`grid gap-1.5 items-center px-1.5 py-1 rounded-[8px] transition-colors ${on ? 'bg-red-50' : 'hover:bg-paper-2'}`} style={{ gridTemplateColumns: '28px 1fr 20px' }} aria-pressed={on} title={`الطابق ${f.n} · ${nf} متاح`}>
                    <span className={`text-[11px] mono text-start ${on ? 'text-red font-bold' : 'text-ink-400'}`}>{f.n}</span>
                    <span className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${f.us.length},1fr)` }}>{f.us.map((u) => <span key={u.id} className="h-3 rounded-[2px] border" style={{ background: ST[u.status][0], borderColor: ST[u.status][3] }} />)}</span>
                    <span className="text-[10px] mono font-semibold text-ink text-end">{nf || ''}</span>
                  </button>
                );
              })}
            </div>
            {floors.length > 12 && <button type="button" onClick={() => setAll(!all)} className="w-full mt-1 h-9 rounded-[10px] text-[12.5px] font-semibold text-ink-600 hover:bg-paper-2 inline-flex items-center justify-center gap-1.5">{all ? 'إخفاء الطوابق السفلى' : `الطوابق 1–${floors[11].n - 1} · اعرض الكل`}<Icon name="chev-d" size={14} className={all ? 'rotate-180' : ''} /></button>}
            <div className="lbl mt-2">اضغط على طابق حتى تفتحه</div>
          </div>

          <div className="min-w-0">
            <div className="panel p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="lbl">مخطط الطابق</div><div className="t-h3 text-[22px]">الطابق <span className="num">{floor ?? '—'}</span>{cur && <span className="text-[14px] text-ink-500 font-medium"> · {cur.us.length} وحدات · {free.length} متاحة</span>}</div></div>
                <div className="flex items-center gap-2"><Btn kind="line" size="sm" disabled={!down} onClick={() => go(down)}><Icon name="chev-d" size={16} />نزول</Btn><Btn kind="line" size="sm" disabled={!up} onClick={() => go(up)}><Icon name="chev-d" size={16} className="rotate-180" />صعود</Btn></div>
              </div>
              {cur ? (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {cur.us.map((u) => {
                    const sel = unit?.id === u.id, isFree = u.status === 'free';
                    return (
                      <button key={u.id} type="button" disabled={!isFree} onClick={() => setUnit(u)} aria-pressed={sel} className="tw-u text-start p-3 rounded-[12px] border transition-colors" style={{ background: sel ? '#FDF2F4' : ST[u.status][0], color: ST[u.status][1], borderColor: sel ? '#C8102E' : ST[u.status][3], boxShadow: sel ? 'inset 0 0 0 1.5px #C8102E' : undefined }}>
                        <div className="flex items-center justify-between gap-2"><span className="mono font-bold text-[15px]">{u.unit}</span><span className="text-[10.5px] font-semibold opacity-80">{ST[u.status][2]}</span></div>
                        <div className="text-[11.5px] opacity-70 mt-1">{u.beds} غرف · {u.size} م²</div>
                        <div className="num font-semibold text-[13px] mt-1.5" dir="ltr">{isFree ? S.money(u.price) : '—'}</div>
                      </button>
                    );
                  })}
                </div>
              ) : <div className="mt-4 rounded-[12px] bg-paper-2 p-4 text-[13.5px] text-ink-600">اختار طابق من الواجهة.</div>}
              {cur && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[[`${free.length} / ${cur.us.length}`, 'متاح'], [from ? S.money(from) : '—', 'يبدأ من'], [beds || '—', 'غرف نوم']].map(([v, l]) => <div key={l} className="rounded-[12px] bg-paper-2 p-2.5"><div className="font-semibold num text-[15px]" dir="ltr">{v}</div><div className="lbl">{l}</div></div>)}
                </div>
              )}
              <Legend className="mt-3 justify-center text-[12px] lg:hidden" />
            </div>
          </div>

          <aside className="lg:sticky top-[88px]">
            <div className="panel p-5 shadow-card">
              {unit ? (
                <>
                  <div className="flex items-start justify-between gap-3"><div><div className="lbl">الوحدة · الطابق {unit.floor}</div><div className="text-[30px] font-semibold mono leading-tight">{unit.unit}</div></div><span className="tag bg-white border border-ink text-ink">{ST[unit.status][2]}</span></div>
                  <div className="mt-3"><div className="text-[28px] font-semibold num" dir="ltr">{S.money(unit.price)}</div>{unit.size > 0 && <div className="lbl">{S.money(Math.round(unit.price / unit.size))} للمتر</div>}</div>
                  <dl className="grid grid-cols-2 gap-px bg-line rounded-[14px] overflow-hidden border hair mt-4 text-[13.5px]">
                    {[['المساحة', `${unit.size} م²`], ['غرف النوم', unit.beds], ['الطابق', `${unit.floor} / ${floors[0]?.n ?? unit.floor}`], ['البرج', proj.name]].map(([l, v]) => <div key={l} className="bg-white p-3"><dt className="lbl">{l}</dt><dd className="font-semibold num mt-0.5 clamp-1">{v}</dd></div>)}
                  </dl>
                </>
              ) : (
                <>
                  <div className="lbl">الطابق {floor ?? '—'}</div>
                  <div className="t-h3 text-[20px] mt-1">اختار وحدة من المخطط</div>
                  <p className="text-[13.5px] text-ink-600 mt-1">الوحدات البيضة بإطار غامق متاحة. كل وحدة تبيّن المساحة والغرف والسعر.</p>
                  <div className="mt-4 space-y-1.5">
                    {free.slice(0, 5).map((u) => <UnitRow key={u.id} u={u} />)}
                    {cur && free.length === 0 && <div className="rounded-[12px] bg-paper-2 p-3 text-[13px] text-ink-600">كل وحدات هذا الطابق محجوزة أو مباعة. جرّب طابق ثاني.</div>}
                  </div>
                </>
              )}
              <div className="grid gap-2 mt-5">
                <Btn kind={unit ? 'red' : 'line'} disabled={!unit} onClick={() => setLead(true)}><Icon name="cal" size={17} />اطلب حجز الوحدة</Btn>
                <Btn kind={unit ? 'line' : 'dark'} disabled={!canCalc} onClick={calc}><Icon name="chart" size={17} />احسب الأقساط لهذي الوحدة</Btn>
              </div>
              <p className="lbl mt-3">ڤايرو يتأكد من التوفّر والسعر ويا المطوّر قبل الحجز.</p>
            </div>
          </aside>
        </div>
      )}

      {units && floors.length > 0 && (
        <div className="fixed bottom-[60px] inset-x-0 z-40 lg:hidden bg-white border-t hair px-4 py-2.5 flex items-center gap-2">
          {unit ? (
            <><div className="min-w-0 flex-1"><div className="lbl">الوحدة <span className="mono">{unit.unit}</span> · الطابق {unit.floor}</div><div className="font-semibold num" dir="ltr">{S.money(unit.price)}</div></div><Btn kind="line" size="sm" onClick={calc}><Icon name="chart" size={15} />الأقساط</Btn><Btn kind="red" size="sm" onClick={() => setLead(true)}>اطلب حجز</Btn></>
          ) : (
            <><div className="min-w-0 flex-1"><div className="lbl">الطابق {floor ?? '—'} · {free.length} متاح</div><div className="font-semibold num" dir="ltr">{from ? S.money(from) : '—'}</div></div><Btn kind="dark" size="sm" disabled={!canCalc} onClick={calc}><Icon name="chart" size={15} />احسب الأقساط</Btn></>
          )}
        </div>
      )}

      {lead && unit && <LeadModal title="طلب حجز وحدة" sub={`${proj.name} · الطابق ${unit.floor} · وحدة ${unit.unit} · ${S.money(unit.price)}`} kind="brochure" deal="sale" budget={unit.price} onClose={() => setLead(false)} buildMessage={() => `${proj.name} — الطابق ${unit.floor} وحدة ${unit.unit} (${unit.beds} غرف، ${unit.size} م²) بسعر $${unit.price}`} submitLabel="أرسل طلب الحجز" />}
    </div>
  );
}
