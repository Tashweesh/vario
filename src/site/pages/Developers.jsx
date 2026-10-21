import { useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { PageHead } from '../parts.jsx';

export default function Developers() {
  useDocTitle('المطوّرون');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const box = { background: '#f6f6f4', borderRadius: 12, padding: 10 };
  return (
    <section style={{ paddingTop: 28 }}>
      <PageHead kicker="مشاريع جديدة" title="المطوّرون" h1Fs={L.h1Fs} sub="الشركات اللي تبني مشاريع أربيل الجديدة، وسجلها بالتسليم." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, marginTop: 24 }}>
        {S.devs.map((d) => (
          <div key={d.id} style={{ border: '1px solid #e7e7e3', borderRadius: 20, padding: 22, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: '#1d1e22', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, flex: 'none' }} dir="ltr">{d.mono}</span>
              <div><div style={{ fontWeight: 600, fontSize: 17 }}>{d.name}</div><div style={{ fontSize: 13, color: '#767a83' }}>{d.focus}{d.founded ? ` · منذ ${d.founded}` : ''}</div></div>
            </div>
            <p style={{ color: '#5a5e68', fontSize: 14, margin: '14px 0 0', lineHeight: 1.7 }}>{d.desc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16, textAlign: 'center' }}>
              <div style={box}><div style={{ fontWeight: 700, fontSize: 18 }}>{d.delivered}</div><div style={{ fontSize: 11.5, color: '#767a83' }}>مشروع مسلّم</div></div>
              <div style={box}><div style={{ fontWeight: 700, fontSize: 18 }}>{d.units.toLocaleString('en-US')}</div><div style={{ fontSize: 11.5, color: '#767a83' }}>وحدة</div></div>
              <div style={box}><div style={{ fontWeight: 700, fontSize: 18 }}>{d.projCount}</div><div style={{ fontSize: 11.5, color: '#767a83' }}>على ڤايرو</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
              {d.projs.map((p) => (
                <button key={p.id} onClick={() => nav(p.href)} style={{ textAlign: 'start', display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '1px solid #e7e7e3', borderRadius: 12, background: '#fff', cursor: 'pointer', fontSize: 13.5 }}>
                  {p.img && <img src={p.img} alt="" style={{ width: 44, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
                  <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span><span style={{ color: '#767a83', fontSize: 12.5 }}>{p.statusLabel}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
