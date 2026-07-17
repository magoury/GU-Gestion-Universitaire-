// src/App.tsx
// ──────────────────────────────────────────────────────────────
// Point d'entrée principal du SaaS GU — Gestion Universitaire.
// Providers : AuthProvider > TenantProvider > BrowserRouter
// Routes : publiques + protégées (PrivateRoute > RoleRoute > TenantRoute)
//
// NOTE : main.jsx (ou main.tsx) importe <App /> directement.
// AuthProvider et TenantProvider wrappent ici, pas dans main.jsx.
// ──────────────────────────────────────────────────────────────

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Contexts / Providers
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Route guards
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';
import TenantRoute from './routes/TenantRoute';
import SuspendedTenantPage from './pages/SuspendedTenantPage';

// Lazy loading des pages publiques
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const OnboardingPage = lazy(() => import('./pages/public/OnboardingPage'));

// Lazy loading des pages protégées — Super Admin
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const UniversityDetailView = lazy(() => import('./pages/superadmin/UniversityDetailView'));

// Lazy loading des pages protégées — Admin Université
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Lazy loading des pages protégées — Enseignant
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));

// Lazy loading des pages protégées — Étudiant
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));

// Lazy loading des pages protégées — Parent
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));

// Composant de chargement elegant (sombre green sylvan)
const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#041710',
    color: '#95D4B3',
    fontFamily: "var(--font-body)",
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(149, 212, 179, 0.2)',
        borderTopColor: '#EEC058',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Chargement de votre espace...
      </span>
    </div>
  </div>
);

export function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Routes publiques ── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* ── Page accès non autorisé ── */}
              <Route
                path="/unauthorized"
                element={
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                  }}>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 800,
                      color: '#EF4444',
                      marginBottom: '16px',
                    }}>
                      403
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      Accès non autorisé
                    </h1>
                    <p style={{
                      color: '#94A3B8',
                      marginTop: '8px',
                      fontSize: '0.875rem',
                    }}>
                      Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                    </p>
                  </div>
                }
              />

              {/* ── Routes protégées (nécessitent authentification) ── */}
              <Route element={<PrivateRoute />}>
                <Route path="/suspended" element={<SuspendedTenantPage />} />

                {/* ── Super Admin ── */}
                <Route element={<RoleRoute roles={['super_admin_plateforme']} />}>
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                  <Route path="/superadmin/university/:universityId" element={<UniversityDetailView />} />
                </Route>

                {/* ── Admin Université ── */}
                <Route element={<RoleRoute roles={['admin_universite']} />}>
                  <Route element={<TenantRoute />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  </Route>
                </Route>

                {/* ── Enseignant ── */}
                <Route element={<RoleRoute roles={['teacher']} />}>
                  <Route element={<TenantRoute />}>
                    <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  </Route>
                </Route>

                {/* ── Étudiant ── */}
                <Route element={<RoleRoute roles={['student']} />}>
                  <Route element={<TenantRoute />}>
                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                  </Route>
                </Route>

                {/* ── Parent ── */}
                <Route element={<RoleRoute roles={['parent']} />}>
                  <Route element={<TenantRoute />}>
                    <Route path="/parent/dashboard" element={<ParentDashboard />} />
                  </Route>
                </Route>

              </Route>

              {/* ── 404 ── */}
              <Route
                path="*"
                element={
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                  }}>
                    <div style={{
                      fontSize: '3rem',
                      fontWeight: 800,
                      color: '#F59E0B',
                      marginBottom: '16px',
                    }}>
                      404
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      Page introuvable
                    </h1>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
