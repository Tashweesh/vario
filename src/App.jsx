import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/ui.jsx';
import { SiteDataProvider } from './site/SiteData.jsx';
import SiteLayout from './site/SiteLayout.jsx';
import Home from './site/pages/Home.jsx';
import Results from './site/pages/Results.jsx';
import Property from './site/pages/Property.jsx';
import { Projects, Project } from './site/pages/Projects.jsx';
import { Areas, Area } from './site/pages/Areas.jsx';
import Developers from './site/pages/Developers.jsx';
import Owners from './site/pages/Owners.jsx';
import Contact from './site/pages/Contact.jsx';
import { Saved, Compare } from './site/pages/Saved.jsx';
import MapPage from './site/pages/MapPage.jsx';
import { Tools, Budget, Payment, RentLab, Atlas, Guides, Invest } from './site/pages/Tools.jsx';
import Match from './site/pages/Match.jsx';
import Tour from './site/pages/Tour.jsx';
import Tower from './site/pages/Tower.jsx';
import NotFound from './site/pages/NotFound.jsx';

const Login = lazy(() => import('./staff/Login.jsx'));
const CmsApp = lazy(() => import('./cms/CmsApp.jsx'));
const CrmApp = lazy(() => import('./crm/CrmApp.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner pad={120} />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cms/*" element={<CmsApp />} />
        <Route path="/crm/*" element={<CrmApp />} />
        <Route element={<SiteDataProvider><SiteLayout /></SiteDataProvider>}>
          <Route index element={<Home />} />
          <Route path="buy" element={<Results deal="sale" />} />
          <Route path="rent" element={<Results deal="rent" />} />
          <Route path="property/:id" element={<Property />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<Project />} />
          <Route path="areas" element={<Areas />} />
          <Route path="areas/:id" element={<Area />} />
          <Route path="developers" element={<Developers />} />
          <Route path="sell" element={<Owners />} />
          <Route path="contact" element={<Contact />} />
          <Route path="saved" element={<Saved />} />
          <Route path="compare" element={<Compare />} />
          <Route path="map" element={<MapPage />} />
          <Route path="tools" element={<Tools />} />
          <Route path="tools/budget" element={<Budget />} />
          <Route path="tools/payment" element={<Payment />} />
          <Route path="tools/rent" element={<RentLab />} />
          <Route path="tools/match" element={<Match />} />
          <Route path="tools/tour" element={<Tour />} />
          <Route path="tools/tower" element={<Tower />} />
          <Route path="tools/tower/:projectId" element={<Tower />} />
          <Route path="tools/atlas" element={<Atlas />} />
          <Route path="guides" element={<Guides />} />
          <Route path="invest" element={<Invest />} />
          <Route path="staff" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
