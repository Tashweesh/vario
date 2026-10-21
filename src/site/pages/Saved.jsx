import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Chip, Kicker } from '../../components/ui.jsx';
import { CardGrid, PageHead } from '../parts.jsx';

export function Saved() {
  useDocTitle('المحفوظات');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const [deal, setDeal] = useState('');
  const list = S.savedCards.filter((l) => !deal || l.deal === deal);
  return (
    <section style={{ paddingTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div><Kicker>غرفة القرار</Kicker><h1 style={{ fontSize: L.h1Fs, fontWeight: 600, margin: '6px 0 0' }}>المحفوظات</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {S.savedCards.length > 0 && <Btn h={44} onClick={() => nav('/tools/tour')}>رتّب جولة معاينات</Btn>}
          <Btn kind="dark" h={44} px={18} fs={14} disabled={S.savedCards.length < 2} onClick={() => nav('/compare')}>قارن {S.savedCards.length} عقارات</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        <Chip h={36} px={14} fs={13.5} on={!deal} onClick={() => setDeal('')}>الكل ({S.savedCards.length})</Chip>
        <Chip h={36} px={14} fs={13.5} on={deal === 'sale'} onClick={() => setDeal('sale')}>شراء</Chip>
        <Chip h={36} px={14} fs={13.5} on={deal === 'rent'} onClick={() => setDeal('rent')}>إيجار</Chip>
      </div>
      <div style={{ marginTop: 20 }}>
        <CardGrid list={list} empty={<>ما حفظت أي عقار بعد. اضغط ♡ على أي عقار حتى يظهر هنا.<div style={{ marginTop: 12 }}><Btn kind="dark" onClick={() => nav('/buy')}>تصفّح العقارات</Btn></div></>} />
      </div>
    </section>
  );
}

export function Compare() {
  useDocTitle('المقارنة');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const cards = S.savedCards;
  const rows = [
    ['السعر', (l) => `${l.priceText} ${l.per}`], ['النوع', (l) => l.typeAr], ['المنطقة', (l) => l.areaName], ['المساحة', (l) => l.size + ' م²'],
    ['غرف النوم', (l) => l.beds || '—'], ['الحمامات', (l) => l.baths || '—'], ['سعر المتر', (l) => l.ppm || '—'], ['الدفع', (l) => l.payLabel || '—'],
    ['الحالة', (l) => l.condition || '—'], ['المشروع', (l) => l.projName || 'مستقل'],
  ];
  const cell = { padding: '12px 16px', borderBottom: '1px solid #e7e7e3', borderInlineStart: '1px solid #e7e7e3', fontSize: 14, fontWeight: 500 };
  const head = { padding: '12px 16px', borderBottom: '1px solid #e7e7e3', background: '#f6f6f4', fontSize: 13, color: '#767a83', fontWeight: 600 };
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="المقارنة" h1Fs={L.h1Fs} sub="جنب بعض، نفس النوع ويا نفس النوع. العقارات المحفوظة تظهر هنا تلقائياً." />
      {cards.length === 0 ? (
        <div style={{ marginTop: 24, padding: 40, textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 20 }}>احفظ عقارين أو أكثر حتى تقارن بينهم.<div style={{ marginTop: 12 }}><Btn kind="dark" onClick={() => nav('/buy')}>تصفّح العقارات</Btn></div></div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 24, border: '1px solid #e7e7e3', borderRadius: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${cards.length},minmax(200px,1fr))`, minWidth: 600 }}>
            <div style={{ padding: 16, borderBottom: '1px solid #e7e7e3', background: '#f6f6f4' }} />
            {cards.map((l) => (
              <div key={l.id} style={{ padding: 16, borderBottom: '1px solid #e7e7e3', borderInlineStart: '1px solid #e7e7e3', position: 'relative' }}>
                <button onClick={() => S.toggleSave(l.id)} aria-label="إزالة" style={{ position: 'absolute', top: 22, insetInlineEnd: 22, width: 28, height: 28, borderRadius: 8, border: 0, background: 'rgba(255,255,255,.95)', cursor: 'pointer', zIndex: 1 }}>✕</button>
                <img src={l.img} alt="" onClick={() => nav(l.href)} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, cursor: 'pointer', display: 'block' }} />
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                <div style={{ fontSize: 12, color: '#767a83' }}>{l.areaName}</div>
              </div>
            ))}
            {rows.map(([label, fn]) => (
              <div key={label} style={{ display: 'contents' }}>
                <div style={head}>{label}</div>
                {cards.map((l) => <div key={l.id} style={cell}>{fn(l)}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
