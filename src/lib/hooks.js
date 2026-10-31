import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useViewport() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // phone: the design's 390px layout; wide: full header nav (collapses below ~1180px)
  return { w, phone: w < 768, wide: w >= 1180 };
}

// Responsive values from the design (`narrow ? a : b`).
export function useLayout() {
  const { phone, wide, w } = useViewport();
  const n = phone;
  return {
    phone, wide, w,
    heroFs: n ? 36 : 66, h1Fs: n ? 26 : 40, h2Fs: n ? 24 : 30, bannerH: n ? 220 : 340, priceFs: n ? 28 : 34,
    asidePos: n ? 'static' : 'sticky', rowDir: n ? 'column' : 'row', rowAlign: n ? 'flex-start' : 'flex-end',
    heroAlign: n ? 'stretch' : 'flex-end', heroPriceAlign: n ? 'start' : 'end', planCols: n ? '1fr' : 'repeat(3,1fr)',
    heroImgH: n ? 360 : 420, mapH: n ? 420 : 700, ctaFs: n ? 22 : 28, padX: n ? 16 : 32, cols2: n ? '1fr' : '1fr 1fr',
    sideCols: n || w < 980 ? '1fr' : 'minmax(0,1fr) 340px', filterCols: n || w < 900 ? '1fr' : '260px minmax(0,1fr)', galCols: n ? '1fr' : '2fr 1fr 1fr',
  };
}

export function useDocTitle(t) {
  useEffect(() => { document.title = t ? `${t} · VAIRO` : 'VAIRO · عقارات أربيل'; }, [t]);
}

// The `?q=` the staff top bar writes: normalized text, digits (for phone matching), and a tester for a row's fields.
export function useSearchQuery() {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('q') || '';
  const q = raw.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const hit = (...fields) => {
    if (!q) return true;
    const hay = fields.filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q) || (digits.length >= 3 && hay.replace(/\D/g, '').includes(digits));
  };
  const clear = () => { const n = new URLSearchParams(sp); n.delete('q'); setSp(n, { replace: true }); };
  return { q, raw, hit, clear };
}
