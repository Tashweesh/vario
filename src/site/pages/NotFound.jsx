import { useNavigate } from 'react-router-dom';
import { Btn } from '../../components/ui.jsx';
import { useDocTitle } from '../../lib/hooks.js';

export default function NotFound({ what = 'الصفحة' }) {
  useDocTitle('غير موجود');
  const nav = useNavigate();
  return (
    <section style={{ padding: '100px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: '#c8102e' }}>404</div>
      <h1 style={{ fontSize: 26, fontWeight: 600, margin: '8px 0 0' }}>{what} غير موجود{what === 'الصفحة' || what === 'المنطقة' ? 'ة' : ''}</h1>
      <p style={{ color: '#5a5e68' }}>يمكن انحذف أو تغيّر الرابط.</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        <Btn kind="dark" onClick={() => nav('/')}>الرئيسية</Btn>
        <Btn onClick={() => nav('/buy')}>تصفّح العقارات</Btn>
      </div>
    </section>
  );
}
