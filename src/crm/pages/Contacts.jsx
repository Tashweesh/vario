import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCrm, OsPage, OsTabs, OsEmpty, Badge, Who, Lmini, STAGE_TONE } from '../CrmApp.jsx';
import { useDocTitle } from '../../lib/hooks.js';
import { Btn, Icon } from '../../components/ui.jsx';

// Directory table (reference os/contacts.js): name + phone (mono) + source + listing mini + budget + stage + consultant + last activity.
export default function Contacts() {
  useDocTitle('جهات الاتصال');
  const R = useCrm();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const filter = sp.get('f') || '';
  const qq = (sp.get('q') || '').trim().toLowerCase();
  const qDigits = qq.replace(/\D/g, '');
  const set = (k, v) => { const n = new URLSearchParams(sp); if (!v) n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  const base = R.contacts.filter((c) => !qq || c.name.toLowerCase().includes(qq) || (c.email || '').toLowerCase().includes(qq) || (qDigits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(qDigits)));
  const list = base.filter((c) => (filter === 'unassigned' ? !c.agent_id : filter === 'hot' ? c.isHot : true));
  return (
    <>
      <OsPage title="جهات الاتصال" sub="سجل واحد لكل شخص — مربوط بكل معاينة وعقار." />
      <OsTabs active={filter} onChange={(k) => set('f', k)} items={[['', 'الكل', base.length], ['unassigned', 'غير مخصّص', base.filter((c) => !c.agent_id).length], ['hot', 'ساخن', base.filter((c) => c.isHot).length]]} />
      <div className="flex flex-wrap items-center gap-2 mb-2.5 text-[12.5px] text-ink-500">
        <span>{list.length} جهة اتصال</span>
        {qq && <button type="button" className="chip chip-sm on" onClick={() => set('q', '')}>«{sp.get('q')}»<Icon name="close" size={13} /></button>}
      </div>
      {list.length === 0 ? (
        <OsEmpty icon="users" title="لا توجد جهات اتصال هنا" text={qq ? 'جرّب اسماً أو رقماً أو بريداً آخر.' : 'أضف عميلاً جديداً من الزر في الأعلى.'} action={qq ? <Btn size="sm" onClick={() => set('q', '')}>مسح البحث</Btn> : null} />
      ) : (
        <div className="os-card overflow-hidden"><div className="overflow-x-auto"><table className="os-tbl">
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>المصدر</th><th>مهتم بـ</th><th>الميزانية</th><th>المرحلة</th><th>الوسيط</th><th>آخر نشاط</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="cursor-pointer" onClick={() => nav(`/crm/contacts/${c.id}`)}>
                <td><div className="min-w-[160px] flex items-center gap-2">{c.isHot && <span className="w-2 h-2 rounded-full bg-red flex-none" title="ساخن" />}<span className="font-semibold text-[13.5px] clamp-1">{c.name}</span></div></td>
                <td className="whitespace-nowrap"><span className="mono text-[12.5px]" dir="ltr">{c.phone || '—'}</span></td>
                <td className="whitespace-nowrap"><span className="text-[13px] text-ink-600">{c.source}</span></td>
                <td><div className="min-w-[200px] max-w-[300px]"><Lmini l={c.listing} /></div></td>
                <td className="whitespace-nowrap"><span className="num font-semibold" dir="ltr">{c.budgetText}</span></td>
                <td><Badge tone={STAGE_TONE[c.stage]}>{c.stageLabel}</Badge></td>
                <td><div className="min-w-[120px]"><Who agent={c.agent} /></div></td>
                <td className="whitespace-nowrap text-ink-500 text-[12.5px]">{c.last}</td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}
