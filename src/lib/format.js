// Labels, formatting and the listing/project/area view-models shared by the site, CMS and CRM.

export const TYPE_AR = { apartment: 'شقة', penthouse: 'بنتهاوس', villa: 'فيلا', house: 'بيت', land: 'أرض', office: 'مكتب', shop: 'محل', townhouse: 'تاون هاوس' };
// Groups used by search filters and home categories.
export const TYPE_GROUPS = [
  ['apartment', 'شقق', ['apartment', 'penthouse']],
  ['house', 'بيوت', ['house', 'townhouse']],
  ['villa', 'فلل', ['villa']],
  ['land', 'أراضي', ['land']],
  ['commercial', 'تجاري', ['office', 'shop']],
];
export const groupTypes = (g) => (TYPE_GROUPS.find((x) => x[0] === g) || [])[2] || null;

export const PROJECT_TYPES = { tower: 'برج سكني', compound: 'مجمع سكني', villas: 'مجمع فلل', mixed: 'متعدد الاستخدام' };
export const AMEN = { pool: 'مسبح', gym: 'نادي رياضي', security: 'حراسة 24 ساعة', parking: 'مواقف مغطاة', power: 'كهرباء 24 ساعة', garden: 'حدائق', play: 'ألعاب أطفال', mosque: 'جامع', market: 'سوبرماركت', school: 'مدرسة', clinic: 'عيادة', concierge: 'استقبال', lifts: 'مصاعد سريعة', cafe: 'مقهى وصالة', retail: 'محلات تجارية' };
export const LISTING_FEATURES = ['كهرباء 24 ساعة', 'موقف مغطى', 'حراسة 24 ساعة', 'مصاعد', 'بلكونة', 'تكييف مركزي', 'مسبح', 'حديقة', 'غرفة خادمة', 'مخزن'];
export const CONDITIONS = ['جديد', 'ممتاز', 'جيد', 'يحتاج تجديد'];
export const FURNISHING = ['مفروش', 'نصف مفروش', 'غير مفروش'];
export const PAYMENT_AR = { cash: 'كاش', installments: 'تقسيط', both: 'كاش أو تقسيط' };

export const STATUS = {
  live: ['منشور', '#0f8a4f', '#e6f6ee'],
  draft: ['مسودة', '#767a83', '#f1f1ef'],
  reserved: ['محجوز', '#b26a00', '#fff3e0'],
  sold: ['مباع', '#c8102e', '#fde8eb'],
};
export const STAGES = [['new', 'جديد'], ['contacted', 'تم التواصل'], ['viewing', 'معاينة'], ['offer', 'عرض'], ['closed', 'مغلق']];
export const STAGE_AR = Object.fromEntries(STAGES);
export const SCORES = { hot: ['ساخن', '#c8102e', '#fde8eb'], warm: ['دافئ', '#b26a00', '#fff3e0'], cold: ['بارد', '#3b5b8a', '#e8eef7'], won: ['مكسب', '#0f8a4f', '#e6f6ee'], lost: ['خسارة', '#767a83', '#f1f1ef'] };
export const SOURCES = ['الموقع', 'واتساب', 'مكالمة', 'إحالة', 'انستغرام', 'فيسبوك', 'زيارة المكتب'];
export const VIEWING_STATUS = { confirmed: 'مؤكدة', pending: 'بانتظار التأكيد', second: 'إعادة معاينة', done: 'تمت', cancelled: 'ملغاة' };
export const ROLE_AR = { admin: 'مدير النظام', editor: 'محرر محتوى', agent: 'وسيط' };

export const usd = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

// "3 عقارات" / "عقار واحد" / "عقاران" — Arabic counting for the words used in the UI.
const WORDS = { listing: ['عقار', 'عقاران', 'عقارات'], project: ['مشروع', 'مشروعان', 'مشاريع'] };
export function count(n, w) {
  const [one, two, many] = WORDS[w];
  if (n === 0) return `لا ${one}`;
  if (n === 1) return `${one} واحد`;
  if (n === 2) return two;
  return n <= 10 ? `${n} ${many}` : `${n} ${one}`;
}

export const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const dayLabel = (d) => `${AR_DAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
export const dateShort = (d) => `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
export const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'الآن';
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'قبل دقيقة' : m === 2 ? 'قبل دقيقتين' : `قبل ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : `قبل ${h} ساعات`;
  const d = Math.round(h / 24);
  if (d === 1) return 'أمس';
  if (d === 2) return 'قبل يومين';
  if (d < 7) return `قبل ${d} أيام`;
  const w = Math.round(d / 7);
  if (d < 30) return w === 1 ? 'قبل أسبوع' : w === 2 ? 'قبل أسبوعين' : `قبل ${w} أسابيع`;
  return dateShort(new Date(iso));
}

// Splits "text *highlight*" into segments for the hero title.
export const starSplit = (s) => String(s || '').split(/(\*[^*]+\*)/).filter(Boolean).map((t) => (t.startsWith('*') && t.endsWith('*') ? { hl: true, t: t.slice(1, -1) } : { hl: false, t }));

// Effective payment plan of a listing: custom values, inherited from its project, or none (cash).
export function listingPlan(l, project) {
  if (l.deal !== 'sale' || !l.plan_source || !(l.payment === 'installments' || l.payment === 'both')) return null;
  const src = l.plan_source === 'project' && project ? { down: project.plan_down, months: project.plan_months, handover: project.plan_handover, date: project.handover } : { down: l.plan_down, months: l.plan_months, handover: l.plan_handover, date: l.plan_handover_date };
  if (!src.months) return null;
  const price = l.price || 0;
  const inst = Math.max(0, 100 - src.down - src.handover);
  return { ...src, inst, downAmt: Math.round((price * src.down) / 100), handAmt: Math.round((price * src.handover) / 100), monthly: Math.round((price * inst) / 100 / src.months), note: l.plan_note };
}

export function listingTitle(l, project) {
  return (l.beds ? `${TYPE_AR[l.type]} ${l.beds} غرف` : TYPE_AR[l.type]) + (project ? ' · ' + project.name : '');
}

export function listingFacts(l) {
  return [l.beds && `${l.beds} غرف`, l.baths && `${l.baths} حمام`, `${l.size} م²`, l.floor != null && l.type !== 'land' && l.type !== 'shop' && `طابق ${l.floor}`, l.plot && `قطعة ${l.plot} م²`, l.frontage && `واجهة ${l.frontage} م`].filter(Boolean).join(' · ');
}
