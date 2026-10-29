import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { TYPE_GROUPS } from '../../lib/format.js';
import { Btn, Chip, Icon, Modal, Seg } from '../../components/ui.jsx';
import { CardGrid, Crumbs } from '../parts.jsx';
import { activeCount, applyFilters, readFilters } from '../filters.js';

// /buy and /rent — results page ported from the design reference (engine.js filter panel + the /search page frame).
// Filter state lives in the URL (readFilters/applyFilters); only the markup changed.

const SORTS = { new: 'الأحدث', low: 'السعر: من الأقل', high: 'السعر: من الأعلى' };
const BEDS = [['', 'أي'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4+']];
const PAYS = [['cash', 'كاش'], ['installments', 'تقسيط'], ['ready', 'جاهز'], ['construction', 'قيد الإنشاء']];
const FURNS = [['furnished', 'مفروش'], ['unfurnished', 'غير مفروش'], ['now', 'متاح الآن']];

// Collapsible filter group (reference engine.js `group()`).
function Group({ title, children, open = true }) {
  return (
    <details className="border-b hair py-4 group/f" open={open}>
      <summary className="flex items-center justify-between cursor-pointer text-[14px] font-semibold">{title}<Icon name="chev-d" size={16} className="text-ink-400 group-open/f:rotate-180 transition-transform" /></summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

export default function Results({ deal }) {
  const S = useSite();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const f = readFilters(sp);
  const rent = deal === 'rent';
  const title = rent ? 'عقارات للإيجار بأربيل' : 'عقارات للبيع بأربيل';
  useDocTitle(title);
  const list = applyFilters(S.visible, f, deal); // sold / rented stay visible (tagged) unless "available only" is on
  const active = activeCount(f);

  const set = (k, v) => { const n = new URLSearchParams(sp); if (v === '' || v == null || f[k] === String(v)) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const setDeal = (d) => { const n = new URLSearchParams(sp); n.delete('pay'); n.delete('furn'); n.delete('min'); n.delete('max'); nav(`/${d === 'rent' ? 'rent' : 'buy'}?${n}`); };
  const clear = () => setSp(new URLSearchParams(), { replace: true });

  const typeName = (k) => (TYPE_GROUPS.find((x) => x[0] === k) || [])[1] || k;
  const areaName = (id) => S.areas.find((a) => a.id === id)?.name || id;
  // Active-filter chips (reference `activeChips`): each one clears its own URL param.
  const chips = [];
  if (f.q) chips.push(['q', `“${f.q}”`]);
  if (f.type) chips.push(['type', typeName(f.type)]);
  if (f.area) chips.push(['area', areaName(f.area)]);
  if (f.min || f.max) chips.push(['price', `${f.min ? S.money(+f.min) : '0'} – ${f.max ? S.money(+f.max) : '∞'}${rent ? '/شهر' : ''}`]);
  if (f.beds) chips.push(['beds', `${f.beds}${f.beds === '4' ? '+' : ''} غرف`]);
  if (f.pay) chips.push(['pay', (PAYS.find((x) => x[0] === f.pay) || [])[1]]);
  if (f.furn) chips.push(['furn', (FURNS.find((x) => x[0] === f.furn) || [])[1]]);
  if (f.avail) chips.push(['avail', 'المتاحة فقط']);
  const dropChip = (k) => { if (k === 'price') { const n = new URLSearchParams(sp); n.delete('min'); n.delete('max'); setSp(n, { replace: true }); } else set(k, ''); };

  const sortSel = (cls) => (
    <select className={`field ${cls}`} aria-label="الترتيب" value={f.sort} onChange={(e) => set('sort', e.target.value === 'new' ? '' : e.target.value)}>
      {Object.entries(SORTS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
    </select>
  );

  const filters = (
    <>
      <div className="pb-4 border-b hair"><Seg full value={deal} options={[['sale', 'شراء', 'tag'], ['rent', 'إيجار', 'key']]} onChange={setDeal} /></div>
      {f.q && (
        <Group title="البحث"><button type="button" className="chip chip-sm !bg-paper-2 !border-transparent" onClick={() => set('q', '')}>{f.q}<Icon name="close" size={13} /></button></Group>
      )}
      <Group title="نوع العقار">
        <div className="flex flex-wrap gap-1.5">
          <Chip small on={!f.type} onClick={() => set('type', '')}>الكل</Chip>
          {TYPE_GROUPS.map(([k, t]) => <Chip key={k} small on={f.type === k} onClick={() => set('type', k)}>{t}</Chip>)}
        </div>
      </Group>
      <Group title="الموقع">
        <select className="field !h-11 !text-[14px]" value={f.area} onChange={(e) => set('area', e.target.value)}>
          <option value="">كل أربيل</option>{S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Group>
      <Group title={rent ? 'الإيجار الشهري' : 'سعر الشراء'}>
        <div className="flex items-center gap-2">
          <input className="field !h-11 !text-[14px] num" type="number" min="0" inputMode="numeric" placeholder="من" value={f.min} onChange={(e) => set('min', e.target.value)} />
          <span className="text-ink-400">–</span>
          <input className="field !h-11 !text-[14px] num" type="number" min="0" inputMode="numeric" placeholder="إلى" value={f.max} onChange={(e) => set('max', e.target.value)} />
          <span className="lbl whitespace-nowrap">{rent ? '$ / شهر' : 'USD'}</span>
        </div>
        {S.currency === 'IQD' && <div className="lbl mt-2">الفلترة بالدولار</div>}
      </Group>
      <Group title="الحالة">
        <div className="flex flex-wrap gap-1.5"><Chip small on={!!f.avail} onClick={() => set('avail', '1')}><Icon name="check" size={14} />المتاحة فقط</Chip></div>
        <div className="lbl mt-2">{f.avail ? 'تخفي المحجوز والمباع / المؤجّر' : 'المباع والمؤجّر يظهر بوسمه'}</div>
      </Group>
      <Group title="الغرف">
        <div className="lbl mb-2">غرف النوم</div>
        <div className="flex flex-wrap gap-1.5">{BEDS.map(([v, t]) => <Chip key={t} small on={f.beds === v} onClick={() => set('beds', v)} className="justify-center" style={{ minWidth: 44 }}>{t}</Chip>)}</div>
      </Group>
      {rent ? (
        <Group title="الفرش"><div className="flex flex-wrap gap-1.5">{FURNS.map(([v, t]) => <Chip key={v} small on={f.furn === v} onClick={() => set('furn', v)}>{t}</Chip>)}</div></Group>
      ) : (
        <Group title="طريقة الدفع"><div className="flex flex-wrap gap-1.5">{PAYS.map(([v, t]) => <Chip key={v} small on={f.pay === v} onClick={() => set('pay', v)}>{t}</Chip>)}</div></Group>
      )}
      <div className="pt-4 flex flex-col gap-2">
        <Btn kind="line" onClick={() => nav(`/map?deal=${deal}`)}><Icon name="map" size={16} />عرض على الخريطة</Btn>
        {active > 0 && <Btn kind="ghost" size="sm" className="text-red" onClick={clear}><Icon name="close" size={14} />مسح الفلاتر</Btn>}
      </div>
    </>
  );

  return (
    <section className="wrap pt-6 lg:pt-8 pb-16">
      <Crumbs items={[['الرئيسية', '/'], [title]]} />
      <div className="flex flex-wrap items-end justify-between gap-4 mt-3 mb-6">
        <h1 className="t-h1 text-[30px] sm:text-[40px]">{title}</h1>
        <Link to={`/map?deal=${deal}`} className="btn btn-line btn-sm"><Icon name="map" size={16} />الخريطة</Link>
      </div>

      <div>
        {/* mobile bar: filters sheet + sort */}
        <div className="lg:hidden sticky top-[72px] z-30 bg-white/95 backdrop-blur border-b hair -mx-4 md:-mx-7 px-4 md:px-7 py-2.5 flex items-center gap-2">
          <button type="button" className="btn btn-line btn-sm" onClick={() => setSheet(true)}><Icon name="sliders" size={16} />الفلاتر{active > 0 && <span className="badge-dot !static !ms-1">{active}</span>}</button>
          {sortSel('!h-[38px] !text-[13px] !rounded-[10px] !w-auto flex-1 min-w-0')}
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8 pt-4 lg:pt-0">
          <aside className="hidden lg:block"><div className="sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto no-sb pe-1">{filters}</div></aside>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="text-[15px]"><b className="num">{list.length}</b> <span className="text-ink-600">{rent ? 'عقار للإيجار' : 'عقار للبيع'}</span></div>
              <div className="hidden lg:flex items-center gap-2 ms-auto">{sortSel('!h-10 !text-[13.5px] !w-auto')}</div>
            </div>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {chips.map(([k, l]) => <button key={k} type="button" className="chip chip-sm !bg-paper-2 !border-transparent" onClick={() => dropChip(k)}>{l}<Icon name="close" size={13} /></button>)}
                {chips.length > 1 && <button type="button" className="text-[13px] font-semibold underline underline-offset-4 px-2" onClick={clear}>امسح الكل</button>}
              </div>
            )}
            {list.length ? <CardGrid list={list} /> : (
              <div className="panel-s p-8 sm:p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-white inline-flex items-center justify-center"><Icon name="search" size={24} /></div>
                <div className="t-h3 text-[22px] mt-4">ماكو تطابق كامل هسه</div>
                <p className="text-ink-600 mt-2 max-w-md mx-auto">لا توجد عقارات مطابقة حالياً. جرّب توسّع الفلاتر، أو شوف الخريطة.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {active > 0 && <Btn kind="dark" onClick={clear}><Icon name="close" size={16} />مسح الفلاتر</Btn>}
                  <Btn kind="line" onClick={() => nav(`/map?deal=${deal}`)}><Icon name="map" size={16} />عرض على الخريطة</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {sheet && (
        <Modal title="الفلاتر" sub={rent ? 'فلاتر الإيجار' : 'فلاتر الشراء'} onClose={() => setSheet(false)} bodyClass="px-5 pb-2" footer={<><Btn kind="line" onClick={clear}>إعادة</Btn><Btn kind="dark" className="flex-1" onClick={() => setSheet(false)}>اعرض {list.length} نتيجة</Btn></>}>
          {filters}
        </Modal>
      )}
    </section>
  );
}
