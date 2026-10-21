const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const IMG = {
  tower: ['1545324418-cc1a3fa10c00', '1486406146926-c627a92ad1ab', '1460317442991-0ec209397118', '1574362848149-11496d93a7c7', '1567496898669-ee935f5f647a', '1512453979798-5ea266f8880c'],
  villa: ['1600585154340-be6161a56a0c', '1613490493576-7fde63acd811', '1512917774080-9991f1c4c750', '1580587771525-78b9dba3b914'],
  house: ['1570129477492-45c003edd2be', '1568605114967-8130f3a36994', '1582407947304-fd86f028f716', '1576941089067-2de3c901e126'],
  living: ['1600210492486-724fe5c67fb0', '1502672260266-1c1ef2d93688', '1560448204-e02f11c3d0e2', '1493809842364-78817add7ffb'],
  kitchen: ['1600566753190-17f0baa2a6c3', '1484154218962-a197022b5858'],
  bedroom: ['1505691938895-1758d7feb511', '1616594039964-ae9021a400a0'],
  office: ['1497366216548-37526070297c', '1497366811353-6870744d04b2'],
  shop: ['1441986300917-64674bd600d8'],
  land: ['1500382017468-9049fed747ef', '1501785888041-af3ef285b470'],
  city: ['1449824913935-59a10b8d2000', '1477959858617-67f85cf4f1df'],
  people: ['1560250097-0b93528c311a', '1573496359142-b8d87734a5a2', '1519085360753-af0119f7cbe7', '1580489944761-15a19d654956', '1472099645785-5658abf4ff4e'],
};
export const img = (k, i = 0, w) => U(IMG[k][i % IMG[k].length], w);

export const areas = [
  { id: 'center', name: 'القلعة ومركز المدينة', short: 'المركز', vibe: 'القلب التاريخي ومركز الأعمال', ppm: 1850, rent: 6.5, img: img('city', 0, 900), x: 50, y: 50, tags: ['قريب من كل شي', 'مكاتب', 'تراث'], dna: { family: 5, convenience: 10, green: 4, dining: 9, growth: 7, quiet: 3 }, desc: 'حول قلعة أربيل المسجّلة في اليونسكو. الجزء الأكثر حيوية واتصالاً في المدينة، بين الأسواق والمكاتب وأحدث الأبراج.' },
  { id: 'ankawa', name: 'عينكاوة', short: 'عينكاوة', vibe: 'حي منفتح بمقاهٍ ومطاعم', ppm: 1650, rent: 6.4, img: img('city', 1, 900), x: 39, y: 29, tags: ['قرب المطار', 'مطاعم', 'مدارس'], dna: { family: 7, convenience: 8, green: 5, dining: 10, growth: 7, quiet: 5 }, desc: 'قريب من المطار، ويضم مطاعم ومقاهي كثيرة ومدارس وفنادق وسكاناً من جنسيات مختلفة.' },
  { id: 'gulan', name: 'كولان', short: 'كولان', vibe: 'أبراج ومولات وشارع الستين', ppm: 1950, rent: 7, img: img('tower', 2, 900), x: 38, y: 46, tags: ['أبراج', 'مولات', 'قرب المتنزه'], dna: { family: 6, convenience: 9, green: 6, dining: 8, growth: 9, quiet: 4 }, desc: 'الواجهة الحديثة لأربيل: سكن في الأبراج قرب المولات والفنادق ومتنزه سامي عبد الرحمن.' },
  { id: 'bakhtiari', name: 'بختياري', short: 'بختياري', vibe: 'حي عائلي راسخ', ppm: 1400, rent: 4.6, img: img('house', 1, 900), x: 43, y: 61, tags: ['عوائل', 'مدارس', 'هادئ'], dna: { family: 9, convenience: 7, green: 6, dining: 6, growth: 6, quiet: 7 }, desc: 'شوارع سكنية هادئة وأسواق محلية ومدارس. مفضّل عند العوائل اللي تريد مساحة قريبة من المدينة.' },
  { id: 'iskan', name: 'إسكان', short: 'إسكان', vibe: 'سكني قريب من المركز وبسعر مناسب', ppm: 1300, rent: 4.5, img: img('house', 3, 900), x: 58, y: 45, tags: ['قريب من المركز', 'سعر مناسب'], dna: { family: 8, convenience: 8, green: 4, dining: 6, growth: 6, quiet: 6 }, desc: 'حي عملي قريب من المركز، فيه بيوت وشقق متوسطة الارتفاع بأسعار مناسبة.' },
  { id: 'pirmam', name: 'طريق پيرمام', short: 'پيرمام', vibe: 'فلل وهواء نقي وإطلالات', ppm: 1150, rent: 4, img: img('villa', 0, 900), x: 60, y: 20, tags: ['فلل', 'مسيّج', 'إطلالات'], dna: { family: 9, convenience: 5, green: 9, dining: 4, growth: 8, quiet: 9 }, desc: 'باتجاه الجبال شمالاً: مجمعات فلل مسيّجة وقطع أكبر وأمسيات صيفية ألطف.' },
  { id: 'kirkuk', name: 'طريق كركوك', short: 'طريق كركوك', vibe: 'مجمعات جديدة مخططة', ppm: 1050, rent: 3.8, img: img('house', 0, 900), x: 50, y: 87, tags: ['مشاريع جديدة', 'مساحة', 'نمو'], dna: { family: 9, convenience: 6, green: 7, dining: 4, growth: 9, quiet: 8 }, desc: 'هنا تنبني أغلب المجمعات الكبيرة الجديدة. مساحة أكبر بنفس الميزانية، والخدمات تكبر ويّاها.' },
  { id: 'kasnazan', name: 'كسنزان', short: 'كسنزان', vibe: 'ضواحٍ واسعة وفلل', ppm: 950, rent: 3.6, img: img('villa', 3, 900), x: 79, y: 65, tags: ['هادئ', 'فلل', 'أخضر'], dna: { family: 9, convenience: 4, green: 8, dining: 3, growth: 8, quiet: 10 }, desc: 'شرق المدينة على طريق كويه: هادئ وأخضر وواسع، فيه مجمعات فلل ومساحة للتوسّع.' },
];

export const devs = [
  { id: 'lana', name: 'لانا للتطوير', mono: 'LD', founded: 2011, focus: 'أبراج سكنية', delivered: 7, units: 2400, desc: 'أبراج شقق للفئة المتوسطة والعليا بخدمات متكاملة.', phone: '0750 111 2233', email: 'sales@lana.iq' },
  { id: 'zagros', name: 'مجموعة زاغروس للسكن', mono: 'ZL', founded: 2008, focus: 'مجمعات فلل', delivered: 5, units: 900, desc: 'مجمعات فلل وتاون هاوس مسيّجة بمرافق خاصة.', phone: '0750 222 3344', email: 'info@zagros-living.iq' },
  { id: 'sarwa', name: 'شركة سروة للبناء', mono: 'SB', founded: 2014, focus: 'مجمعات مخططة كبيرة', delivered: 4, units: 3100, desc: 'مجمعات عائلية كبيرة على أطراف المدينة.', phone: '0751 333 4455', email: 'hello@sarwa.iq' },
  { id: 'hawraman', name: 'هورامان للإنشاءات', mono: 'HC', founded: 2005, focus: 'مجمعات شقق', delivered: 9, units: 3800, desc: 'مقاول ومطوّر لمجمعات شقق للفئة المتوسطة.', phone: '0750 444 5566', email: 'office@hawraman.iq' },
];

export const AMEN = { pool: 'مسبح', gym: 'نادي رياضي', security: 'حراسة 24 ساعة', parking: 'مواقف مغطاة', power: 'كهرباء 24 ساعة', garden: 'حدائق', play: 'ألعاب أطفال', mosque: 'جامع', market: 'سوبرماركت', school: 'مدرسة', clinic: 'عيادة', concierge: 'استقبال', lifts: 'مصاعد سريعة', cafe: 'مقهى وصالة', retail: 'محلات تجارية' };

export const projects = [
  { id: 'unique-tower', name: 'يونيك تاور', type: 'tower', typeAr: 'برج سكني', area: 'gulan', dev: 'lana', status: 'construction', progress: 62, handover: 'الربع الرابع 2027', floors: 32, units: 224, img: img('tower', 0), tagline: 'عنوان عمودي حاد فوق كولان', amen: ['pool', 'gym', 'concierge', 'lifts', 'parking', 'power', 'cafe', 'security'], from: 98000, plan: { down: 20, months: 36, handover: 10 } },
  { id: 'dc-tower', name: 'دي سي تاور', type: 'tower', typeAr: 'برج سكني', area: 'center', dev: 'lana', status: 'ready', progress: 100, handover: 'جاهز', floors: 24, units: 168, img: img('tower', 1), tagline: 'شقق جاهزة للسكن على الطريق الدائري', amen: ['gym', 'lifts', 'parking', 'power', 'security'], from: 84000, plan: { down: 40, months: 12, handover: 0 } },
  { id: 'tulip-tower', name: 'تيوليب تاور', type: 'tower', typeAr: 'برج سكني', area: 'ankawa', dev: 'hawraman', status: 'construction', progress: 38, handover: 'الربع الثاني 2028', floors: 28, units: 196, img: img('tower', 2), tagline: 'خطوط ناعمة وإطلالة على عينكاوة', amen: ['pool', 'gym', 'cafe', 'lifts', 'parking', 'power', 'play'], from: 76000, plan: { down: 15, months: 48, handover: 15 } },
  { id: 'asco-village', name: 'قرية أسكو', type: 'villas', typeAr: 'مجمع فلل', area: 'pirmam', dev: 'zagros', status: 'ready', progress: 100, handover: 'جاهز', floors: 2, units: 310, img: img('villa', 0), tagline: 'فلل بحدائق على طريق الجبل', amen: ['security', 'garden', 'play', 'mosque', 'market', 'power'], from: 265000, plan: { down: 50, months: 12, handover: 0 } },
  { id: 'idris-erbil', name: 'إدريس أربيل', type: 'compound', typeAr: 'مجمع سكني', area: 'kirkuk', dev: 'sarwa', status: 'construction', progress: 45, handover: 'الربع الثالث 2027', floors: 12, units: 960, img: img('house', 0), tagline: 'مجتمع عائلي متكامل', amen: ['security', 'garden', 'school', 'clinic', 'mosque', 'market', 'play', 'power', 'pool'], from: 69000, plan: { down: 10, months: 60, handover: 10 } },
  { id: 'cedar-gardens', name: 'حدائق الأرز', type: 'compound', typeAr: 'مجمع سكني', area: 'bakhtiari', dev: 'hawraman', status: 'ready', progress: 100, handover: 'جاهز', floors: 9, units: 640, img: img('house', 2), tagline: 'ساحات خضراء بين عمارات متوسطة', amen: ['security', 'garden', 'play', 'market', 'mosque', 'power', 'parking'], from: 92000, plan: { down: 30, months: 24, handover: 0 } },
  { id: 'zagros-hills', name: 'تلال زاغروس', type: 'villas', typeAr: 'مجمع فلل', area: 'pirmam', dev: 'zagros', status: 'construction', progress: 54, handover: 'الربع الثاني 2027', floors: 2, units: 180, img: img('villa', 1), tagline: 'فلل على التلّة بحدائق خاصة', amen: ['security', 'garden', 'pool', 'gym', 'play', 'power'], from: 310000, plan: { down: 25, months: 30, handover: 10 } },
  { id: 'empire-world', name: 'إمباير وورلد', type: 'mixed', typeAr: 'متعدد الاستخدام', area: 'gulan', dev: 'sarwa', status: 'ready', progress: 100, handover: 'مراحل جاهزة', floors: 30, units: 1800, img: img('tower', 5), tagline: 'مدينة داخل المدينة', amen: ['pool', 'gym', 'retail', 'concierge', 'parking', 'power', 'school', 'clinic', 'cafe'], from: 110000, plan: { down: 35, months: 18, handover: 0 } },
];

export const agents = [
  { id: 'sara', name: 'سارا أحمد', role: 'مستشارة مبيعات', img: img('people', 1, 200), phone: '0750 900 1001' },
  { id: 'rebwar', name: 'ريبوار كريم', role: 'مستشار مبيعات', img: img('people', 2, 200), phone: '0750 900 1002' },
  { id: 'dilshad', name: 'دلشاد عثمان', role: 'إيجارات', img: img('people', 0, 200), phone: '0750 900 1003' },
  { id: 'hevi', name: 'هيفي رشيد', role: 'مديرة المحتوى', img: img('people', 3, 200), phone: '0750 900 1004' },
  { id: 'alan', name: 'آلان محمد', role: 'مدير', img: img('people', 4, 200), phone: '0750 900 1005' },
];

const T = { apartment: 'شقة', penthouse: 'بنتهاوس', villa: 'فيلا', house: 'بيت', land: 'أرض', office: 'مكتب', shop: 'محل', townhouse: 'تاون هاوس' };
const L = (o) => ({ typeAr: T[o.type], verified: 'vairo', views: 120, leads: 3, status: 'live', ...o });
export const listings = [
  L({ id: 'VS-1001', deal: 'sale', type: 'apartment', area: 'gulan', proj: 'unique-tower', beds: 3, baths: 2, size: 186, floor: 18, totalFloors: 32, price: 214000, payment: 'installments', condition: 'جديد', imgs: [img('tower', 0), img('living', 0), img('kitchen', 0), img('bedroom', 0)], agent: 'sara', listed: '2026-10-02', views: 842, leads: 12, status: 'live', view: 'إطلالة على المتنزه', featured: true }),
  L({ id: 'VS-1002', deal: 'sale', type: 'villa', area: 'pirmam', proj: 'asco-village', beds: 5, baths: 5, size: 420, plot: 600, price: 389000, payment: 'cash', condition: 'ممتاز', imgs: [img('villa', 0), img('living', 1), img('kitchen', 1), img('bedroom', 1)], agent: 'rebwar', listed: '2026-09-28', views: 611, leads: 7, status: 'live', view: 'إطلالة على الجبل', featured: true }),
  L({ id: 'VS-1003', deal: 'sale', type: 'house', area: 'bakhtiari', beds: 4, baths: 3, size: 260, plot: 250, floors: 2, price: 168000, payment: 'cash', condition: 'جيد', age: 8, imgs: [img('house', 1), img('living', 2), img('kitchen', 0)], agent: 'rebwar', listed: '2026-10-11', views: 302, leads: 4, status: 'live' }),
  L({ id: 'VS-1004', deal: 'sale', type: 'land', area: 'kirkuk', size: 300, frontage: 15, landUse: 'سكني', price: 61000, payment: 'cash', imgs: [img('land', 0), img('land', 1)], agent: 'sara', listed: '2026-10-14', views: 188, leads: 2, status: 'live' }),
  L({ id: 'VS-1005', deal: 'sale', type: 'penthouse', area: 'center', proj: 'dc-tower', beds: 4, baths: 5, size: 320, floor: 24, totalFloors: 24, terrace: 60, price: 520000, payment: 'both', condition: 'جديد', imgs: [img('tower', 1), img('living', 3), img('bedroom', 0)], agent: 'sara', listed: '2026-09-15', views: 1203, leads: 15, status: 'reserved', view: 'إطلالة على القلعة', featured: true }),
  L({ id: 'VS-1006', deal: 'sale', type: 'apartment', area: 'kirkuk', proj: 'idris-erbil', beds: 2, baths: 2, size: 128, floor: 6, totalFloors: 12, price: 79000, payment: 'installments', condition: 'جديد', imgs: [img('house', 0), img('living', 0)], agent: 'rebwar', listed: '2026-10-16', views: 95, leads: 1, status: 'draft' }),
  L({ id: 'VS-1007', deal: 'sale', type: 'shop', area: 'center', size: 110, floor: 0, frontage: 8, use: 'تجزئة', price: 286000, payment: 'cash', condition: 'ممتاز', imgs: [img('shop', 0), img('city', 0)], agent: 'dilshad', listed: '2026-08-30', views: 420, leads: 5, status: 'sold' }),
  L({ id: 'VS-1008', deal: 'sale', type: 'townhouse', area: 'bakhtiari', proj: 'cedar-gardens', beds: 3, baths: 3, size: 240, plot: 200, price: 152000, payment: 'installments', condition: 'جديد', imgs: [img('house', 2), img('living', 1), img('kitchen', 1)], agent: 'rebwar', listed: '2026-10-05', views: 356, leads: 6, status: 'live' }),
  L({ id: 'VR-5001', deal: 'rent', type: 'apartment', area: 'ankawa', beds: 2, baths: 2, size: 135, floor: 4, totalFloors: 8, rent: 950, furnishing: 'مفروش', deposit: 950, available: 'متاح الآن', imgs: [img('living', 2), img('bedroom', 1), img('kitchen', 0)], agent: 'dilshad', listed: '2026-10-09', views: 540, leads: 9, status: 'live', featured: true }),
  L({ id: 'VR-5002', deal: 'rent', type: 'house', area: 'iskan', beds: 4, baths: 3, size: 280, plot: 250, rent: 1400, furnishing: 'غير مفروش', deposit: 2800, available: 'من 1 نوفمبر', imgs: [img('house', 3), img('living', 3)], agent: 'dilshad', listed: '2026-10-12', views: 210, leads: 3, status: 'live' }),
  L({ id: 'VR-5003', deal: 'rent', type: 'office', area: 'center', size: 180, floor: 7, totalFloors: 18, rent: 2200, furnishing: 'مفروش', deposit: 2200, available: 'متاح الآن', imgs: [img('office', 0), img('office', 1)], agent: 'dilshad', listed: '2026-10-01', views: 330, leads: 4, status: 'live' }),
  L({ id: 'VR-5004', deal: 'rent', type: 'villa', area: 'kasnazan', beds: 5, baths: 4, size: 380, plot: 550, rent: 2600, furnishing: 'نصف مفروش', deposit: 2600, available: 'متاح الآن', imgs: [img('villa', 3), img('living', 0), img('bedroom', 0)], agent: 'rebwar', listed: '2026-10-07', views: 275, leads: 5, status: 'live' }),
];

export const contacts = [
  { id: 'c1', name: 'أحمد رسول', phone: '0750 123 4567', source: 'واتساب', stage: 'new', interest: 'VS-1001', agent: 'sara', budget: 220000, last: 'قبل 20 دقيقة', note: 'يسأل عن خطة التقسيط وموعد التسليم', score: 'hot' },
  { id: 'c2', name: 'شيرين عزيز', phone: '0751 234 5678', source: 'الموقع', stage: 'contacted', interest: 'VR-5001', agent: 'dilshad', budget: 1000, last: 'قبل ساعتين', note: 'تريد معاينة يوم الخميس بعد الظهر', score: 'warm' },
  { id: 'c3', name: 'كاروان صالح', phone: '0770 345 6789', source: 'مكالمة', stage: 'viewing', interest: 'VS-1002', agent: 'rebwar', budget: 400000, last: 'أمس', note: 'معاينة مؤكدة السبت 11:00', score: 'hot' },
  { id: 'c4', name: 'نور الدين حسن', phone: '0750 456 7890', source: 'الموقع', stage: 'viewing', interest: 'VS-1008', agent: 'rebwar', budget: 160000, last: 'أمس', note: 'يقارن مع شقة في إدريس', score: 'warm' },
  { id: 'c5', name: 'ديلان جلال', phone: '0751 567 8901', source: 'إحالة', stage: 'offer', interest: 'VS-1005', agent: 'sara', budget: 500000, last: 'قبل 3 أيام', note: 'عرض 495,000 بانتظار رد المالك', score: 'hot' },
  { id: 'c6', name: 'ريناس عمر', phone: '0770 678 9012', source: 'واتساب', stage: 'offer', interest: 'VR-5004', agent: 'dilshad', budget: 2500, last: 'قبل يومين', note: 'طلب تخفيض الإيجار إلى 2,400', score: 'warm' },
  { id: 'c7', name: 'هوشيار بكر', phone: '0750 789 0123', source: 'الموقع', stage: 'closed', interest: 'VS-1007', agent: 'dilshad', budget: 290000, last: 'قبل أسبوع', note: 'تم البيع · العمولة مستلمة', score: 'won' },
  { id: 'c8', name: 'لانا فؤاد', phone: '0751 890 1234', source: 'انستغرام', stage: 'new', interest: 'VS-1003', agent: null, budget: 170000, last: 'قبل 45 دقيقة', note: 'غير مخصّص بعد', score: 'warm' },
  { id: 'c9', name: 'سامان رشيد', phone: '0770 901 2345', source: 'الموقع', stage: 'contacted', interest: 'VS-1004', agent: 'sara', budget: 70000, last: 'قبل 5 ساعات', note: 'يسأل عن سند الملكية والخدمات', score: 'cold' },
];

export const viewings = [
  { id: 'v1', day: 'السبت', date: '24 أكتوبر', time: '11:00', contact: 'c3', listing: 'VS-1002', agent: 'rebwar', status: 'مؤكدة' },
  { id: 'v2', day: 'السبت', date: '24 أكتوبر', time: '14:30', contact: 'c4', listing: 'VS-1008', agent: 'rebwar', status: 'مؤكدة' },
  { id: 'v3', day: 'الأحد', date: '25 أكتوبر', time: '10:00', contact: 'c2', listing: 'VR-5001', agent: 'dilshad', status: 'بانتظار التأكيد' },
  { id: 'v4', day: 'الأحد', date: '25 أكتوبر', time: '16:00', contact: 'c1', listing: 'VS-1001', agent: 'sara', status: 'مؤكدة' },
  { id: 'v5', day: 'الاثنين', date: '26 أكتوبر', time: '12:00', contact: 'c6', listing: 'VR-5004', agent: 'dilshad', status: 'مؤكدة' },
  { id: 'v6', day: 'الثلاثاء', date: '27 أكتوبر', time: '17:30', contact: 'c5', listing: 'VS-1005', agent: 'sara', status: 'إعادة معاينة' },
];

export const STAGES = [['new', 'جديد'], ['contacted', 'تم التواصل'], ['viewing', 'معاينة'], ['offer', 'عرض'], ['closed', 'مغلق']];
export const money = (n) => '$' + Number(n).toLocaleString('en-US');
