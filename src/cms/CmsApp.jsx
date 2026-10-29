import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { STATUS, TYPE_AR, listingFacts, listingTitle, usd, PROJECT_TYPES } from '../lib/format.js';
import { Btn, Icon, Spinner } from '../components/ui.jsx';
import { OsEmpty, Shell, StaffGate } from '../staff/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Listings from './pages/Listings.jsx';
import ListingEditor from './pages/ListingEditor.jsx';
import { ProjectsList, ProjectEditor } from './pages/Projects.jsx';
import Developers from './pages/Developers.jsx';
import Areas from './pages/Areas.jsx';
import HomeSettings from './pages/HomeSettings.jsx';
import Users from './pages/Users.jsx';

const Ctx = createContext(null);
export const useCms = () => useContext(Ctx);

function CmsDataProvider({ children }) {
  const A = useAuth();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    const res = await Promise.all([
      supabase.from('listings').select('*, listing_media(id, url, kind, sort, storage_path, name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('sort'),
      supabase.from('areas').select('*').order('sort'),
      supabase.from('developers').select('*').order('name'),
      supabase.from('agents').select('*').order('sort'),
      supabase.from('staff').select('*'),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('contacts').select('id, agent_id, stage', { count: 'exact' }),
    ]);
    const bad = res.find((r) => r.error);
    if (bad) { setError(bad.error.message); return; }
    const [listings, projects, areas, devs, agents, staff, settings, contacts] = res.map((r) => r.data);
    setRaw({ listings, projects, areas, devs, agents, staff, settings: settings || {}, contacts });
    setError(null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    if (!raw) return null;
    const A_ = Object.fromEntries(raw.areas.map((a) => [a.id, a]));
    const P = Object.fromEntries(raw.projects.map((p) => [p.id, p]));
    const G = Object.fromEntries(raw.agents.map((a) => [a.id, a]));
    const DV = Object.fromEntries(raw.devs.map((d) => [d.id, d]));
    const listings = raw.listings.map((l) => {
      const media = [...(l.listing_media || [])].sort((a, b) => a.sort - b.sort);
      const photos = media.filter((m) => m.kind === 'photo');
      const st = STATUS[l.status];
      return {
        ...l, media, photos, plans: media.filter((m) => m.kind === 'plan'), img: photos[0]?.url || '',
        title: listingTitle(l, P[l.project_id]), facts: listingFacts(l), typeAr: TYPE_AR[l.type],
        areaName: A_[l.area_id]?.name || '', projName: P[l.project_id]?.name || '', agent: G[l.agent_id] || null,
        priceText: usd(l.deal === 'rent' ? l.rent : l.price), dealLabel: l.deal === 'rent' ? 'للإيجار' : 'للبيع',
        statusLabel: l.status === 'sold' && l.deal === 'rent' ? 'مؤجّر' : st[0], statusColor: st[1], statusBg: st[2],
        canEdit: A.isEditor || (A.isAgent && l.agent_id === A.me?.agent_id),
      };
    });
    const projects = raw.projects.map((p) => ({ ...p, typeAr: PROJECT_TYPES[p.type], areaName: A_[p.area_id]?.name || '', devName: DV[p.developer_id]?.name || '', statusLabel: p.status === 'ready' ? 'جاهز' : 'قيد الإنشاء', unitCount: listings.filter((l) => l.project_id === p.id).length }));
    return { ...raw, listings, projects, A: A_, P, G, DV, reload: load };
  }, [raw, load, A.isEditor, A.isAgent, A.me]);

  if (error) return <div className="min-h-screen flex items-center justify-center p-4 bg-paper-2" dir="rtl"><OsEmpty icon="info" title="تعذّر تحميل البيانات" className="w-full max-w-md" action={<Btn size="sm" kind="dark" onClick={load}>إعادة المحاولة</Btn>}>{error}</OsEmpty></div>;
  if (!value) return <Spinner pad={160} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function CmsShell() {
  const A = useAuth();
  const C = useCms();
  const nav = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const items = [
    { to: '/cms', label: 'لوحة التحكم', icon: 'sparkle' },
    { section: 'المحتوى' },
    { to: '/cms/listings', label: 'العقارات', icon: 'building', count: C.listings.length, match: (p) => p.startsWith('/cms/listings') },
    ...(A.isEditor ? [
      { to: '/cms/projects', label: 'المشاريع', icon: 'compound', count: C.projects.length, match: (p) => p.startsWith('/cms/projects') },
      { to: '/cms/developers', label: 'المطوّرون', icon: 'briefcase' },
      { to: '/cms/areas', label: 'المناطق', icon: 'compass' },
    ] : []),
    ...(A.isAdmin ? [
      { section: 'الموقع' },
      { to: '/cms/home', label: 'الرئيسية وإعدادات الموقع', icon: 'home' },
      { to: '/cms/users', label: 'المستخدمون والصلاحيات', icon: 'users' },
    ] : []),
  ];
  const onListings = loc.pathname === '/cms/listings';
  return (
    <Shell sub="إدارة المحتوى" items={items} switchTo={{ to: '/crm', label: 'الانتقال إلى CRM' }}
      search={onListings ? sp.get('q') || '' : ''} searchPlaceholder="ابحث برقم العقار أو الاسم…"
      onSearch={(q) => nav(`/cms/listings${q ? '?q=' + encodeURIComponent(q) : ''}`)}
      actions={<>
        <Btn size="sm" className="hidden sm:inline-flex" onClick={() => nav('/')}><Icon name="globe" size={15} />عرض الموقع</Btn>
        <Btn kind="red" size="sm" className="hidden sm:inline-flex" onClick={() => nav('/cms/listings/new')}><Icon name="plus" size={16} />عقار جديد</Btn>
        <button type="button" className="icon-btn sm:hidden" aria-label="عقار جديد" onClick={() => nav('/cms/listings/new')}><Icon name="plus" size={20} /></button>
      </>}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="listings" element={<Listings />} />
        <Route path="listings/new" element={<ListingEditor key="new" />} />
        <Route path="listings/:id" element={<ListingEditor />} />
        {A.isEditor && <>
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/new" element={<ProjectEditor key="new" />} />
          <Route path="projects/:id" element={<ProjectEditor />} />
          <Route path="developers" element={<Developers />} />
          <Route path="areas" element={<Areas />} />
        </>}
        {A.isAdmin && <>
          <Route path="home" element={<HomeSettings />} />
          <Route path="users" element={<Users />} />
        </>}
        <Route path="*" element={<Navigate to="/cms" replace />} />
      </Routes>
    </Shell>
  );
}

export default function CmsApp() {
  return <StaffGate><CmsDataProvider><CmsShell /></CmsDataProvider></StaffGate>;
}
