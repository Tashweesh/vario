import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { TYPE_GROUPS } from '../../lib/format.js';
import { Btn, Chip, Modal } from '../../components/ui.jsx';
import { CardGrid, Crumbs } from '../parts.jsx';
import { activeCount, applyFilters, readFilters } from '../filters.js';

const cap = { fontSize: 12, fontWeight: 600, color: '#767a83', marginBottom: 8 };
const box = { height: 42, border: '1px solid #d8d8d3', borderRadius: 10, padding: '0 12px', fontSize: 14 };

export default function Results({ deal }) {
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const f = readFilters(sp);
  const title = deal === 'rent' ? 'عقارات للإيجار بأربيل' : 'عقارات للبيع بأربيل';
  useDocTitle(title);
  const list = applyFilters(S.live, f, deal);

  const set = (k, v) => { const n = new URLSearchParams(sp); if (v === '' || v == null || f[k] === String(v)) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const setDeal = (d) => { const n = new URLSearchParams(sp); n.delete('pay'); n.delete('furn'); n.delete('min'); n.delete('max'); nav(`/${d === 'rent' ? 'rent' : 'buy'}?${n}`); };
  const SORTS = { new: 'مرتب حسب الأحدث', low: 'الأقل سعراً', high: 'الأعلى سعراً' };

  const filters = (
    <>
      <div style={{ display: 'flex', background: '#f6f6f4', borderRadius: 12, padding: 4, gap: 2 }}>
        {[['sale', 'للبيع'], ['rent', 'للإيجار']].map(([v, t]) => (
          <button key={v} onClick={() => setDeal(v)} aria-pressed={deal === v} style={{ flex: 1, height: 36, borderRadius: 9, border: 0, background: deal === v ? '#1d1e22' : 'transparent', color: deal === v ? '#fff' : '#1d1e22', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>
      {f.q && <div><div style={cap}>البحث</div><Chip on onClick={() => set('q', '')}>{f.q} ✕</Chip></div>}
      <div><div style={cap}>النوع</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Chip on={!f.type} onClick={() => set('type', '')}>الكل</Chip>
        {TYPE_GROUPS.map(([k, t]) => <Chip key={k} on={f.type === k} onClick={() => set('type', k)}>{t}</Chip>)}
      </div></div>
      <div><div style={cap}>المنطقة</div>
        <select className="sel" value={f.area} onChange={(e) => set('area', e.target.value)} style={{ ...box, width: '100%', background: '#fff', outline: 0 }}>
          <option value="">كل أربيل</option>{S.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></div>
      <div><div style={cap}>السعر {S.currency === 'IQD' ? '(بالدولار)' : ''}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input type="number" min="0" inputMode="numeric" placeholder="من" value={f.min} onChange={(e) => set('min', e.target.value)} style={{ ...box, outline: 0, width: '100%' }} />
        <input type="number" min="0" inputMode="numeric" placeholder="إلى" value={f.max} onChange={(e) => set('max', e.target.value)} style={{ ...box, outline: 0, width: '100%' }} />
      </div></div>
      <div><div style={cap}>غرف النوم</div><div style={{ display: 'flex', gap: 6 }}>
        {[['', 'أي'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4+']].map(([v, t]) => (
          <Chip key={t} on={f.beds === v} onClick={() => set('beds', v)} style={{ width: 38, padding: 0, justifyContent: 'center' }}>{t}</Chip>
        ))}
      </div></div>
      {deal === 'sale' ? (
        <div><div style={cap}>الدفع</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['cash', 'كاش'], ['installments', 'تقسيط'], ['ready', 'جاهز'], ['construction', 'قيد الإنشاء']].map(([v, t]) => <Chip key={v} on={f.pay === v} onClick={() => set('pay', v)}>{t}</Chip>)}
        </div></div>
      ) : (
        <div><div style={cap}>الفرش</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['furnished', 'مفروش'], ['unfurnished', 'غير مفروش'], ['now', 'متاح الآن']].map(([v, t]) => <Chip key={v} on={f.furn === v} onClick={() => set('furn', v)}>{t}</Chip>)}
        </div></div>
      )}
      <Btn h={42} onClick={() => nav(`/map?deal=${deal}`)}>عرض على الخريطة</Btn>
      {activeCount(f) > 0 && <Btn kind="ghost" h={36} style={{ color: '#c8102e' }} onClick={() => setSp(new URLSearchParams(), { replace: true })}>مسح الفلاتر</Btn>}
    </>
  );

  return (
    <section style={{ paddingTop: 28 }}>
      <Crumbs items={[['الرئيسية', '/'], [title]]} />
      <div style={{ display: 'flex', flexDirection: L.rowDir, alignItems: L.rowAlign, justifyContent: 'space-between', gap: 12, margin: '10px 0 20px' }}>
        <h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>{title}</h1>
        <div style={{ fontSize: 13.5, color: '#767a83', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          {list.length} عقار ·
          <select className="sel" aria-label="الترتيب" value={f.sort} onChange={(e) => set('sort', e.target.value === 'new' ? '' : e.target.value)} style={{ border: 0, background: 'transparent', color: '#767a83', fontSize: 13.5, outline: 0, padding: '0 0 0 18px', backgroundPosition: 'left 0 center' }}>
            {Object.entries(SORTS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: L.filterCols, gap: 28, alignItems: 'start' }}>
        {L.filterCols === '1fr' ? (
          <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <Chip on h={36} onClick={() => setSheet(true)}>⚙ الفلاتر{activeCount(f) ? ` (${activeCount(f)})` : ''}</Chip>
            {['النوع', 'المنطقة', 'السعر', 'غرف النوم', deal === 'sale' ? 'الدفع' : 'الفرش'].map((t) => <Chip key={t} h={36} onClick={() => setSheet(true)}>{t}</Chip>)}
          </div>
        ) : (
          <aside style={{ border: '1px solid #e7e7e3', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 92 }}>{filters}</aside>
        )}
        <CardGrid list={list} />
      </div>
      {sheet && (
        <Modal title="الفلاتر" onClose={() => setSheet(false)} footer={<Btn kind="dark" onClick={() => setSheet(false)}>اعرض {list.length} عقار</Btn>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{filters}</div>
        </Modal>
      )}
    </section>
  );
}
