import { Link } from 'react-router-dom';
import { useSite } from '../SiteData.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Icon, Img } from '../../components/ui.jsx';
import { Crumbs } from '../parts.jsx';

// Ported from the design reference: pages/developers.js (/developers directory).

const ICON = { tower: 'tower', compound: 'compound', villas: 'villa', mixed: 'layers' };
const counts = (ps) => ps.reduce((a, p) => ({ s: a.s + p.unitList.filter((l) => l.deal === 'sale').length, r: a.r + p.unitList.filter((l) => l.deal === 'rent').length }), { s: 0, r: 0 });

function DevCard({ d }) {
  const c = counts(d.projs);
  return (
    <article className="panel p-5 flex flex-col hover:shadow-card transition-shadow">
      <div className="flex items-start gap-4">
        <span className="w-14 h-14 text-[16px] rounded-[14px] bg-paper-2 border hair inline-flex items-center justify-center font-bold tracking-wider flex-none" dir="ltr">{d.mono}</span>
        <div className="min-w-0"><div className="font-semibold text-[17px]">{d.name}</div><div className="lbl">{d.focus}{d.founded ? <> · من <span className="num">{d.founded}</span></> : null}</div></div>
      </div>
      <p className="text-[13.5px] text-ink-600 mt-3 clamp-2">{d.desc}</p>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        {[[d.delivered, 'مشروع مسلّم'], [d.units?.toLocaleString('en-US'), 'وحدة منجزة'], [d.projCount, 'على ڤايرو']].map(([v, l]) => <div key={l} className="rounded-[12px] bg-paper-2 p-2.5"><div className="font-semibold num text-[16px]">{v ?? '—'}</div><div className="lbl">{l}</div></div>)}
      </div>
      <div className="mt-4 space-y-1">
        {d.projs.map((p) => (
          <Link key={p.id} to={p.href} className="flex items-center justify-between gap-2 py-1.5 text-[13.5px] hover:text-red">
            <span className="flex items-center gap-2 min-w-0"><Icon name={ICON[p.type] || 'building'} size={15} className="text-ink-400" /><span className="clamp-1 font-medium">{p.name}</span></span>
            <span className="lbl flex-none">{p.status === 'construction' ? `${p.progress}%` : 'جاهز'}</span>
          </Link>
        ))}
        {d.projs.length === 0 && <div className="lbl py-1.5">ماكو مشاريع معروضة من هالمطوّر هسه.</div>}
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t hair"><span className="lbl num">{c.s} للبيع · {c.r} للإيجار</span>{d.projs[0] && <Link to={d.projs[0].href} className="link text-[13.5px]">المشاريع<Icon name="arrow" size={14} className="flip-rtl" /></Link>}</div>
    </article>
  );
}

export default function Developers() {
  useDocTitle('المطوّرون');
  const S = useSite();
  const tbc = S.projs.filter((p) => !p.developer_id);
  return (
    <section className="wrap pt-6 lg:pt-8 pb-20">
      <Crumbs items={[['الرئيسية', '/'], ['مشاريع جديدة', '/projects'], ['المطوّرون']]} />
      <div className="grid lg:grid-cols-12 gap-6 items-end mt-5">
        <div className="lg:col-span-8"><div className="eyebrow mb-3">المطوّرون</div><h1 className="t-h1 text-[32px] sm:text-[44px]">منو دا يبني مشاريع أربيل الجديدة.</h1><p className="text-[16.5px] text-ink-600 mt-3 max-w-2xl">الشركات اللي تبني مشاريع أربيل الجديدة، وسجلها بالتسليم وكل مشروع تعرضه ڤايرو من كل مطوّر. اسألنا أي شي قبل لا تلتزم بشراء قيد الإنشاء.</p></div>
        <div className="lg:col-span-4"><div className="flex items-start gap-2.5 rounded-[14px] bg-paper-2 px-4 py-3 text-[13px] text-ink-600"><Icon name="info" size={16} className="text-ink-400 mt-0.5" /><span>سجل التسليم والأرقام حسب ما يعلنه كل مطوّر، وڤايرو يراجع وياك التفاصيل قبل أي التزام.</span></div></div>
      </div>
      {S.devs.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">{S.devs.map((d) => <DevCard key={d.id} d={d} />)}</div>
      ) : (
        <div className="panel-s p-8 text-center mt-8"><div className="font-semibold">ماكو مطوّرين منشورين حالياً</div></div>
      )}

      {tbc.length > 0 && (
        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5"><div><div className="eyebrow mb-2">المطوّر يُحدَّد لاحقاً</div><h2 className="t-h2 text-[24px] sm:text-[30px]">مشاريع بدون ملف مطوّر منشور</h2><p className="text-ink-600 mt-1 max-w-2xl">ما ربطنا بيها ملف مطوّر بعد — اسألنا ونگلّك اللي نعرفه.</p></div></div>
          <div className="panel divide-y hair">
            {tbc.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link to={p.href} className="flex items-center gap-3 min-w-0 flex-1 group"><Img src={p.img} className="w-16 h-12 !rounded-[10px] flex-none" /><span className="min-w-0"><span className="block font-semibold group-hover:text-red clamp-1">{p.name}</span><span className="block lbl clamp-1">{p.typeAr} · {p.areaShort} · {p.status === 'construction' ? `${p.progress}% منجز` : 'جاهز'}</span></span></Link>
                <span className="tag tag-g">المطوّر يُحدَّد لاحقاً</span>
                <Link to="/contact" className="btn btn-line btn-sm">اسأل ڤايرو</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 panel p-6 sm:p-10 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8"><div className="eyebrow mb-3">قبل لا تشتري قيد الإنشاء</div><h2 className="t-h2 text-[24px] sm:text-[32px]">نتحقق من المطوّر وياك.</h2><p className="text-ink-600 mt-2">سجل التسليم والرخص وشروط العقد وجدول الدفع، ومستشار ڤايرو يوضحلك شنو لازم تسأل.</p></div>
        <div className="lg:col-span-4 flex flex-wrap gap-2 lg:justify-end"><Link to="/contact" className="btn btn-red"><Icon name="shield" size={17} />اطلب استشارة</Link><Link to="/projects" className="btn btn-line">كل المشاريع</Link></div>
      </section>
    </section>
  );
}
