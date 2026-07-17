// src/App.jsx
// ──────────────────────────────────────────────────────────────
// Point d'entrée principal du SaaS GU — Gestion Universitaire.
// Providers : AuthProvider > TenantProvider > BrowserRouter
// Routes : publiques + protégées (PrivateRoute > RoleRoute > TenantRoute)
//
// NOTE : main.jsx importe <App /> directement.
// AuthProvider et TenantProvider wrappent ici, pas dans main.jsx.
// ──────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Contexts / Providers
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

// Route guards
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';
import TenantRoute from './routes/TenantRoute';
import SuspendedTenantPage from './pages/SuspendedTenantPage';

// Pages publiques
import LandingPage from './pages/public/LandingPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import OnboardingPage from './pages/public/OnboardingPage.tsx';

// Pages protégées — Super Admin
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import UniversityDetailView from './pages/superadmin/UniversityDetailView.jsx';

// Pages protégées — Admin Université
import AdminDashboard from './pages/admin/AdminDashboard';

// Pages protégées — Enseignant
import TeacherDashboard from './pages/teacher/TeacherDashboard';

// Pages protégées — Étudiant
import StudentDashboard from './pages/student/StudentDashboard';

// Pages protégées — Parent
import ParentDashboard from './pages/parent/ParentDashboard';

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
