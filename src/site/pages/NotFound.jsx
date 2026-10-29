import { useNavigate } from 'react-router-dom';
import { Btn, Icon } from '../../components/ui.jsx';
import { useDocTitle } from '../../lib/hooks.js';

// 404 — ported from the reference's /404 route (core.js) and the property not-found state (pages/property.js).
export default function NotFound({ what = 'الصفحة' }) {
  useDocTitle('غير موجود');
  const nav = useNavigate();
  const fem = what === 'الصفحة' || what === 'المنطقة';
  return (
    <section className="wrap py-24 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-paper-2 inline-flex items-center justify-center text-ink-400"><Icon name="search" size={28} /></div>
      <div className="eyebrow no-line justify-center mt-6">404</div>
      <h1 className="t-h1 text-[32px] sm:text-[40px] mt-3">{what} غير موجود{fem ? 'ة' : ''}</h1>
      <p className="text-ink-600 mt-3 max-w-md mx-auto">يمكن انحذف أو تغيّر الرابط. جرّب البحث، أو ابدأ من الشراء أو الإيجار.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-8">
        <Btn kind="dark" onClick={() => nav('/')}><Icon name="home" size={17} />الرئيسية</Btn>
        <Btn onClick={() => nav('/buy')}><Icon name="tag" size={17} />تصفّح العقارات</Btn>
      </div>
    </section>
  );
}
