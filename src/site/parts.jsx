import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, friendlyError } from '../lib/supabase.js';
import { useSite } from './SiteData.jsx';
import { Btn, Field, IconHeart, Kicker, Modal, useToast } from '../components/ui.jsx';

// ListingCard.dc.html
export function ListingCard({ l }) {
  const S = useSite();
  const nav = useNavigate();
  const saved = S.saved.includes(l.id);
  return (
    <div dir="rtl" className="zoom" onClick={() => nav(l.href)} style={{ cursor: 'pointer', color: '#1d1e22', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 18, overflow: 'hidden', background: '#f6f6f4' }}>
        {l.img && <img className="zoom-img" src={l.img} alt={l.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        <div style={{ position: 'absolute', top: 12, insetInlineStart: 12, display: 'flex', gap: 6 }}>
          <span style={pill}>{l.dealLabel}</span>
          {l.isInstall && <span style={{ ...pill, background: '#c8102e', color: '#fff' }}>تقسيط</span>}
          {l.status === 'reserved' && <span style={{ ...pill, background: '#fff3e0', color: '#b26a00' }}>محجوز</span>}
          {l.status === 'sold' && <span style={{ ...pill, background: '#1d1e22', color: '#fff' }}>{l.deal === 'rent' ? 'مؤجّر' : 'مباع'}</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); S.toggleSave(l.id); }} aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ'} aria-pressed={saved} style={{ position: 'absolute', top: 10, insetInlineEnd: 10, width: 34, height: 34, borderRadius: 999, border: 0, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#1d1e22' }}>
          <IconHeart size={17} filled={saved} />
        </button>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flex: 'none' }} dir="ltr">{l.priceText} <span style={{ fontSize: 12.5, color: '#767a83', fontWeight: 500 }}>{l.per}</span></div>
          {S.showId && <span style={{ fontSize: 12, color: '#767a83', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{l.id}</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
        <div style={{ fontSize: 13, color: '#767a83', marginTop: 2 }}>{l.areaName} · {l.facts}</div>
      </div>
    </div>
  );
}
const pill = { height: 26, padding: '0 10px', borderRadius: 999, background: 'rgba(255,255,255,.95)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center' };

export function CardGrid({ list, min = 250, gap = 20, empty = 'لا توجد عقارات مطابقة حالياً' }) {
  if (!list.length) return <div style={{ padding: '40px 16px', textAlign: 'center', color: '#767a83', border: '1px dashed #d8d8d3', borderRadius: 18 }}>{empty}</div>;
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))`, gap }}>{list.map((l) => <ListingCard key={l.id} l={l} />)}</div>;
}

export function Crumbs({ items }) {
  return (
    <div style={{ fontSize: 12.5, color: '#767a83', display: 'flex', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {items.map(([t, to], i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span>/</span>}
          {to ? <Link to={to} style={{ color: '#767a83' }}>{t}</Link> : <span>{t}</span>}
        </span>
      ))}
    </div>
  );
}

export function PageHead({ kicker, title, sub, h1Fs, children }) {
  return (
    <>
      {kicker && <Kicker>{kicker}</Kicker>}
      <h1 style={{ fontSize: h1Fs, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-.01em' }}>{title}</h1>
      {sub && <p style={{ color: '#5a5e68', margin: '10px 0 0', maxWidth: 620, lineHeight: 1.75 }}>{sub}</p>}
      {children}
    </>
  );
}

export function SectionHead({ kicker, title, h2Fs, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      <div><Kicker>{kicker}</Kicker><h2 style={{ fontSize: h2Fs, fontWeight: 600, margin: '6px 0 0', letterSpacing: '-.01em' }}>{title}</h2></div>
      {action}
    </div>
  );
}

export const H2 = ({ children, m = '36px 0 12px' }) => <h2 style={{ fontSize: 22, fontWeight: 600, margin: m }}>{children}</h2>;
export const Stat = ({ label, value, children }) => (
  <div style={{ background: '#f6f6f4', borderRadius: 14, padding: 14 }}>
    <div style={{ fontSize: 12, color: '#767a83' }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: 18, marginTop: 2 }}>{value}</div>
    {children}
  </div>
);
export const Tag = ({ children, h = 36, fs = 13.5 }) => <span style={{ height: h, padding: '0 14px', borderRadius: 999, border: '1px solid #d8d8d3', fontSize: fs, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{children}</span>;

export function PlanBar({ down, inst, handover, h = 12 }) {
  return (
    <div style={{ display: 'flex', height: h, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
      <div style={{ width: down + '%', background: '#c8102e' }} />
      <div style={{ width: inst + '%', background: '#1d1e22' }} />
      <div style={{ width: handover + '%', background: '#d8d8d3' }} />
    </div>
  );
}

export const stripes = (a = '#f6f6f4', b = '#f0f0ed', s = 10) => `repeating-linear-gradient(45deg,${a} 0 ${s}px,${b} ${s}px ${s * 2}px)`;
export const Dot = ({ size = 18, style }) => <span style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(50%,-50%)', width: size, height: size, borderRadius: 999, background: '#c8102e', boxShadow: '0 0 0 8px rgba(200,16,46,.2)', ...style }} />;

export const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '').replace(/^0/, '964')}${text ? '?text=' + encodeURIComponent(text) : ''}`;

// Submits any public form into the CRM (rpc submit_lead).
export async function submitLead({ name, phone, kind, message, listingIds = [], source = 'الموقع', budget = null, deal = null }) {
  const { error } = await supabase.rpc('submit_lead', { p_name: name, p_phone: phone, p_kind: kind, p_message: message || null, p_listing_ids: listingIds, p_source: source, p_budget: budget, p_deal: deal });
  if (error) throw new Error(friendlyError(error));
}

// Modal with name + phone (+ optional extra fields) that creates a CRM lead.
export function LeadModal({ title, sub, kind, listingIds, deal, budget, extra, buildMessage, submitLabel = 'أرسل الطلب', onClose, done = 'وصلنا طلبك، راح نتواصل ويّاك قريباً' }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', note: '' });
  const [x, setX] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const msg = [buildMessage ? buildMessage(x) : '', f.note].filter(Boolean).join('\n');
      await submitLead({ name: f.name, phone: f.phone, kind, message: msg, listingIds, deal, budget });
      setSent(true);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} width={480}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: '#e6f6ee', color: '#0f8a4f', display: 'grid', placeItems: 'center', margin: '0 auto', fontSize: 24, fontWeight: 700 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 17, marginTop: 12 }}>{done}</div>
          <Btn kind="dark" style={{ marginTop: 18 }} onClick={onClose}>تمام</Btn>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sub && <div style={{ fontSize: 14, color: '#5a5e68', lineHeight: 1.7 }}>{sub}</div>}
          <Field label="الاسم"><input className="inp" required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="اسمك" /></Field>
          <Field label="رقم الهاتف"><input className="inp" required dir="ltr" inputMode="tel" pattern="[0-9+ ()-]{7,20}" style={{ textAlign: 'right' }} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="07xx xxx xxxx" /></Field>
          {extra && extra(x, setX)}
          <Field label="ملاحظة (اختياري)"><textarea className="inp" rows={3} maxLength={1500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="اكتب شنو تحتاج…" /></Field>
          <Btn type="submit" kind="red" h={46} fs={14.5} disabled={busy}>{busy ? 'جاري الإرسال…' : submitLabel}</Btn>
        </form>
      )}
    </Modal>
  );
}

// Viewing-day picker used by booking modals.
export function dayOptions(n = 7) {
  const out = [];
  const d = new Date();
  for (let i = 1; out.length < n; i++) {
    const x = new Date(d.getTime() + i * 864e5);
    if (x.getDay() === 5) continue; // office closed on Friday
    out.push(x);
  }
  return out;
}
