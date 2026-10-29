import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle, useLayout } from '../../lib/hooks.js';
import { Btn, Icon, Img } from '../../components/ui.jsx';
import { CardGrid, Crumbs, Price } from '../parts.jsx';

// /saved — the reference's "Decision Room" (pages/saved.js): crumbs, head, list tabs, decision cards + side panel.
const TABS = [['', 'heart', 'كل المحفوظات'], ['sale', 'tag', 'قائمة الشراء'], ['rent', 'key', 'قائمة الإيجار']];

function SavedEmpty({ deal, onBrowse }) {
  const icons = deal === 'rent' ? ['sofa', 'key', 'building'] : ['tower', 'villa', 'land'];
  const pos = ['start-0 -rotate-6 top-4', 'start-[55px] z-10 top-0', 'end-0 rotate-6 top-4'];
  return (
    <div className="panel-s px-5 py-12 sm:py-16 text-center fade-in">
      <div className="relative w-[190px] h-[120px] mx-auto" aria-hidden="true">
        {icons.map((ic, i) => (
          <div key={ic} className={`absolute ${pos[i]} w-[80px] h-[96px] rounded-[16px] bg-white border hair shadow-card flex flex-col items-center justify-center gap-2`}>
            <span className="text-ink-300"><Icon name={ic} size={26} /></span><span className="w-10 h-1.5 rounded-full bg-paper-3" /><span className="w-6 h-1.5 rounded-full bg-paper-3" />
          </div>
        ))}
        <span className="absolute z-20 -top-2 end-[58px] w-9 h-9 rounded-full bg-white shadow-pop text-red inline-flex items-center justify-center"><Icon name="heart" size={18} /></span>
      </div>
      <h3 className="t-h2 text-[24px] sm:text-[28px] mt-7">{deal === 'rent' ? 'ما حفظت أي إيجار بعد' : deal === 'sale' ? 'قائمة الشراء فاضية' : 'ما حفظت أي عقار بعد'}</h3>
      <p className="text-ink-600 mt-2 max-w-md mx-auto">اضغط القلب على أي عقار حتى يظهر هنا، جاهز للمقارنة والمعاينة.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2"><Btn kind="dark" size="sm" onClick={onBrowse}><Icon name={deal === 'rent' ? 'key' : 'tag'} size={16} />{deal === 'rent' ? 'تصفّح الإيجارات' : 'تصفّح العقارات'}</Btn></div>
    </div>
  );
}

export function Saved() {
  useDocTitle('المحفوظات');
  const S = useSite();
  const nav = useNavigate();
  const [deal, setDeal] = useState('');
  const list = S.savedCards.filter((l) => !deal || l.deal === deal);
  const count = (d) => S.savedCards.filter((l) => !d || l.deal === d).length;
  const n = S.savedCards.length;
  const browse = () => nav(deal === 'rent' ? '/rent' : '/buy');
  return (
    <section className="wrap pt-6 lg:pt-8 pb-16 lg:pb-24">
      <Crumbs items={[['الرئيسية', '/'], ['المحفوظات']]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mt-4 mb-7">
        <div className="max-w-2xl">
          <div className="eyebrow mb-3">المحفوظات · غرفة القرار</div>
          <h1 className="t-h1 text-[32px] sm:text-[44px]">قرّر براحتك. كل اللي حفظته، بمكان واحد.</h1>
          <p className="text-ink-600 mt-3">قوائم منفصلة للشراء والإيجار، حتى دايماً تقارن نفس النوع ويا نفس النوع.</p>
        </div>
        <div className="flex gap-2 flex-none flex-wrap">
          {n > 0 && <Btn size="sm" onClick={() => nav('/tools/tour')}><Icon name="route" size={16} />رتّب جولة معاينات</Btn>}
          <Btn kind="dark" size="sm" disabled={n < 2} onClick={() => nav('/compare')}><Icon name="compare" size={16} />قارن <span className="num">{n}</span> عقارات</Btn>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-sb -mx-4 px-4 sm:mx-0 sm:px-0 pb-1" role="tablist">
        {TABS.map(([k, ic, l]) => {
          const on = deal === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setDeal(k)}
              className={`flex-none flex items-center gap-2 h-12 px-4 rounded-[14px] border transition-all text-[14px] font-semibold ${on ? 'bg-white border-ink shadow-soft' : 'bg-paper-2 border-transparent text-ink-600 hover:text-ink'}`}>
              <Icon name={ic} size={17} className={on ? 'text-red' : 'text-ink-400'} />{l}
              <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11.5px] num inline-flex items-center justify-center ${on ? 'bg-ink text-white' : 'bg-white text-ink-500'}`}>{count(k)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 mt-5">
        <div className="lg:col-span-8 xl:col-span-9">
          {list.length ? <CardGrid list={list} variant="list" /> : <SavedEmpty deal={deal} onBrowse={browse} />}
        </div>
        <aside className="lg:col-span-4 xl:col-span-3 hidden lg:block">
          <div className="lg:sticky lg:top-[92px] space-y-4">
            <div className="panel p-5">
              <div className="flex items-center justify-between"><div className="font-semibold">المقارنة</div><span className="lbl num">{n}</span></div>
              <p className="lbl mt-1 mb-4">العقارات المحفوظة تدخل المقارنة تلقائياً — احفظ عقارين أو أكثر حتى تقارن نفس النوع ويا نفس النوع.</p>
              <div className="grid gap-2">
                <Btn kind="dark" size="sm" disabled={n < 2} onClick={() => nav('/compare')}><Icon name="compare" size={16} />قارن {n > 0 && <span className="num">{n}</span>}</Btn>
                <Btn size="sm" disabled={n < 1} onClick={() => nav('/tools/tour')}><Icon name="route" size={16} />أضف لقائمة المعاينة</Btn>
              </div>
            </div>
            <Link to="/tools/tour" className="panel p-5 flex items-center gap-4 hover:shadow-card transition-shadow">
              <span className="mi-ic"><Icon name="route" size={20} /></span>
              <span className="min-w-0"><span className="block font-semibold">نظّم يوم المعاينات</span><span className="block lbl">الجولة الذكية ترتّب المحطات على الخريطة</span></span>
              <Icon name="arrow" size={16} className="ms-auto flip-rtl text-ink-400" />
            </Link>
          </div>
        </aside>
      </div>
      <p className="lbl mt-10">قوائمك محفوظة بهالمتصفح بس. الأسعار والتوفّر يأكدها فريق ڤايرو قبل أي اتفاق.</p>
    </section>
  );
}

// /compare — the reference's side-by-side table (pages/compare.js) over the app's saved listings.
const ROWS = [
  ['k', 'السعر', (l) => `${l.priceText} ${l.per}`], ['k', 'سعر المتر', (l) => l.ppm || '—'], ['k', 'المساحة', (l) => l.size + ' م²'],
  ['k', 'غرف النوم', (l) => l.beds || '—'], ['k', 'الحمامات', (l) => l.baths || '—'],
  ['b', 'الدفع', (l) => l.payLabel || '—'], ['b', 'الحالة', (l) => l.condition || '—'],
  ['d', 'النوع', (l) => l.typeAr], ['d', 'المشروع', (l) => l.projName || 'مستقل'],
  ['l', 'المنطقة', (l) => l.areaName],
];
const SECT = { k: 'الأرقام الأساسية', b: 'الصفقة والحالة', d: 'التفاصيل', l: 'الموقع' };

export function Compare() {
  useDocTitle('المقارنة');
  const S = useSite();
  const L = useLayout();
  const nav = useNavigate();
  const cards = S.savedCards;
  const n = cards.length;
  const mob = L.phone;
  const cols = mob ? `repeat(${n}, minmax(150px, 1fr))` : `190px repeat(${n}, minmax(0, 1fr))`;
  let cur = '';
  return (
    <section className="wrap pt-6 lg:pt-8 pb-24">
      <style>{`.cp-row{grid-template-columns:var(--cp-cols)}.cp-head{grid-template-columns:var(--cp-cols)}.cp-mob .cp-row{column-gap:8px}.cp-mob .cp-lab{grid-column:1/-1;padding-bottom:0}.cp-mob .cp-cell{padding:8px 10px}.cp-sec{grid-column:1/-1}`}</style>
      <Crumbs items={[['الرئيسية', '/'], ['المقارنة']]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div><div className="eyebrow mb-3">ڤايرو للمقارنة</div><h1 className="t-h1 text-[32px] sm:text-[44px]">جنب بعض، نفس النوع ويا نفس النوع.</h1><p className="text-ink-600 mt-3">العقارات المحفوظة تظهر هنا تلقائياً.</p></div>
        <Link to="/saved" className="btn btn-line btn-sm self-start md:self-auto"><Icon name="heart" size={15} />المحفوظات <span className="num text-ink-400">{n}</span></Link>
      </div>

      {n === 0 ? (
        <div className="panel p-6 sm:p-10 mt-6">
          <div className="max-w-xl">
            <span className="mi-ic"><Icon name="compare" size={20} /></span>
            <h2 className="t-h2 text-[26px] sm:text-[32px] mt-4">ماكو شي للمقارنة لحد هسه</h2>
            <p className="text-ink-600 mt-2">احفظ عقارين أو أكثر حتى تقارن بينهم — اضغط القلب على أي عقار وراح يظهر هنا.</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-6"><Btn kind="dark" size="sm" onClick={() => nav('/buy')}><Icon name="tag" size={15} />تصفّح العقارات</Btn><Link to="/saved" className="btn btn-line btn-sm"><Icon name="heart" size={15} />المحفوظات</Link></div>
        </div>
      ) : (
        <div className={`mt-6 ${mob ? 'overflow-x-auto no-sb -mx-4 px-4' : ''}`}>
          <div className={mob ? 'cp-mob' : ''} style={{ '--cp-cols': cols }}>
            <div className={`${mob ? '' : 'sticky top-[72px] z-20'} bg-white/95 backdrop-blur py-3 border-b hair`}>
              <div className="cp-head grid gap-3 items-start">
                {!mob && <div className="pt-1"><div className="text-[13px] font-semibold"><span className="num">{n}</span> عقارات</div><div className="lbl mt-1">اضغط ✕ لإزالة عقار من المحفوظات</div></div>}
                {cards.map((l, i) => (
                  <div key={l.id} className="min-w-0 relative">
                    <Link to={l.href} className="block relative"><Img src={l.img} className={`${mob ? 'aspect-[16/8]' : 'aspect-[16/10]'} !rounded-[14px]`} label={l.typeAr} /><span className="absolute top-2 start-2 w-6 h-6 rounded-full bg-white text-[11px] font-bold inline-flex items-center justify-center num shadow-soft">{i + 1}</span></Link>
                    <button type="button" className="absolute top-2 end-2 w-8 h-8 rounded-full bg-white/95 shadow-soft inline-flex items-center justify-center hover:text-red" onClick={() => S.toggleSave(l.id)} aria-label="إزالة" title="إزالة"><Icon name="close" size={15} /></button>
                    <Link to={l.href} className={`block mt-2 text-[14px] font-semibold leading-snug hover:text-red ${mob ? 'clamp-1' : 'clamp-2'}`}>{l.title}</Link>
                    <div className={`lbl clamp-1 ${mob ? 'hidden' : ''}`}>{l.areaName}</div>
                    <div className="mt-1 text-[14px]"><Price l={l} size="sm" /></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {ROWS.map(([sec, label, fn]) => {
                const head = sec !== cur ? (cur = sec, <div className="cp-sec pt-7 pb-2 text-[12px] font-semibold text-ink-500">{SECT[sec]}</div>) : null;
                return (
                  <div key={label} className="contents">
                    {head}
                    <div className="cp-row grid items-start border-t hair">
                      <div className="cp-lab text-[13px] font-semibold text-ink-600 py-3 pe-3">{label}</div>
                      {cards.map((l) => <div key={l.id} className="cp-cell min-w-0 px-3 py-3 rounded-[12px] text-[14px]"><span className="num">{fn(l)}</span></div>)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="cp-head grid gap-3 mt-4 pt-4 border-t hair">
              {!mob && <div />}
              {cards.map((l) => <Link key={l.id} to={l.href} className="btn btn-ink btn-sm w-full !px-2">شوف العقار</Link>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
