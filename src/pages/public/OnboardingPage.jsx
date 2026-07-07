// src/pages/public/OnboardingPage.jsx
// ──────────────────────────────────────────────────────────────
// Page d'inscription / onboarding d'une nouvelle université
// ──────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import LogoGU from '../../components/ui/LogoGU.jsx';

function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#E2E8F0',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '24px',
    }}>
      <LogoGU size="md" onClick={() => navigate('/')} />
      <div style={{
        marginTop: '32px',
        padding: '32px',
        backgroundColor: '#1E293B',
        borderRadius: '16px',
        border: '1px solid #334155',
        width: '100%',
        maxWidth: '500px',
      }}>
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Inscrire votre université
        </h1>
        <p style={{
          color: '#94A3B8',
          fontSize: '0.875rem',
          textAlign: 'center',
        }}>
          Formulaire d'inscription — sera complété au Prompt suivant
        </p>
      </div>
    </div>
  );
}

export default OnboardingPage;
