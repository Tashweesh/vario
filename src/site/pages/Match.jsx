import { useState } from 'react';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Chip, Tile } from '../../components/ui.jsx';
import { LeadModal, ListingCard, PageHead } from '../parts.jsx';

const GOALS = { buy: 'شراء للسكن', rent: 'إيجار', invest: 'استثمار' };
const WHO = { single: 'أنا وحدي', couple: 'زوجان', family: 'عائلة' };
const PRI = { quiet: 'هدوء', schools: 'مدارس قريبة', center: 'قرب المركز', view: 'إطلالة', installments: 'تقسيط', fresh: 'مشروع جديد' };

function score(l, a) {
  const dna = l.area.dna || {};
  let s = 50, max = 50;
  const want = a.goal === 'rent' ? 'rent' : 'sale';
  if (l.deal !== want) return -1;
  const budget = a.goal === 'rent' ? a.rentBudget : a.budget;
  if (l.amount > budget * 1.1) return -1;
  s += l.amount <= budget ? 10 : 0; max += 10;
  const beds = l.beds || 0;
  if (a.who === 'family') { s += beds >= 3 ? 12 : beds === 2 ? 4 : 0; s += (dna.family || 0); max += 22; }
  if (a.who === 'couple') { s += beds >= 2 && beds <= 3 ? 12 : 4; max += 12; }
  if (a.who === 'single') { s += beds && beds <= 2 ? 12 : 3; max += 12; }
  if (a.goal === 'invest') { s += (dna.growth || 0) * 1.5; max += 15; }
  for (const p of a.pri) {
    max += 10;
    if (p === 'quiet') s += dna.quiet || 0;
    if (p === 'schools') s += dna.family || 0;
    if (p === 'center') s += dna.convenience || 0;
    if (p === 'view') s += l.view_text ? 10 : 0;
    if (p === 'installments') s += l.isInstall ? 10 : 0;
    if (p === 'fresh') s += l.project && l.condition === 'جديد' ? 10 : l.condition === 'جديد' ? 6 : 0;
  }
  if (['land', 'office', 'shop'].includes(l.type) && a.goal !== 'invest') s -= 20;
  return Math.max(0, Math.min(99, Math.round((s / max) * 100)));
}

export default function Match() {
  useDocTitle('ڤايرو ماتش');
  const S = useSite();
  const L = useLayout();
  const [a, setA] = useState({ goal: 'buy', who: 'family', pri: ['quiet', 'schools'], budget: 250000, rentBudget: 1500 });
  const [done, setDone] = useState(false);
  const [lead, setLead] = useState(false);
  const togglePri = (k) => setA({ ...a, pri: a.pri.includes(k) ? a.pri.filter((x) => x !== k) : [...a.pri, k] });
  const results = S.live.map((l) => ({ l, s: score(l, a) })).filter((x) => x.s >= 0).sort((x, y) => y.s - x.s).slice(0, 3);
  const isRent = a.goal === 'rent';
  const h2 = (m) => ({ fontSize: 24, fontWeight: 600, margin: m });
  const summary = [GOALS[a.goal], WHO[a.who], `ميزانية حتى ${S.money(isRent ? a.rentBudget : a.budget)}${isRent ? ' شهرياً' : ''}`, ...a.pri.map((p) => PRI[p])].join('، ');

  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="الأدوات" title="ڤايرو ماتش" h1Fs={L.h1Fs} />
      {done ? (
        <>
          <p style={{ color: '#5a5e68', margin: '10px 0 0', lineHeight: 1.75 }}>حسب إجاباتك: {summary}. {results.length ? `هذي أفضل ${results.length === 3 ? '3' : results.length} نتائج.` : ''}</p>
          {results.length === 0 ? (
            <div style={{ marginTop: 24, padding: 40, textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 20 }}>ما لگينا عقار مطابق حالياً. جرّب ترفع الميزانية، أو خلّي مستشار يدوّرلك.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20, marginTop: 24 }}>
              {results.map(({ l, s }) => (
                <div key={l.id} style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -10, insetInlineStart: 12, zIndex: 2, height: 24, padding: '0 10px', borderRadius: 999, background: '#c8102e', color: '#fff', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>تطابق {s}%</span>
                  <ListingCard l={l} />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
            <Btn onClick={() => setDone(false)}>→ عدّل الإجابات</Btn>
            <Btn kind="red" onClick={() => setLead(true)}>خلّي مستشار يكمّل ويّاك</Btn>
          </div>
        </>
      ) : (
        <div style={{ maxWidth: 720, margin: '24px auto 0', border: '1px solid #e7e7e3', borderRadius: 24, padding: L.phone ? 20 : 28 }}>
          <div style={{ fontSize: 13, color: '#767a83' }}>4 أسئلة</div>
          <h2 style={h2('6px 0 16px')}>شنو هدفك؟</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>{Object.entries(GOALS).map(([k, t]) => <Tile key={k} h={56} on={a.goal === k} onClick={() => setA({ ...a, goal: k })}>{t}</Tile>)}</div>
          <h2 style={h2('28px 0 16px')}>منو راح يسكن؟</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>{Object.entries(WHO).map(([k, t]) => <Tile key={k} h={56} on={a.who === k} onClick={() => setA({ ...a, who: k })}>{t}</Tile>)}</div>
          <h2 style={h2('28px 0 16px')}>شنو الأهم عندك؟</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.entries(PRI).map(([k, t]) => <Chip key={k} h={38} px={14} fs={13.5} on={a.pri.includes(k)} onClick={() => togglePri(k)}>{t}</Chip>)}</div>
          <h2 style={h2('28px 0 10px')}>ميزانيتك{isRent ? ' الشهرية' : ''}</h2>
          <div style={{ fontSize: 28, fontWeight: 700 }} dir="ltr">{S.money(isRent ? a.rentBudget : a.budget)}</div>
          {isRent
            ? <input type="range" aria-label="الميزانية" min="300" max="4000" step="50" value={a.rentBudget} onChange={(e) => setA({ ...a, rentBudget: +e.target.value })} style={{ width: '100%' }} />
            : <input type="range" aria-label="الميزانية" min="50000" max="600000" step="5000" value={a.budget} onChange={(e) => setA({ ...a, budget: +e.target.value })} style={{ width: '100%' }} />}
          <button onClick={() => setDone(true)} style={{ marginTop: 28, width: '100%', height: 50, borderRadius: 14, border: 0, background: '#c8102e', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' }}>اعرض النتائج</button>
        </div>
      )}
      {lead && <LeadModal title="مستشار ڤايرو" sub="نرسل نتائجك لمستشار يتواصل ويّاك." kind="match" listingIds={results.map((r) => r.l.id)} deal={isRent ? 'rent' : 'sale'} budget={isRent ? a.rentBudget : a.budget} buildMessage={() => `إجابات ماتش: ${summary}`} onClose={() => setLead(false)} />}
    </section>
  );
}
