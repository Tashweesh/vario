import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSite } from './SiteData.jsx';
import { TYPE_GROUPS } from '../lib/format.js';
import { Btn, Icon, Img, Logo, Spinner } from '../components/ui.jsx';
import { waLink } from './parts.jsx';

// Site shell ported from the design reference (core.js: renderShell, mega menus, mobile menu, footer, tabbar, search overlay).

export const TOOLS = [
  ['/tools/match', 'sparkle', 'ڤايرو ماتش', 'شراء أو إيجار أو استثمار — ونرتبلك الأنسب'],
  ['/tools/budget', 'wallet', 'مستكشف الميزانية', 'شنو أگدر أشتري أو أأجر؟'],
  ['/tools/rent', 'key', 'مختبر الإيجار', 'قدرتك على الإيجار وتكلفة السكن'],
  ['/tools/payment', 'chart', 'مختبر الدفع', 'خطط شراءك بالتقسيط'],
  ['/compare', 'compare', 'المقارنة', 'جنب بعض، نفس النوع ويا نفس النوع'],
  ['/tools/tour', 'route', 'الجولة الذكية', 'نظّم يوم المعاينات'],
  ['/saved', 'heart', 'غرفة القرار', 'قوائم الشراء والإيجار والاستثمار'],
  ['/tools/tower', 'elevator', 'مستكشف البرج', 'اختار الطابق والوحدة بالشكل'],
];

// Navigation model (V.NAV) built from live data: [href, icon, label, count]
function useNav(S) {
  return useMemo(() => {
    if (!S.ready) return null;
    const live = S.live;
    const cnt = (deal, f) => live.filter((l) => l.deal === deal && f(l)).length;
    const T = (g) => (TYPE_GROUPS.find((x) => x[0] === g) || [])[2] || [];
    const featProj = S.projs.find((p) => p.id === S.settings.featured_project_id) || S.projs[0];
    const area0 = S.homeAreas[0] || S.areas[0];
    return {
      buy: { label: 'شراء', href: '/buy', cols: [
        ['نوع العقار', [
          ['/buy?type=apartment', 'tower', 'شقق', cnt('sale', (l) => T('apartment').includes(l.type))],
          ['/buy?type=house', 'home', 'بيوت', cnt('sale', (l) => T('house').includes(l.type))],
          ['/buy?type=villa', 'villa', 'فلل وتاون هاوس', cnt('sale', (l) => l.type === 'villa' || l.type === 'townhouse')],
          ['/buy?type=land', 'land', 'أراضي', cnt('sale', (l) => l.type === 'land')],
          ['/buy?type=commercial', 'shop', 'تجاري', cnt('sale', (l) => T('commercial').includes(l.type))],
        ]],
        ['طريقة الشراء', [
          ['/buy?pay=ready', 'key', 'عقارات جاهزة', cnt('sale', (l) => l.type !== 'land' && (!l.project || l.project.status === 'ready'))],
          ['/buy?pay=installments', 'percent', 'عقارات بالتقسيط', cnt('sale', (l) => l.isInstall)],
          ['/tools/payment', 'chart', 'مختبر الدفع', null],
          ['/tools/budget', 'wallet', 'شنو أگدر أشتري؟', null],
        ]],
      ], feature: { href: '/tools/budget', img: S.live.find((l) => l.deal === 'sale' && l.img)?.img, k: 'مستكشف الميزانية', t: 'شنو تشتري بـ 100 ألف دولار بأربيل؟' } },
      rent: { label: 'إيجار', href: '/rent', cols: [
        ['سكن للإيجار', [
          ['/rent?type=apartment', 'tower', 'شقق', cnt('rent', (l) => T('apartment').includes(l.type))],
          ['/rent?type=house', 'home', 'بيوت', cnt('rent', (l) => T('house').includes(l.type))],
          ['/rent?type=villa', 'villa', 'فلل وتاون هاوس', cnt('rent', (l) => l.type === 'villa' || l.type === 'townhouse')],
          ['/rent?furn=furnished', 'sofa', 'مفروشة', cnt('rent', (l) => l.furnishing && l.furnishing !== 'غير مفروش')],
          ['/rent?furn=now', 'clock', 'متاح هسه', cnt('rent', (l) => l.available === 'متاح الآن')],
        ]],
        ['مساحات تجارية', [
          ['/rent?type=commercial', 'building', 'مكاتب', cnt('rent', (l) => l.type === 'office')],
          ['/rent?type=commercial', 'shop', 'محلات ومعارض', cnt('rent', (l) => l.type === 'shop')],
          ['/rent?type=commercial', 'briefcase', 'كل المساحات التجارية', cnt('rent', (l) => T('commercial').includes(l.type))],
        ]],
      ], feature: { href: '/tools/rent', img: S.live.find((l) => l.deal === 'rent' && l.img)?.img, k: 'مختبر الإيجار', t: 'شنو أگدر أستأجر بـ 700 دولار بالشهر؟' } },
      projects: { label: 'مشاريع جديدة', href: '/projects', cols: [
        ['نوع المشروع', [
          ['/projects?type=compound', 'compound', 'مجمعات سكنية', S.projs.filter((p) => p.type === 'compound').length],
          ['/projects?type=tower', 'tower', 'أبراج سكنية', S.projs.filter((p) => p.type === 'tower').length],
          ['/projects?type=villas', 'villa', 'مجمعات فلل', S.projs.filter((p) => p.type === 'villas').length],
          ['/projects?type=mixed', 'layers', 'متعدد الاستخدام', S.projs.filter((p) => p.type === 'mixed').length],
        ]],
        ['المرحلة', [
          ['/projects?status=construction', 'crane', 'قيد الإنشاء', S.projs.filter((p) => p.status === 'construction').length],
          ['/projects?status=ready', 'key', 'مشاريع جاهزة', S.projs.filter((p) => p.status === 'ready').length],
          ['/developers', 'building', 'المطوّرون', S.devs.length],
          ['/tools/tower', 'elevator', 'مستكشف البرج', null],
        ]],
      ], feature: featProj ? { href: featProj.href, img: featProj.img, k: 'مشروع مميز', t: featProj.name } : null },
      explore: { label: 'اكتشف أربيل', href: '/areas', cols: [
        ['المناطق', [
          ['/areas', 'compass', 'كل المناطق', S.areas.length],
          ['/map', 'map', 'خريطة العقارات', null],
        ]],
        ['اعرف السوق', [
          ['/guides', 'doc', 'أدلة المناطق والعقار', null],
          ['/tools/atlas', 'chart', 'أطلس العقار', null],
        ]],
      ], feature: area0 ? { href: area0.href, img: area0.img, k: 'هوية المنطقة', t: `${area0.name} بالتفصيل` } : null },
      invest: { label: 'استثمار', href: '/invest', cols: [
        ['استثمر بـ', [
          ['/buy?type=apartment', 'home', 'دخل سكني', null],
          ['/buy?type=commercial', 'shop', 'عقار تجاري', null],
          ['/buy?type=land', 'land', 'أراضي', null],
        ]],
        ['أدوات وأدلة', [
          ['/invest', 'trend', 'ڤايرو للاستثمار', null],
          ['/compare', 'compare', 'قارن العقارات', null],
          ['/guides', 'doc', 'دليل الاستثمار', null],
        ]],
      ], feature: { href: '/invest', img: S.live.find((l) => T('commercial').includes(l.type) && l.img)?.img, k: 'ڤايرو للاستثمار', t: 'سيناريوهات، مو وعود.' } },
      owners: { label: 'بيع / أجّر عقارك', href: '/sell', cols: [
        ['لأصحاب العقارات', [
          ['/sell?mode=sale', 'tag', 'بيع عقارك', null],
          ['/sell?mode=rent', 'key', 'أجّر عقارك', null],
          ['/sell', 'users', 'شلون تشتغل ڤايرو ويا الملاك', null],
        ]],
        ['أدلة الملاك', [
          ['/guides', 'doc', 'دليل البيع', null],
          ['/guides', 'doc', 'دليل المؤجّر', null],
        ]],
      ], feature: { href: '/sell', img: S.live.find((l) => l.type === 'house' && l.img)?.img || S.live[0]?.img, k: 'استشارة مجانية', t: 'اعرف شگد يسوى عقارك بعين المشتري.' } },
    };
  }, [S]);
}

const navKeyFor = (path, search) => (path.startsWith('/buy') ? 'buy'
  : path.startsWith('/rent') ? 'rent'
    : path.startsWith('/projects') || path.startsWith('/developers') || path.startsWith('/tools/tower') ? 'projects'
      : path.startsWith('/areas') || path === '/map' || path === '/guides' || path === '/tools/atlas' ? 'explore'
        : path.startsWith('/invest') ? 'invest'
          : path === '/sell' ? 'owners' : '');

export default function SiteLayout() {
  const S = useSite();
  const nav = useNavigate();
  const loc = useLocation();
  const N = useNav(S);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [ribbon, setRibbon] = useState(true);
  const hoverT = useRef();

  useEffect(() => { setMenu(false); setSearch(false); setMega(''); window.scrollTo(0, 0); }, [loc.pathname, loc.search]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on(); window.addEventListener('scroll', on, { passive: true });
    const k = (e) => { if (e.key === 'Escape') setMega(''); if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => { document.documentElement.style.overflow = menu || search ? 'hidden' : ''; return () => { document.documentElement.style.overflow = ''; }; }, [menu, search]);

  const go = (p) => () => nav(p);
  const activeKey = navKeyFor(loc.pathname, loc.search);
  const announcement = S.ready ? S.settings.announcement : '';
  const wa = S.ready ? waLink(S.settings.office_whatsapp) : '#';
  const tel = S.ready && S.settings.office_phone ? `tel:${String(S.settings.office_phone).replace(/\s/g, '')}` : '/contact';

  return (
    <div dir="rtl" className="min-h-screen bg-white relative">
      {announcement && ribbon && (
        <div id="ribbon" className="bg-paper-2 text-ink-600 text-[12.5px] border-b hair">
          <div className="wrap flex items-center justify-center gap-2.5 h-9 text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-red flex-none" /><span className="clamp-1">{announcement}</span>
            <button type="button" className="opacity-60 hover:opacity-100 flex-none" aria-label="إغلاق" onClick={() => setRibbon(false)}><Icon name="close" size={14} /></button>
          </div>
        </div>
      )}

      <header id="nav" className={`nav ${scrolled ? 'scrolled' : ''}`} onMouseLeave={() => { clearTimeout(hoverT.current); setMega(''); }}>
        <div className="wrap h-full flex items-center gap-1">
          <Link to="/" className="me-3 xl:me-6 flex-none" aria-label="VAIRO" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Logo /></Link>
          {N && (
            <nav className="hidden lg:flex items-center gap-0.5">
              {Object.entries(N).map(([k, n]) => (
                <button key={k} type="button" className={`nav-link ${activeKey === k ? 'act' : ''}`} aria-expanded={mega === k}
                  onClick={() => setMega(mega === k ? '' : k)}
                  onMouseEnter={() => { clearTimeout(hoverT.current); hoverT.current = setTimeout(() => setMega(k), 90); }}
                  onMouseLeave={() => clearTimeout(hoverT.current)}>
                  {n.label}<Icon name="chev-d" size={14} className="opacity-50" />
                </button>
              ))}
            </nav>
          )}
          <div className="ms-auto flex items-center gap-0.5">
            <button type="button" className="icon-btn" aria-label="بحث" title="⌘K" onClick={() => setSearch(true)}><Icon name="search" size={20} /></button>
            <Link to="/compare" className="icon-btn relative hidden sm:inline-flex" aria-label="المقارنة"><Icon name="compare" size={20} /></Link>
            <Link to="/saved" className="icon-btn relative" aria-label="المحفوظات"><Icon name="heart" size={20} />{S.saved.length > 0 && <span className="badge-dot">{S.saved.length}</span>}</Link>
            <button type="button" className="hidden md:inline-flex h-10 px-3 items-center text-[13px] font-semibold rounded-full hover:bg-paper-2" onClick={S.toggleCurrency} title="تغيير العملة">{S.currency === 'USD' ? 'USD' : 'دينار'}</button>
            <button type="button" className="h-10 px-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold rounded-full text-ink-400 cursor-default" title="النسخة الإنجليزية قريباً"><Icon name="globe" size={17} /><span className="hidden sm:inline">English</span><span className="sm:hidden">EN</span></button>
            <Link to="/contact" className="btn btn-ink btn-sm hidden xl:inline-flex ms-2"><Icon name="phone" size={16} />تواصل ويّا ڤايرو</Link>
            <button type="button" className="icon-btn lg:hidden" aria-label="القائمة" onClick={() => setMenu(true)}><Icon name="menu" size={22} /></button>
          </div>
        </div>
        {N && Object.entries(N).map(([k, n]) => (
          <div key={k} className={`mega hidden lg:block ${mega === k ? 'open' : ''}`} onClick={(e) => { if (e.target.closest('a')) setMega(''); }}>
            <div className="wrap py-7 grid grid-cols-12 gap-8">
              {n.cols.map(([t, items]) => (
                <div key={t} className="col-span-4">
                  <div className="eyebrow no-line mb-2 px-3">{t}</div>
                  {items.map(([href, ic, l, c], i) => (
                    <Link key={i} className="mi" to={href}><span className="mi-ic"><Icon name={ic} size={19} /></span><span className="flex-1 font-semibold text-[14.5px]">{l}</span>{c != null ? <span className="lbl num">{c}</span> : <Icon name="chev" size={15} className="flip-rtl text-ink-300" />}</Link>
                  ))}
                </div>
              ))}
              {n.feature && (
                <Link to={n.feature.href} className="col-span-4 group block rounded-[18px] overflow-hidden relative zoom">
                  <Img src={n.feature.img} className="h-full min-h-[230px] scrim-b !rounded-none" />
                  <div className="absolute bottom-0 inset-x-0 p-5 text-white"><div className="text-[12px] font-semibold opacity-80">{n.feature.k}</div><div className="text-[20px] font-semibold leading-snug mt-1 t-h3">{n.feature.t}</div></div>
                </Link>
              )}
            </div>
            <div className="border-t hair"><div className="wrap py-3 flex items-center justify-between text-[13.5px]"><Link to={n.href} className="link">روح لـ{n.label}<Icon name="arrow" size={15} className="flip-rtl" /></Link><span className="lbl">كل الأسعار بالدولار، وتگدر تبدّلها للدينار من الأعلى</span></div></div>
          </div>
        ))}
      </header>

      <main id="view" className="min-h-[70vh]">
        {S.error ? (
          <div className="wrap py-24 text-center">
            <div className="eyebrow no-line justify-center">خطأ</div>
            <h1 className="t-h1 text-[40px] mt-3">تعذّر تحميل البيانات</h1>
            <p className="text-ink-600 mt-3">{S.error}</p>
            <div className="flex justify-center gap-2 mt-8"><Btn kind="dark" onClick={S.reload}>إعادة المحاولة</Btn></div>
          </div>
        ) : S.ready ? <div className="page-in"><Outlet /></div> : <Spinner pad={140} />}
      </main>

      {N && <Footer N={N} wa={wa} />}
      <TabBar path={loc.pathname} saved={S.saved.length} />

      {menu && N && <MobileMenu N={N} onClose={() => setMenu(false)} onSearch={() => { setMenu(false); setSearch(true); }} S={S} wa={wa} tel={tel} />}
      {search && <SearchSheet S={S} onClose={() => setSearch(false)} initialMode={loc.pathname.startsWith('/rent') ? 'rent' : 'sale'} />}
    </div>
  );
}

function Footer({ N, wa }) {
  return (
    <footer id="footer" className="pb-[60px] lg:pb-0">
      <div className="bg-paper-2 border-t hair">
        <div className="wrap pt-14 pb-8">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4">
              <Logo />
              <p className="text-ink-600 mt-5 max-w-sm">ڤايرو شركة وساطة عقارية بأربيل. نساعد الناس يشترون ويأجرون ويبيعون ويأجّرون عقاراتهم ويستثمرون، وكل طلب يتابعه فريقنا مباشرة.</p>
              <div className="flex flex-wrap gap-2 mt-6">
                <Link to="/contact" className="btn btn-ink btn-sm"><Icon name="phone" size={16} />تواصل ويّا ڤايرو</Link>
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-line btn-sm"><Icon name="wa" size={16} />WhatsApp</a>
                <Link to="/contact" className="btn btn-ghost btn-sm">صفحة التواصل<Icon name="arrow" size={15} className="flip-rtl" /></Link>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 mt-6 text-[12.5px] text-ink-500 hover:text-ink"><Icon name="lock" size={14} />نظام ڤايرو · دخول الفريق</Link>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-8 text-[14px]">
              {['buy', 'rent', 'projects', 'explore', 'invest', 'owners'].map((k) => (
                <div key={k}><div className="font-semibold mb-3">{N[k].label}</div>{N[k].cols.flatMap(([, it]) => it).slice(0, 7).map(([h, , l], i) => <Link key={i} to={h} className="block py-1 text-ink-600 hover:text-ink">{l}</Link>)}</div>
              ))}
            </div>
          </div>
          <div className="mt-10 pt-8 border-t hair grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {TOOLS.map(([h, ic, t]) => <Link key={h} to={h} className="flex items-center gap-2 p-2.5 rounded-[12px] hover:bg-white text-[13px] font-semibold"><Icon name={ic} size={16} className="text-ink-400" /><span className="clamp-1">{t}</span></Link>)}
          </div>
          <div className="mt-8 pt-6 border-t hair flex flex-col md:flex-row gap-3 justify-between text-[12px] text-ink-500">
            <div>© {new Date().getFullYear()} VAIRO Real Estate · أربيل، إقليم كوردستان العراق</div>
            <div className="max-w-2xl md:text-end">الأسعار والتوفّر قابلة للتغيير، وكل التفاصيل يأكدها فريق ڤايرو قبل أي اتفاق.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TabBar({ path, saved }) {
  const items = [['/', 'home', 'الرئيسية'], ['/buy', 'tag', 'شراء'], ['/rent', 'key', 'إيجار'], ['/map', 'map', 'الخريطة'], ['/saved', 'heart', 'المحفوظ']];
  const act = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav id="tabbar" className="tabbar lg:hidden" aria-label="Primary">
      <div className="flex">
        {items.map(([h, ic, l]) => (
          <Link key={h} to={h} className={act(h) ? 'act' : ''} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Icon name={ic} size={21} /><span>{l}</span>{h === '/saved' && saved > 0 && <span className="badge-dot !top-1.5 !end-[calc(50%-20px)]">{saved}</span>}</Link>
        ))}
      </div>
    </nav>
  );
}

// Full-screen sheet used by the mobile menu and the search overlay.
function FullSheet({ children, onClose }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOpen(true)); const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', k); }; }, [onClose]);
  return (
    <>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`sheet full ${open ? 'open' : ''}`} role="dialog" aria-modal="true" dir="rtl">{children}</div>
    </>
  );
}

function MobileMenu({ N, onClose, onSearch, S, wa, tel }) {
  const it = (href, ic, t) => <Link key={href + t} to={href} className="flex items-center gap-2.5 p-3 rounded-[12px] bg-paper-2 text-[14px] font-semibold"><Icon name={ic} size={18} /><span className="clamp-1">{t}</span></Link>;
  return (
    <FullSheet onClose={onClose}>
      <div className="flex items-center justify-between px-4 h-[68px] border-b hair flex-none"><Logo /><button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق"><Icon name="close" size={22} /></button></div>
      <div className="flex-1 overflow-y-auto px-4">
        <button type="button" className="w-full mt-4 flex items-center gap-3 h-14 px-4 rounded-[16px] border hair text-ink-500" onClick={onSearch}><Icon name="search" size={20} />ابحث عن منطقة، مشروع، رقم عقار…</button>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link to="/buy" className="btn btn-ink"><Icon name="tag" size={17} />شراء</Link>
          <Link to="/rent" className="btn btn-ink"><Icon name="key" size={17} />إيجار</Link>
          <Link to="/sell?mode=sale" className="btn btn-line"><Icon name="tag" size={17} />بيع عقاري</Link>
          <Link to="/sell?mode=rent" className="btn btn-line"><Icon name="key" size={17} />أجّر عقاري</Link>
        </div>
        <div className="mt-2">
          {Object.entries(N).map(([k, n], i) => (
            <details key={k} className="border-b hair group" open={i === 0}>
              <summary className="flex items-center justify-between py-4 text-[19px] font-semibold t-h3 cursor-pointer">{n.label}<Icon name="chev-d" size={20} className="group-open:rotate-180 transition-transform text-ink-400" /></summary>
              <div className="pb-4 grid grid-cols-2 gap-2">{it(n.href, 'arrow', 'نظرة عامة')}{n.cols.flatMap(([, items]) => items).map(([h, ic, l]) => it(h, ic, l))}</div>
            </details>
          ))}
        </div>
        <div className="py-4"><div className="eyebrow no-line mb-2">الأدوات</div><div className="grid grid-cols-2 gap-2">{TOOLS.map(([h, ic, t]) => it(h, ic, t))}</div></div>
        <div className="grid grid-cols-2 gap-2 pb-6">
          <button type="button" className="btn btn-line text-ink-400" title="قريباً"><Icon name="globe" size={17} />English</button>
          <button type="button" className="btn btn-line" onClick={S.toggleCurrency}>{S.currency === 'USD' ? 'بالدينار' : 'بالدولار'}</button>
        </div>
      </div>
      <div className="p-4 border-t hair grid grid-cols-2 gap-2 flex-none">
        <a href={tel} className="btn btn-line"><Icon name="phone" size={17} />اتصل بڤايرو</a>
        <a href={wa} target="_blank" rel="noreferrer" className="btn btn-red"><Icon name="wa" size={17} />واتساب</a>
      </div>
    </FullSheet>
  );
}

// Universal search overlay (V.openSearch) → routes into the existing /buy and /rent filters.
function SearchSheet({ S, onClose, initialMode }) {
  const nav = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [q, setQ] = useState('');
  const inp = useRef();
  useEffect(() => { const t = setTimeout(() => inp.current?.focus(), 60); return () => clearTimeout(t); }, []);
  const base = mode === 'rent' ? '/rent' : '/buy';
  const go = () => {
    const s = q.trim();
    const hit = s && S.all.find((l) => l.id.toLowerCase() === s.toLowerCase());
    if (hit) return nav(hit.href);
    nav(`${base}${s ? '?q=' + encodeURIComponent(s) : ''}`);
  };
  const m = (x) => !q || String(x || '').toLowerCase().includes(q.toLowerCase());
  const areas = S.areas.filter((a) => m(a.name) || m(a.short)).slice(0, 5);
  const projs = S.projs.filter((p) => m(p.name) || m(p.name_en)).slice(0, 5);
  const devs = q ? S.devs.filter((d) => m(d.name)).slice(0, 3) : [];
  const types = TYPE_GROUPS.filter(([, l]) => m(l)).filter(([k]) => (mode === 'rent' ? k !== 'land' : true));
  const row = (to, ic, t, s) => <Link key={to + t} to={to} className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-[12px] hover:bg-paper-2"><span className="mi-ic"><Icon name={ic} size={18} /></span><span className="min-w-0"><span className="block font-semibold text-[14.5px] clamp-1">{t}</span>{s && <span className="block lbl clamp-1">{s}</span>}</span></Link>;
  const col = (title, items) => (items.length ? <div><div className="eyebrow no-line mb-2">{title}</div>{items}</div> : null);
  const tries = mode === 'rent' ? [['شقة مفروشة', `${base}?type=apartment&furn=furnished`], ['بيت للإيجار', `${base}?type=house`], ['متاح هسه', `${base}?furn=now`], ['مكتب', `${base}?type=commercial`]] : [['تقسيط', `${base}?pay=installments`], ['فلل جاهزة', `${base}?type=villa&pay=ready`], ['أراضي', `${base}?type=land`], ['أقل من 150 ألف', `${base}?max=150000`]];
  return (
    <FullSheet onClose={onClose}>
      <div className="wrap max-w-[1040px] pt-4 md:pt-8 pb-4 w-full flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="seg"><button type="button" onClick={() => setMode('sale')} aria-pressed={mode === 'sale'}>شراء</button><button type="button" onClick={() => setMode('rent')} aria-pressed={mode === 'rent'}>إيجار</button></div>
          <span className="ms-auto lbl hidden sm:inline">Esc</span><button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق"><Icon name="close" size={22} /></button>
        </div>
        <div className="mt-4 flex items-center gap-3 h-16 px-5 rounded-[18px] border-2 border-ink">
          <Icon name="search" size={22} />
          <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} className="flex-1 bg-transparent outline-none text-[18px] md:text-[20px] min-w-0" placeholder={mode === 'rent' ? 'منطقة، مجمع، "شقة مفروشة"، رقم العقار…' : 'منطقة، مشروع، مطوّر، رقم العقار…'} autoComplete="off" />
          <button type="button" className="btn btn-red btn-sm" onClick={go}>ابحث</button>
        </div>
        <div className="mt-6 overflow-y-auto flex-1 pb-6">
          <div className="grid md:grid-cols-3 gap-8">
            {col('المناطق', areas.map((a) => row(`${base}?area=${a.id}`, 'pin', a.name, a.vibe)))}
            {col('مجمعات وأبراج ومطوّرين', [...projs.map((p) => row(p.href, p.type === 'tower' ? 'tower' : 'compound', p.name, `${p.typeAr} · ${p.areaShort}`)), ...devs.map((d) => row('/developers', 'building', d.name, 'مطوّر'))])}
            {col('أنواع العقارات', types.map(([k, l, ts]) => row(`${base}?type=${k}`, k === 'apartment' ? 'tower' : k === 'house' ? 'home' : k === 'villa' ? 'villa' : k === 'land' ? 'land' : 'shop', l, `${S.live.filter((x) => ts.includes(x.type) && x.deal === mode).length} ${mode === 'rent' ? 'للإيجار' : 'للبيع'}`)))}
          </div>
          {!q && <div className="mt-8"><div className="eyebrow no-line mb-3">جرّب</div><div className="flex flex-wrap gap-2">{tries.map(([l, to]) => <Link key={l} to={to} className="chip">{l}</Link>)}</div></div>}
        </div>
      </div>
    </FullSheet>
  );
}
