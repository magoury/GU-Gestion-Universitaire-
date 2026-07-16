// src/pages/auth/LoginPage.jsx
// ──────────────────────────────────────────────────────────────
// Page d'authentification complète du SaaS GU.
// Combine Connexion et Inscription en libre-service sans simplification.
// Sélecteur de rôle, autocomplétion des universités, reconnexion rapide,
// et modal cachée Super Admin sécurisée par PIN OTP à 10 chiffres.
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, off, get, query, orderByChild, equalTo, set, update } from 'firebase/database';
import { database } from '@fb';

// Importations des composants et services locaux
import LogoGU from '../../components/ui/LogoGU.jsx';
import ForestBackground from '../../components/layout/ForestBackground.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { login, createUserWithRole, resetPassword, logout } from '../../services/authService.js';
import { ecrireAuditLog } from '../../services/auditService.js';
import { generateMatricule } from '../../lib/utils.js';
import { BuildingIcon, TeacherIcon, StudentsIcon, ParentIcon } from '../../components/icons/Icons.jsx';

// Listes prédéfinies pour l'inscription des étudiants
const FILIERES = [
  'Génie Logiciel',
  'Réseaux & Télécommunications',
  'Intelligence Artificielle & Data',
  'Sécurité Informatique & Cyber',
  'Management des Systèmes d\'Information',
];

const NIVEAUX = [
  { value: 'L1', label: 'Licence 1 (L1)' },
  { value: 'L2', label: 'Licence 2 (L2)' },
  { value: 'L3', label: 'Licence 3 (L3)' },
  { value: 'M1', label: 'Master 1 (M1)' },
  { value: 'M2', label: 'Master 2 (M2)' },
];

const ROLES = [
  { id: 'admin_universite', label: 'Admin Université', Icon: BuildingIcon },
  { id: 'teacher', label: 'Enseignant', Icon: TeacherIcon },
  { id: 'student', label: 'Étudiant', Icon: StudentsIcon },
  { id: 'parent', label: 'Parent', Icon: ParentIcon },
];

// Component PIN Input pour l'authentification Super Admin
function PinInput({ length = 10, onChange }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputsRef = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    const char = val.slice(-1); // Garde le dernier caractère
    const newValues = [...values];
    newValues[index] = char;
    setValues(newValues);

    onChange?.(newValues.join(''));

    // Déplace le focus au suivant si renseigné
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Déplace le focus au précédent si Backspace sur case vide
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '20px 0' }}>
      {Array(length).fill(0).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="password"
          maxLength={1}
          value={values[i]}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          style={{
            width: '32px',
            height: '42px',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-accent)',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
        />
      ))}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // États du formulaire
  const [estInscription, setEstInscription] = useState(false);
  const [roleSelectionne, setRoleSelectionne] = useState('student');
  
  // États d'autocomplétion université
  const [listeUniversites, setListeUniversites] = useState([]);
  const [rechercheUniv, setRechercheUniv] = useState('');
  const [univSelectionnee, setUnivSelectionnee] = useState(null);
  const [afficherSuggestions, setAfficherSuggestions] = useState(false);
  
  // Champs formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  
  // Champs spécifiques Inscription
  // NOTE: nomNouvelleUniv supprimé — la création d'université passe uniquement par /onboarding
  const [emailEtudiantLier, setEmailEtudiantLier] = useState('');
  const [filiere, setFiliere] = useState('');
  const [niveau, setNiveau] = useState('L1');
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);

  // Reconnexion rapide
  const [reconnexionRapide, setReconnexionRapide] = useState(false);
  const [nomUnivRecuperee, setNomUnivRecuperee] = useState('');

  // États d'action / erreur
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Super Admin
  const [modalSuperAdminOuverte, setModalSuperAdminOuverte] = useState(false);
  const [emailSuperAdmin, setEmailSuperAdmin] = useState('');
  const [pinSuperAdmin, setPinSuperAdmin] = useState('');
  const [tentativesSuperAdmin, setTentativesSuperAdmin] = useState(0);
  const [blocageSuperAdmin, setBlocageSuperAdmin] = useState(0);
  const [loadingSuperAdmin, setLoadingSuperAdmin] = useState(false);
  const [erreurSuperAdmin, setErreurSuperAdmin] = useState('');

  // Charger la liste des universités pour l'autocomplétion
  useEffect(() => {
    const univsRef = ref(database, 'saas_admin/universites');
    onValue(univsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const liste = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setListeUniversites(liste);
      } else {
        setListeUniversites([]);
      }
    });

    return () => off(univsRef);
  }, []);

  // Lire les query params pour configurer le mode, le plan et le rôle
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = searchParams.get('mode');
    const roleParam = searchParams.get('role');
    const planParam = searchParams.get('plan');
    
    if (modeParam === 'inscription') {
      setEstInscription(true);
    } else if (modeParam === 'connexion') {
      setEstInscription(false);
    }
    
    if (roleParam && ['admin_universite', 'teacher', 'student', 'parent'].includes(roleParam)) {
      setRoleSelectionne(roleParam);
    }
  }, []);

  // Détecter la reconnexion rapide
  useEffect(() => {
    const lastRole = localStorage.getItem('lastRole');
    const lastUniversityId = localStorage.getItem('lastUniversityId');

    if (lastRole && lastUniversityId) {
      setRoleSelectionne(lastRole);
      setReconnexionRapide(true);

      // Charger le nom de l'université
      const publicUnivRef = ref(database, `saas_admin/universites/${lastUniversityId}`);
      get(publicUnivRef).then((snapshot) => {
        if (snapshot.exists()) {
          const univData = snapshot.val();
          setUnivSelectionnee(univData);
          setNomUnivRecuperee(univData.nom);
        } else {
          // Si l'université n'est plus en base, nettoyer
          handleAnnulerReconnexion();
        }
      });
    }
  }, []);

  // Timer blocage Super Admin
  useEffect(() => {
    if (blocageSuperAdmin > 0) {
      const timer = setInterval(() => {
        setBlocageSuperAdmin((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [blocageSuperAdmin]);

  // Filtrer les universités pour l'autocomplétion
  const suggestionsUniversites = useMemo(() => {
    if (!rechercheUniv) return [];
    return listeUniversites.filter(u =>
      u.nom.toLowerCase().includes(rechercheUniv.toLowerCase()) ||
      (u.ville && u.ville.toLowerCase().includes(rechercheUniv.toLowerCase()))
    );
  }, [rechercheUniv, listeUniversites]);

  const handleAnnulerReconnexion = () => {
    localStorage.removeItem('lastRole');
    localStorage.removeItem('lastUniversityId');
    setUnivSelectionnee(null);
    setNomUnivRecuperee('');
    setReconnexionRapide(false);
  };

  // Soumission connexion classique
  const handleConnexion = async (e) => {
    e.preventDefault();
    setErreur('');
    setSuccessMsg('');

    const targetUniversityId = reconnexionRapide 
      ? localStorage.getItem('lastUniversityId') 
      : univSelectionnee?.id;

    if (!targetUniversityId) {
      setErreur('Veuillez sélectionner votre université.');
      return;
    }
    if (!roleSelectionne) {
      setErreur('Veuillez sélectionner votre rôle.');
      return;
    }

    setLoading(true);

    try {
      // Connexion via le service d'authentification
      const profile = await login(email, password);

      // Vérifications de rôle et de tenant
      if (profile.role !== roleSelectionne) {
        await logout();
        setErreur(`Accès refusé. Ce compte n'est pas enregistré comme ${ROLES.find(r => r.id === roleSelectionne)?.label || roleSelectionne}.`);
        setLoading(false);
        return;
      }

      if (profile.universityId !== targetUniversityId) {
        await logout();
        setErreur("Accès refusé. Ce compte n'appartient pas à l'université sélectionnée.");
        setLoading(false);
        return;
      }

      // Vérifier si l'université est suspendue
      const univStatusRef = ref(database, `saas_admin/universites/${targetUniversityId}/statut`);
      const statusSnapshot = await get(univStatusRef);
      if (statusSnapshot.exists() && statusSnapshot.val() === 'suspendu') {
        await logout();
        setErreur("Accès refusé. Cette université a été temporairement suspendue par la plateforme.");
        setLoading(false);
        return;
      }

      // Stocker pour reconnexion rapide
      localStorage.setItem('lastRole', roleSelectionne);
      localStorage.setItem('lastUniversityId', targetUniversityId);

      // Rediriger selon le rôle
      switch (profile.role) {
        case 'admin_universite':
          navigate('/admin/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        case 'parent':
          navigate('/parent/dashboard');
          break;
        default:
          navigate('/unauthorized');
      }
    } catch (err) {
      setErreur(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  // Soumission création de compte
  const handleInscription = async (e) => {
    e.preventDefault();
    setErreur('');
    setSuccessMsg('');

    // Validations générales de base
    if (!nom.trim() || !prenom.trim() || !email.trim() || !password || !confirmPassword) {
      setErreur('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setErreur('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }

    if (!conditionsAcceptees) {
      setErreur('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité RGPD.');
      return;
    }

    // La création d'université pour admin_universite est UNIQUEMENT via /onboarding
    // (tunnel sécurisé avec transaction Firebase et rollback — OnboardingPage.tsx)
    if (roleSelectionne === 'admin_universite') {
      navigate('/onboarding');
      return;
    }

    // Pour les autres rôles : sélection d'université existante obligatoire
    let finalUniversityId = null;
    if (!univSelectionnee) {
      setErreur('Veuillez sélectionner votre université.');
      return;
    }
    finalUniversityId = univSelectionnee.id;

    // Si rôle Parent : recherche et liaison de l'étudiant
    let linkedStudentId = null;
    if (roleSelectionne === 'parent') {
      if (!emailEtudiantLier.trim()) {
        setErreur('Veuillez saisir l\'adresse e-mail de votre enfant.');
        return;
      }

      setLoading(true);
      try {
        const usersQuery = query(ref(database, 'users'), orderByChild('email'), equalTo(emailEtudiantLier.trim()));
        const snapshot = await get(usersQuery);
        let etudiantTrouve = false;

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const user = child.val();
            if (user.role === 'student' && user.universityId === finalUniversityId) {
              linkedStudentId = child.key;
              etudiantTrouve = true;
            }
          });
        }

        if (!etudiantTrouve) {
          setErreur('Aucun étudiant inscrit avec cet e-mail n\'a été trouvé dans cette université.');
          setLoading(false);
          return;
        }
      } catch (err) {
        setErreur('Erreur lors de la recherche de l\'étudiant lié.');
        setLoading(false);
        return;
      }
    }

    // Si rôle Étudiant : validation filière et niveau
    if (roleSelectionne === 'student') {
      if (!filiere) {
        setErreur('Veuillez sélectionner votre filière.');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Créer le compte utilisateur
      // NOTE: admin_universite redirigé vers /onboarding avant d'arriver ici
      const { uid } = await createUserWithRole(email, password, roleSelectionne, finalUniversityId, nom, prenom, null);

      // 3. Si Étudiant : Enregistrer sa fiche académique complète dans le tenant
      if (roleSelectionne === 'student') {
        const matricule = generateMatricule(finalUniversityId);
        await set(ref(database, `universities/${finalUniversityId}/students/${uid}`), {
          uid,
          matricule,
          nom,
          prenom,
          email,
          filiere,
          niveau,
          dateInscription: Date.now(),
          actif: true
        });
        
        // Mettre à jour l'utilisateur en ajoutant son matricule dans son profil utilisateur principal
        await update(ref(database, `users/${uid}`), { matricule });
      }

      // 4. Si Parent : Rattacher l'étudiant dans le profil utilisateur
      if (roleSelectionne === 'parent' && linkedStudentId) {
        await update(ref(database, `users/${uid}`), { linkedStudentId });
      }

      // 5. Écrire un log d'audit
      await ecrireAuditLog(finalUniversityId, {
        acteurId: uid,
        acteurNom: `${prenom} ${nom}`,
        acteurRole: roleSelectionne,
        action: 'COMPTE_CREE',
        cible: uid,
        detail: `Création du compte en libre-service avec le rôle ${roleSelectionne}.`
      });

      // Stocker pour reconnexion rapide
      localStorage.setItem('lastRole', roleSelectionne);
      localStorage.setItem('lastUniversityId', finalUniversityId);

      setSuccessMsg('Votre compte a été créé avec succès. Redirection en cours...');

      // Connexion automatique et redirection
      setTimeout(() => {
        switch (roleSelectionne) {
          case 'admin_universite':
            navigate('/admin/dashboard');
            break;
          case 'teacher':
            navigate('/teacher/dashboard');
            break;
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'parent':
            navigate('/parent/dashboard');
            break;
          default:
            navigate('/unauthorized');
        }
      }, 1500);

    } catch (err) {
      setErreur(err.message || 'Une erreur est survenue lors de la création de votre compte.');
    } finally {
      setLoading(false);
    }
  };

  // Réinitialisation de mot de passe
  const handleMotDePasseOublie = async () => {
    setErreur('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErreur('Veuillez saisir votre adresse e-mail pour réinitialiser votre mot de passe.');
      return;
    }

    try {
      await resetPassword(email.trim());
      setSuccessMsg('Un e-mail de réinitialisation de mot de passe a été envoyé.');
    } catch (err) {
      setErreur(err.message || 'Erreur lors de l\'envoi de l\'e-mail.');
    }
  };

  // Authentification Super Admin
  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();
    setErreurSuperAdmin('');

    if (blocageSuperAdmin > 0) {
      setErreurSuperAdmin(`Trop de tentatives. Veuillez patienter ${blocageSuperAdmin}s.`);
      return;
    }

    if (!emailSuperAdmin.trim() || pinSuperAdmin.length !== 10) {
      setErreurSuperAdmin('Veuillez saisir votre email et le code PIN complet à 10 chiffres.');
      return;
    }

    setLoadingSuperAdmin(true);

    try {
      // Connexion en utilisant le PIN à 10 chiffres comme mot de passe Firebase
      const profile = await login(emailSuperAdmin.trim(), pinSuperAdmin);

      // Vérifier s'il est bien super admin
      if (profile.role !== 'super_admin_plateforme') {
        await logout(); // Déconnexion immédiate par sécurité
        throw new Error("Accès refusé. Droits insuffisants.");
      }

      setModalSuperAdminOuverte(false);
      navigate('/superadmin/dashboard');
    } catch (err) {
      const nouvellesTentatives = tentativesSuperAdmin + 1;
      setTentativesSuperAdmin(nouvellesTentatives);

      if (nouvellesTentatives >= 3) {
        setBlocageSuperAdmin(30);
        setTentativesSuperAdmin(0);
        setErreurSuperAdmin('Compte temporairement bloqué suite à 3 tentatives échouées. Réessayez dans 30 secondes.');
      } else {
        setErreurSuperAdmin(err.message || 'Code PIN ou e-mail incorrect.');
      }
    } finally {
      setLoadingSuperAdmin(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* ── Fond forêt ── */}
      <ForestBackground />

      {/* ── Carte principale d'authentification ── */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <LogoGU size="sm" showSubtext={false} />
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '4px 0 0 0',
            textAlign: 'center',
            color: 'var(--color-on-surface)',
          }}>
            GU — Gestion Universitaire
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-muted)' }}>
            {estInscription ? 'Créez votre espace en quelques clics' : 'Accédez à votre espace'}
          </span>
        </div>

        {/* Toggle Onglets Connexion / Inscription */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--glass-border)',
        }}>
          <button
            type="button"
            onClick={() => { setEstInscription(false); setErreur(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              backgroundColor: !estInscription ? 'var(--color-primary-container)' : 'transparent',
              color: !estInscription ? 'var(--color-accent)' : 'var(--color-on-surface-muted)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => { setEstInscription(true); setErreur(''); setSuccessMsg(''); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              backgroundColor: estInscription ? 'var(--color-primary-container)' : 'transparent',
              color: estInscription ? 'var(--color-accent)' : 'var(--color-on-surface-muted)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Créer un compte
          </button>
        </div>

        {/* Bandeau Reconnexion Rapide */}
        {reconnexionRapide && !estInscription && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(45, 106, 79, 0.4)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(149, 212, 179, 0.3)',
            fontSize: '0.85rem',
          }}>
            <span style={{ color: 'var(--color-on-surface)' }}>
              🔑 <strong>{nomUnivRecuperee}</strong> · {ROLES.find(r => r.id === roleSelectionne)?.label}
            </span>
            <button
              type="button"
              onClick={handleAnnulerReconnexion}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'underline',
              }}
            >
              Changer
            </button>
          </div>
        )}

        {/* Formulaire Principal */}
        <form onSubmit={estInscription ? handleInscription : handleConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Sélecteur de Rôle (Masqué si reconnexion rapide en cours) */}
          {(!reconnexionRapide || estInscription) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>
                Sélectionnez votre profil
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
              }}>
                {ROLES.map((r) => {
                  const estSelectionne = roleSelectionne === r.id;
                  const RoleIcon = r.Icon;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setRoleSelectionne(r.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-md)',
                        border: estSelectionne ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                        backgroundColor: estSelectionne ? 'rgba(16, 35, 28, 0.8)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!estSelectionne) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (!estSelectionne) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      }}
                    >
                      <RoleIcon className={`w-5 h-5 ${estSelectionne ? 'text-accent' : 'text-on-surface-muted'}`} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: estSelectionne ? 'var(--color-accent)' : 'var(--color-on-surface-muted)', textAlign: 'center' }}>
                        {r.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sélecteur d'Université (Masqué si reconnexion rapide en cours) */}
          {(!reconnexionRapide || estInscription) && (
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>
                Université
              </label>

              {/* Bannière de redirection pour admin_universite en mode inscription */}
              {estInscription && roleSelectionne === 'admin_universite' ? (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(149, 212, 179, 0.4)',
                  backgroundColor: 'rgba(45, 106, 79, 0.15)',
                  fontSize: '0.8rem',
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.5,
                }}
                >
                  <strong style={{ color: 'var(--color-accent)', display: 'block', marginBottom: '6px' }}>Créer une nouvelle université ?</strong>
                  Pour inscrire votre université sur la plateforme, utilisez notre tunnel d'inscription sécurisé.
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    style={{
                      display: 'block',
                      marginTop: '10px',
                      width: '100%',
                      padding: '9px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-bg)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Accéder au tunnel d'inscription →
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Rechercher votre université..."
                    value={univSelectionnee ? univSelectionnee.nom : rechercheUniv}
                    onChange={(e) => {
                      setRechercheUniv(e.target.value);
                      setUnivSelectionnee(null);
                      setAfficherSuggestions(true);
                    }}
                    onFocus={() => setAfficherSuggestions(true)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--glass-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--color-on-surface)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontSize: '0.9rem',
                    }}
                    onFocusCapture={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlurCapture={(e) => {
                      setTimeout(() => setAfficherSuggestions(false), 200);
                      e.target.style.borderColor = 'var(--glass-border)';
                    }}
                  />
                  {/* Suggestions Dropdown */}
                  {afficherSuggestions && rechercheUniv && suggestionsUniversites.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#10231C',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '4px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    }}>
                      {suggestionsUniversites.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setUnivSelectionnee(u);
                            setRechercheUniv(u.nom);
                            setAfficherSuggestions(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {u.nom} <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-muted)' }}>({u.ville || 'Côte d\'Ivoire'})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Formulaire Inscription - Nom et Prénom */}
          {estInscription && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Nom</label>
                <input
                  type="text"
                  placeholder="Ex: Kouassi"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--color-on-surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Prénom</label>
                <input
                  type="text"
                  placeholder="Ex: Jean"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--color-on-surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Email</label>
            <input
              type="email"
              placeholder="votre.email@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--color-on-surface)',
                outline: 'none',
                boxSizing: 'border-box',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>Mot de passe</label>
              {!estInscription && (
                <button
                  type="button"
                  onClick={handleMotDePasseOublie}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={afficherMdp ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-on-surface)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={() => setAfficherMdp(!afficherMdp)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-on-surface-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {afficherMdp ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirmer Mot de passe (Inscription seulement) */}
          {estInscription && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-on-surface)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          {/* Parent : Email Étudiant à Lier */}
          {estInscription && roleSelectionne === 'parent' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>
                Email de l'étudiant à lier
              </label>
              <input
                type="email"
                placeholder="email.etudiant@univ.com"
                value={emailEtudiantLier}
                onChange={(e) => setEmailEtudiantLier(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--color-on-surface)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          {/* Étudiant : Filière et Niveau */}
          {estInscription && roleSelectionne === 'student' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Filière</label>
                <select
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: '#10231C',
                    color: 'var(--color-on-surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {FILIERES.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Niveau</label>
                <select
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: '#10231C',
                    color: 'var(--color-on-surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '0.85rem',
                  }}
                >
                  {NIVEAUX.map(n => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Conditions RGPD */}
          {estInscription && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '6px' }}>
              <input
                type="checkbox"
                id="rgpd-checkbox"
                checked={conditionsAcceptees}
                onChange={(e) => setConditionsAcceptees(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="rgpd-checkbox" style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                J'accepte les conditions d'utilisation et la politique de confidentialité RGPD. Mes données sont chiffrées et isolées conformément aux règles académiques.
              </label>
            </div>
          )}

          {/* Encart Erreurs */}
          {erreur && (
            <div style={{
              backgroundColor: 'rgba(255, 180, 171, 0.1)',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              lineHeight: '1.4',
            }}>
              ⚠️ {erreur}
            </div>
          )}

          {/* Encart Success */}
          {successMsg && (
            <div style={{
              backgroundColor: 'rgba(149, 212, 179, 0.1)',
              border: '1px solid var(--color-primary)',
              color: 'var(--color-primary)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              lineHeight: '1.4',
            }}>
              ✅ {successMsg}
            </div>
          )}

          {/* Bouton de Soumission */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: loading ? 'var(--color-primary-container)' : 'var(--color-primary)',
              color: '#041710',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(4, 23, 16, 0.2)',
                  borderTopColor: '#041710',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <span>Traitement...</span>
              </>
            ) : (
              <span>{estInscription ? 'Créer mon compte' : 'Se connecter'}</span>
            )}
          </button>

        </form>
      </div>

      {/* Discret Pied de page pour modal Super Admin */}
      <div style={{
        marginTop: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        zIndex: 5,
      }}>
        <LogoGU
          size="sm"
          onClick={() => setModalSuperAdminOuverte(true)}
          clickable={true}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-muted)', opacity: 0.6 }}>
          Administration GU
        </span>
      </div>

      {/* ── MODAL SUPER ADMIN ── */}
      {modalSuperAdminOuverte && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(2, 12, 8, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '16px',
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '24px 20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxSizing: 'border-box',
          }}>
            {/* Bouton Fermer */}
            <button
              onClick={() => { setModalSuperAdminOuverte(false); setErreurSuperAdmin(''); }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--color-on-surface-muted)',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0,
              color: 'var(--color-on-surface)',
              fontFamily: 'var(--font-display)',
            }}>
              Accès Super Administrateur
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-muted)', margin: 0 }}>
              Saisissez vos identifiants de gestion plateforme.
            </p>

            <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-on-surface-muted)' }}>Email</label>
                <input
                  type="email"
                  placeholder="superadmin@gu.com"
                  value={emailSuperAdmin}
                  onChange={(e) => setEmailSuperAdmin(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--color-on-surface)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-muted)' }}>
                  Code PIN de Sécurité (10 chiffres)
                </label>
                <PinInput length={10} onChange={setPinSuperAdmin} />
              </div>

              {erreurSuperAdmin && (
                <div style={{
                  backgroundColor: 'rgba(255, 180, 171, 0.1)',
                  border: '1px solid var(--color-error)',
                  color: 'var(--color-error)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                }}>
                  ⚠️ {erreurSuperAdmin}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingSuperAdmin || blocageSuperAdmin > 0}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: (loadingSuperAdmin || blocageSuperAdmin > 0) ? 'var(--color-primary-container)' : 'var(--color-accent)',
                  color: '#041710',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: (loadingSuperAdmin || blocageSuperAdmin > 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  marginTop: '6px',
                }}
              >
                {loadingSuperAdmin ? (
                  <span>Authentification...</span>
                ) : blocageSuperAdmin > 0 ? (
                  <span>Bloqué ({blocageSuperAdmin}s)</span>
                ) : (
                  <span>Accéder au panneau GU</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
