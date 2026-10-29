import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCms } from '../CmsApp.jsx';
import { supabase, q, uploadMedia } from '../../lib/supabase.js';
import { useDocTitle } from '../../lib/hooks.js';
import { AMEN, PROJECT_TYPES, usd } from '../../lib/format.js';
import { Btn, Field, Icon, Img, Spinner, Toggle, useToast } from '../../components/ui.jsx';
import { Kpi, Lmini, Osb, OsCard, OsEmpty, OsTable, PageTitle, SwRow } from '../../staff/Shell.jsx';
import { LocationPicker } from '../../components/MapView.jsx';

const F = 'field !h-10 !text-[13.5px]';

// Ported from the reference's projects directory + project editor (os/web.js /web/projects, /web/projects/:id).
export function ProjectsList() {
  useDocTitle('المشاريع');
  const C = useCms();
  const nav = useNavigate();
  const constr = C.projects.filter((p) => p.status === 'construction').length;
  return (
    <>
      <PageTitle sub="الأبراج والمجمعات بالموقع — عدّل اللي يقراه الزبون، اخفي أو ميّز مشروع" action={<><a href="/projects" target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />المشاريع بالموقع</a><Btn kind="red" size="sm" onClick={() => nav('/cms/projects/new')}><Icon name="plus" size={15} />مشروع جديد</Btn></>}>المشاريع</PageTitle>
      <div className="os-kpis" style={{ '--n': 3 }}>
        <Kpi label="المشاريع" value={C.projects.length} sub={`${constr} قيد الإنشاء · ${C.projects.length - constr} جاهز`} icon="compound" />
        <Kpi label="عقارات مرتبطة بمشاريع" value={C.projects.reduce((a, p) => a + p.unitCount, 0)} icon="building" to="/cms/listings" />
        <Kpi label="مخفي من الموقع" value={C.projects.filter((p) => !p.published).length} sub="ما يظهر بصفحة المشاريع" icon="eye" />
      </div>
      {C.projects.length === 0 ? <OsEmpty icon="compound" title="لا توجد مشاريع بعد" action={<Btn kind="dark" size="sm" onClick={() => nav('/cms/projects/new')}>مشروع جديد</Btn>}>أضف أول مشروع حتى يظهر بصفحة المشاريع.</OsEmpty> : (
        <OsTable head={['المشروع', 'المطوّر', 'المنطقة', 'الإنجاز', { label: 'الوحدات', cls: 'num' }, 'الحالة', '']}>
          {C.projects.map((p) => (
            <tr key={p.id} className="cursor-pointer" onClick={() => nav(`/cms/projects/${p.id}`)}>
              <td><div className="min-w-[220px] flex items-center gap-2"><Lmini img={p.img} title={p.name} sub={`${p.typeAr} · ${p.floors} طابق`} />{!p.published && <Osb tone="amber">مخفي</Osb>}</div></td>
              <td className="text-[13px]">{p.devName || <span className="text-ink-400">بانتظار التأكيد</span>}</td>
              <td className="text-[13px]">{p.areaName}</td>
              <td><div className="min-w-[140px]"><div className="w-full h-1.5 rounded-full bg-paper-3 overflow-hidden"><div className="h-full rounded-full bg-red" style={{ width: `${Math.min(100, Math.max(0, +p.progress || 0))}%` }} /></div><div className="text-[11.5px] text-ink-500 num mt-1 whitespace-nowrap">{p.progress}% · {p.handover}</div></div></td>
              <td className="num whitespace-nowrap">{p.unitCount} <span className="text-ink-400">على الموقع</span></td>
              <td>{p.status === 'ready' ? <Osb tone="green">جاهز</Osb> : <Osb tone="amber">قيد الإنشاء</Osb>}</td>
              <td className="text-end"><button type="button" className="btn btn-line btn-sm !h-8" onClick={(e) => { e.stopPropagation(); nav(`/cms/projects/${p.id}`); }}>تعديل</button></td>
            </tr>
          ))}
        </OsTable>
      )}
    </>
  );
}

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const NUMS = ['progress', 'floors', 'units', 'price_from', 'plan_down', 'plan_months', 'plan_handover', 'sort'];
const GEO = ['lat', 'lng'];
const FIELDS = ['name', 'name_en', 'type', 'area_id', 'developer_id', 'status', 'handover', 'img', 'tagline', 'amenities', 'published', ...GEO, ...NUMS];

export function ProjectEditor() {
  const { id } = useParams();
  const isNew = !id;
  const C = useCms();
  const nav = useNavigate();
  const toast = useToast();
  const p = isNew ? null : C.projects.find((x) => x.id === id);
  const initial = useMemo(() => (p ? Object.fromEntries(FIELDS.map((k) => [k, p[k] ?? ''])) : { name: '', name_en: '', type: 'tower', area_id: C.areas[0]?.id || '', developer_id: C.devs[0]?.id || '', status: 'construction', handover: '', img: '', tagline: '', amenities: [], published: true, progress: 0, floors: 1, units: 0, price_from: 0, plan_down: 20, plan_months: 36, plan_handover: 10, sort: C.projects.length, lat: '', lng: '' }), [p?.updated_at, id]);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(initial), [initial]);
  useDocTitle(isNew ? 'مشروع جديد' : p?.name);
  if (!isNew && !p) return <OsEmpty icon="compound" title="المشروع غير موجود" action={<Btn kind="dark" size="sm" onClick={() => nav('/cms/projects')}>كل المشاريع</Btn>}>{id}</OsEmpty>;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));
  const units = C.listings.filter((l) => l.project_id === id);

  const save = async () => {
    if (!f.name.trim()) return toast('أدخل اسم المشروع', 'error');
    if (+f.plan_down + +f.plan_handover > 100) return toast('مجموع الدفعة الأولى والتسليم أكبر من 100%', 'error');
    setBusy(true);
    try {
      const row = Object.fromEntries(FIELDS.map((k) => [k, GEO.includes(k) ? (f[k] === '' || f[k] == null ? null : +(+f[k]).toFixed(6)) : NUMS.includes(k) ? Math.round(+f[k] || 0) : f[k] === '' ? null : f[k]]));
      row.progress = Math.min(100, Math.max(0, row.progress));
      if (row.status === 'ready') row.progress = 100;
      if (isNew) {
        const pid = slug(f.name_en || '') || `project-${Date.now().toString(36)}`;
        await q(supabase.from('projects').insert({ ...row, id: pid }));
        await C.reload();
        toast('أُنشئ المشروع');
        nav(`/cms/projects/${pid}`, { replace: true });
      } else {
        await q(supabase.from('projects').update(row).eq('id', id));
        await C.reload();
        toast('تم الحفظ');
      }
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm(`حذف مشروع ${p.name}؟ العقارات المرتبطة تبقى بدون مشروع.`)) return;
    try { await q(supabase.from('projects').delete().eq('id', id)); await C.reload(); nav('/cms/projects', { replace: true }); toast('حُذف المشروع'); } catch (e) { toast(e.message, 'error'); }
  };
  const cover = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const up = await uploadMedia(file, `projects/${id || 'new'}`); setF((s) => ({ ...s, img: up.url })); toast('رُفعت الصورة — اضغط حفظ'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const amen = (k) => setF((s) => ({ ...s, amenities: s.amenities.includes(k) ? s.amenities.filter((x) => x !== k) : [...s.amenities, k] }));
  const inp = (k, extra = {}) => <input className={F} value={f[k]} onChange={set(k)} {...extra} />;
  const numIn = (k, extra = {}) => <input className={`${F} num`} type="number" min="0" dir="ltr" value={f[k]} onChange={set(k)} {...extra} />;

  return (
    <>
      <PageTitle crumbs={[['المشاريع', '/cms/projects'], [f.name || 'مشروع جديد']]}
        sub={<>{PROJECT_TYPES[f.type]}{C.A[f.area_id] ? ` · ${C.A[f.area_id].name}` : ''} · <span className="mono text-[12.5px]">{isNew ? 'جديد' : id}</span></>}
        action={<>
          {!isNew && <a href={`/projects/${id}`} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="globe" size={15} />شوف بالموقع<Icon name="arrow-up" size={13} className="opacity-60" /></a>}
          <Btn kind="red" size="sm" disabled={busy} onClick={save}><Icon name="globe" size={15} />{isNew ? 'إنشاء المشروع' : 'حفظ ونشر'}</Btn>
        </>}>{f.name || 'مشروع جديد'}</PageTitle>
      <div className="os-cols" style={{ '--side': '400px' }}>
        <div className="grid gap-5 min-w-0">
          <OsCard title="الاسم والوصف">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="اسم المشروع (عربي)">{inp('name', { required: true })}</Field>
              <Field label="الاسم (English)" hint={isNew ? 'يُستخدم لرابط المشروع' : undefined}>{inp('name_en', { dir: 'ltr' })}</Field>
              <Field label="النوع"><select className={F} value={f.type} onChange={set('type')}>{Object.entries(PROJECT_TYPES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
              <Field label="المطوّر"><select className={F} value={f.developer_id} onChange={set('developer_id')}>{C.devs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
              <Field label="المنطقة"><select className={F} value={f.area_id} onChange={set('area_id')}>{C.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="الشعار · بالبطاقات وصفحة المشروع">{inp('tagline')}</Field>
            </div>
          </OsCard>
          <OsCard title="الحالة والتسليم والأسعار">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="الحالة"><select className={F} value={f.status} onChange={set('status')}><option value="construction">قيد الإنشاء</option><option value="ready">جاهز</option></select></Field>
              <Field label="نسبة الإنجاز %">{numIn('progress', { max: 100, disabled: f.status === 'ready' })}</Field>
              <Field label="موعد التسليم">{inp('handover', { placeholder: 'الربع الرابع 2027' })}</Field>
              <Field label="الطوابق">{numIn('floors')}</Field>
              <Field label="إجمالي الوحدات">{numIn('units')}</Field>
              <Field label="يبدأ من (دولار)">{numIn('price_from')}</Field>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t hair">
              <Field label="خطة الدفع: دفعة أولى %">{numIn('plan_down', { max: 100 })}</Field>
              <Field label="الأقساط (شهر)">{numIn('plan_months')}</Field>
              <Field label="عند التسليم %">{numIn('plan_handover', { max: 100 })}</Field>
            </div>
            <p className="text-[11.5px] text-ink-500 mt-3">تظهر بصفحة المشروع ويستخدمها مختبر الدفع. العقارات المرتبطة تگدر تأخذ خطتها من المشروع.</p>
          </OsCard>
          <OsCard title="الخدمات">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(AMEN).map(([k, t]) => { const on = f.amenities.includes(k); return (
                <label key={k} className={`flex items-center gap-2 px-2.5 h-9 rounded-[10px] border text-[13px] cursor-pointer min-w-0 ${on ? 'border-ink bg-paper-2' : 'hair hover:border-ink-300'}`}><input type="checkbox" checked={on} onChange={() => amen(k)} /><span className="clamp-1">{t}</span></label>
              ); })}
            </div>
          </OsCard>
          <OsCard title="الموقع على الخريطة">
            <LocationPicker value={f.lat !== '' && f.lng !== '' ? { lat: f.lat, lng: f.lng } : null} fallback={C.A[f.area_id]} clearable height={240} onChange={(pt) => setF((s) => ({ ...s, lat: pt ? pt.lat : '', lng: pt ? pt.lng : '' }))} hint="بدون تحديد، يظهر المشروع ضمن منطقته على الخريطة العامة" />
          </OsCard>
          {!isNew && f.type === 'tower' && <UnitsGrid project={p} />}
        </div>
        <aside className="os-aside grid gap-5 min-w-0">
          <OsCard title="صورة الغلاف">
            <Img src={f.img} className="w-full rounded-[12px]" style={{ aspectRatio: '16/10' }} />
            <span className="btn btn-line btn-sm w-full mt-3 cursor-pointer" role="button"><Icon name="upload" size={15} />{busy ? '…' : 'تغيير الصورة'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => cover(e.target.files?.[0])} /></span>
            <input className="field !h-9 !text-[12.5px] mono mt-2" dir="ltr" placeholder="أو رابط صورة" value={f.img} onChange={set('img')} />
          </OsCard>
          <OsCard title="بالموقع">
            <SwRow label="ظاهر في الموقع" sub="يظهر في صفحة المشاريع وقوائم الرئيسية"><Toggle on={!!f.published} label="ظاهر في الموقع" onChange={(v) => setF((s) => ({ ...s, published: v }))} /></SwRow>
          </OsCard>
          {!isNew && (
            <OsCard title="عقارات هالمشروع" extra={<span className="text-[12px] text-ink-500 num">{units.length}</span>}>
              {units.length === 0 ? <p className="text-[13px] text-ink-500">ماكو عقارات ڤايرو بهالمشروع بعد.</p> : (
                <div className="grid gap-1.5">
                  {units.map((l) => <button type="button" key={l.id} onClick={() => nav(`/cms/listings/${l.id}`)} className="flex items-center justify-between gap-2 px-3 h-10 rounded-[10px] border hair text-[13px] hover:border-ink-300 text-start min-w-0"><span className="mono font-semibold text-[12.5px]">{l.id}</span><span className="text-ink-500 clamp-1 min-w-0">{l.facts}</span></button>)}
                </div>
              )}
              <button type="button" onClick={() => nav('/cms/listings/new')} className="btn btn-line btn-sm w-full mt-3 text-ink-500" style={{ borderStyle: 'dashed' }}><Icon name="plus" size={15} />إضافة وحدة لهذا المشروع</button>
            </OsCard>
          )}
          {!isNew && <Btn size="sm" className="text-red" style={{ borderColor: '#f5c6cf' }} onClick={del}><Icon name="trash" size={15} />حذف المشروع</Btn>}
        </aside>
      </div>
    </>
  );
}

// Tower Explorer availability: click a unit to cycle متاح → محجوز → مباع. Can generate the grid.
function UnitsGrid({ project }) {
  const toast = useToast();
  const [units, setUnits] = useState(null);
  const [gen, setGen] = useState({ perFloor: 6, beds: 2, size: 128 });
  const load = () => supabase.from('project_units').select('*').eq('project_id', project.id).order('floor', { ascending: false }).order('unit').then(({ data }) => setUnits(data || []));
  useEffect(() => { load(); }, [project.id]);
  const NEXT = { free: 'reserved', reserved: 'sold', sold: 'free' };
  const COL = { free: ['#fff', '#1d1e22'], reserved: ['#fbf3e2', '#8a5a0b'], sold: ['#1d1e22', '#fff'] };
  const cycle = async (u) => {
    const status = NEXT[u.status];
    setUnits((s) => s.map((x) => (x.id === u.id ? { ...x, status } : x)));
    const { error } = await supabase.from('project_units').update({ status }).eq('id', u.id);
    if (error) { toast(error.message, 'error'); load(); }
  };
  const generate = async () => {
    if (!window.confirm(`إنشاء ${project.floors * gen.perFloor} وحدة (${project.floors} طابق × ${gen.perFloor})؟`)) return;
    const letters = 'ABCDEFGHIJ'.slice(0, gen.perFloor).split('');
    const rows = [];
    for (let n = 1; n <= project.floors; n++) letters.forEach((u) => rows.push({ project_id: project.id, floor: n, unit: u, beds: +gen.beds, size: +gen.size, price: Math.round((project.price_from * (1 + 0.006 * n)) / 1000) * 1000, status: 'free' }));
    const { error } = await supabase.from('project_units').upsert(rows, { onConflict: 'project_id,floor,unit', ignoreDuplicates: true });
    if (error) toast(error.message, 'error'); else { toast('أُنشئت الوحدات'); load(); }
  };
  const floors = useMemo(() => { const m = new Map(); (units || []).forEach((u) => { if (!m.has(u.floor)) m.set(u.floor, []); m.get(u.floor).push(u); }); return [...m.entries()]; }, [units]);
  const counts = (units || []).reduce((a, u) => ({ ...a, [u.status]: (a[u.status] || 0) + 1 }), {});
  return (
    <OsCard title="مستكشف البرج · توفر الوحدات" sub="اضغط على الوحدة لتغيير حالتها: متاح ← محجوز ← مباع" extra={units?.length > 0 && <span className="text-[12px] text-ink-500 num whitespace-nowrap">{counts.free || 0} متاح · {counts.reserved || 0} محجوز · {counts.sold || 0} مباع</span>}>
      {units === null ? <Spinner pad={20} /> : units.length === 0 ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="وحدات بالطابق" style={{ width: 120 }}><input className={`${F} num`} type="number" min="1" max="10" dir="ltr" value={gen.perFloor} onChange={(e) => setGen({ ...gen, perFloor: Math.min(10, Math.max(1, +e.target.value)) })} /></Field>
          <Field label="غرف (افتراضي)" style={{ width: 120 }}><input className={`${F} num`} type="number" min="0" dir="ltr" value={gen.beds} onChange={(e) => setGen({ ...gen, beds: e.target.value })} /></Field>
          <Field label="مساحة م² (افتراضي)" style={{ width: 140 }}><input className={`${F} num`} type="number" min="1" dir="ltr" value={gen.size} onChange={(e) => setGen({ ...gen, size: e.target.value })} /></Field>
          <Btn kind="dark" size="sm" className="!h-10" onClick={generate}><Icon name="grid" size={15} />إنشاء شبكة الوحدات</Btn>
        </div>
      ) : (
        <div className="max-h-[380px] overflow-y-auto grid gap-1">
          {floors.map(([n, us]) => (
            <div key={n} className="grid gap-2 items-center" style={{ gridTemplateColumns: '40px 1fr' }}>
              <span className="text-[12.5px] font-semibold text-ink-500 num">{n}</span>
              <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${us.length},1fr)` }}>
                {us.map((u) => <button type="button" key={u.id} title={`${u.unit} · ${u.beds ?? '–'} غرف · ${u.size ?? '–'} م² · ${usd(u.price)}`} onClick={() => cycle(u)} className="h-7 rounded-[6px] border hair text-[11px] font-semibold mono" style={{ background: COL[u.status][0], color: COL[u.status][1] }}>{u.unit}</button>)}
              </span>
            </div>
          ))}
        </div>
      )}
    </OsCard>
  );
}
