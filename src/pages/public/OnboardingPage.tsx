// src/pages/public/OnboardingPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page d'inscription / onboarding d'une nouvelle université.
// Formulaire haut de gamme en 4 étapes sous le design system "Arbor Tech".
// Intègre la validation de slug en temps réel et l'écriture transactionnelle.
// Supporte l'inscription par mot de passe ou via Google Sign-In avec gardes.
// Redirection directe vers /admin/dashboard après succès.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ref, get, set, runTransaction, remove } from 'firebase/database';
import { database } from '@fb';
import { 
  createUserWithRole, 
  signInWithGooglePopup, 
  checkGoogleUserExists 
} from '@/services/authService';
import { ecrireAuditLog } from '@/services/auditService';
import type { UniversityConfig, SaasUniversite } from '@/types/university.types';
import type { Role } from '@/types';

// ── Types internes ──────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

type SlugStatus = 'empty' | 'invalid_format' | 'checking' | 'available' | 'taken' | 'error';

// ── Helper Slugify ───────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Normalise les accents
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '') // Supprime tout ce qui n'est pas alphanumérique ou tiret
    .replace(/\-\-+/g, '-') // Supprime les tirets consécutifs
    .replace(/^-+/, '') // Supprime les tirets au début
    .replace(/-+$/, ''); // Supprime les tirets à la fin
}

// ── Composant Principal ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── States Formulaire ──────────────────────────────────────────────────────
  
  // Étape 1 : Université
  const [univNom, setUnivNom] = useState('');
  const [univSlug, setUnivSlug] = useState('');
  const [isSlugManuellementModifie, setIsSlugManuellementModifie] = useState(false);
  const [univDevise, setUnivDevise] = useState('FCFA');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('empty');

  // Étape 2 : Administrateur
  const [adminNom, setAdminNom] = useState('');
  const [adminPrenom, setAdminPrenom] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  
  // Google Auth State
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleUid, setGoogleUid] = useState('');
  const [googlePhotoURL, setGooglePhotoURL] = useState<string | null>(null);

  // Étape 3 : Plan
  const [planSelectionne, setPlanSelectionne] = useState<'standard' | 'premium' | 'enterprise'>('standard');

  // État de chargement et d'erreur
  const [etapeActive, setEtapeActive] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Effets et Chargement Initial ───────────────────────────────────────────

  // Pré-remplir le plan depuis l'URL
  useEffect(() => {
    const planParam = searchParams.get('plan')?.toLowerCase();
    if (planParam === 'standard' || planParam === 'premium' || planParam === 'enterprise') {
      setPlanSelectionne(planParam as 'standard' | 'premium' | 'enterprise');
    }
  }, [searchParams]);

  // Génération automatique du slug
  useEffect(() => {
    if (!isSlugManuellementModifie) {
      setUnivSlug(slugify(univNom));
    }
  }, [univNom, isSlugManuellementModifie]);

  // Debounce de la vérification de la disponibilité du slug
  useEffect(() => {
    if (!univSlug) {
      setSlugStatus('empty');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(univSlug)) {
      setSlugStatus('invalid_format');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const slugRef = ref(database, `saas_admin/universites/${univSlug}`);
        const snapshot = await get(slugRef);
        if (snapshot.exists()) {
          setSlugStatus('taken');
        } else {
          setSlugStatus('available');
        }
      } catch (err) {
        console.error(err);
        setSlugStatus('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [univSlug]);

  // ── Actions Google Sign-In ─────────────────────────────────────────────────

  const handleGoogleSignup = async () => {
    setGlobalError(null);
    setLoading(true);

    try {
      const firebaseUser = await signInWithGooglePopup();
      const uid = firebaseUser.uid;

      // Garde 1 : Vérifier si le compte possède déjà un profil utilisateur
      const profilExistant = await checkGoogleUserExists(uid);
      if (profilExistant) {
        setGlobalError(
          "Un compte administrateur est déjà associé à ce profil Google. Vous allez être redirigé vers la page de connexion."
        );
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        return;
      }

      // Extraction des noms/prénoms depuis le displayName Google
      const displayName = firebaseUser.displayName || '';
      const parts = displayName.trim().split(/\s+/);
      const prenom = parts[0] || '';
      const nom = parts.slice(1).join(' ') || '';

      // Pré-remplir les données de l'administrateur
      setAdminPrenom(prenom);
      setAdminNom(nom);
      setAdminEmail(firebaseUser.email || '');
      setGoogleUid(uid);
      setGooglePhotoURL(firebaseUser.photoURL);
      setIsGoogleAuth(true);
      
      // Passer à l'étape suivante automatiquement après association réussie
      setEtapeActive(3);
    } catch (err: any) {
      setGlobalError(err.message || "Une erreur est survenue lors de l'authentification Google.");
    } finally {
      setLoading(false);
    }
  };

  // ── Validation d'Étapes ────────────────────────────────────────────────────

  const validerEtape = (): boolean => {
    setGlobalError(null);
    
    if (etapeActive === 1) {
      if (!univNom.trim()) {
        setGlobalError("Le nom de l'université est requis.");
        return false;
      }
      if (slugStatus === 'empty') {
        setGlobalError("Le slug de l'université est requis.");
        return false;
      }
      if (slugStatus === 'invalid_format') {
        setGlobalError("Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.");
        return false;
      }
      if (slugStatus === 'taken') {
        setGlobalError("Ce slug d'université est déjà utilisé. Veuillez en choisir un autre.");
        return false;
      }
      if (slugStatus !== 'available') {
        setGlobalError("La disponibilité du slug est en cours de vérification.");
        return false;
      }
    }
    
    if (etapeActive === 2) {
      if (isGoogleAuth) {
        if (!adminNom.trim() || !adminPrenom.trim()) {
          setGlobalError("Veuillez renseigner le nom et le prénom de l'administrateur.");
          return false;
        }
      } else {
        if (!adminNom.trim() || !adminPrenom.trim()) {
          setGlobalError("Le nom et le prénom de l'administrateur sont requis.");
          return false;
        }
        if (!adminEmail.trim()) {
          setGlobalError("L'adresse e-mail est requise.");
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminEmail)) {
          setGlobalError("L'adresse e-mail saisie est invalide.");
          return false;
        }
        if (adminPassword.length < 8) {
          setGlobalError("Le mot de passe doit contenir au moins 8 caractères.");
          return false;
        }
        if (adminPassword !== adminConfirmPassword) {
          setGlobalError("Les mots de passe ne correspondent pas.");
          return false;
        }
      }
    }
    
    return true;
  };

  const handleSuivant = () => {
    if (validerEtape()) {
      setEtapeActive((prev) => (prev + 1) as Step);
    }
  };

  const handlePrecedent = () => {
    setGlobalError(null);
    setEtapeActive((prev) => (prev - 1) as Step);
  };

  // ── Soumission Finale ──────────────────────────────────────────────────────

  const handleSoumissionOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validerEtape()) return;

    setLoading(true);
    setGlobalError(null);

    const lowercaseSlug = univSlug.toLowerCase().trim();

    try {
      // 1. D'ABORD : Réserver le slug via runTransaction() de Firebase Database
      const saasUnivRef = ref(database, `saas_admin/universites/${lowercaseSlug}`);
      
      const transactionResult = await runTransaction(saasUnivRef, (currentData) => {
        if (currentData !== null) {
          // Slug déjà pris au moment précis de l'écriture
          return;
        }
        
        // Initialiser l'université dans saas_admin
        const newUnivSaaS: SaasUniversite = {
          id: lowercaseSlug,
          nom: univNom.trim(),
          slug: lowercaseSlug,
          ville: 'Abidjan',
          pays: "Côte d'Ivoire",
          logo: null,
          plan: planSelectionne === 'standard' ? 'Standard' : planSelectionne === 'premium' ? 'Premium' : 'Enterprise',
          statut: 'essai',
          nbEtudiants: 0,
          dateExpiration: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours d'essai gratuit
          mrr: 0
        };
        return newUnivSaaS;
      });

      if (!transactionResult.committed) {
        throw new Error("Ce slug d'université a été pris par un autre utilisateur entre-temps. Veuillez en choisir un autre à l'étape 1.");
      }

      // Si la transaction a réussi, nous pouvons procéder aux autres écritures sous try/catch interne pour rollback.
      try {
        let finalUid = '';

        // 2. Création de l'authentification et du profil
        if (isGoogleAuth) {
          // Inscription via Google
          finalUid = googleUid;
          
          // Création directe du profil dans /users/$uid
          const userProfileRef = ref(database, `users/${finalUid}`);
          await set(userProfileRef, {
            email: adminEmail,
            role: 'admin_universite' as Role,
            universityId: lowercaseSlug,
            nom: adminNom.trim(),
            prenom: adminPrenom.trim(),
            photoURL: googlePhotoURL || null,
            dateCreation: Date.now(),
            actif: true
          });

          // Écriture du log d'audit initial pour le tenant
          await ecrireAuditLog(lowercaseSlug, {
            acteurId: finalUid,
            acteurNom: `${adminPrenom.trim()} ${adminNom.trim()}`,
            acteurRole: 'admin_universite',
            action: 'COMPTE_CREE',
            cible: finalUid,
            detail: `Création du compte administrateur université via Google Sign-In lors de l'onboarding.`,
          });
        } else {
          // Inscription Classique (Email/Mot de passe)
          const creationResult = await createUserWithRole(
            adminEmail.trim(),
            adminPassword,
            'admin_universite' as Role,
            lowercaseSlug,
            adminNom.trim(),
            adminPrenom.trim(),
            null
          );
          finalUid = creationResult.uid;
        }

        // 3. Écriture de la configuration du tenant sous /universities/$slug/config
        const univConfigRef = ref(database, `universities/${lowercaseSlug}/config`);
        const configData: UniversityConfig = {
          nom: univNom.trim(),
          slug: lowercaseSlug,
          dateCreation: Date.now(),
          devise: univDevise,
          actif: true,
          anneeAcademiqueActive: '2026-2027',
          logo: null
        };
        await set(univConfigRef, configData);

        // 4. Inscription réussie, affichage du succès et redirection vers le dashboard
        setSuccessMessage("Votre université a été enregistrée avec succès. Redirection en cours...");
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 2000);

      } catch (innerError: any) {
        // ROLLBACK SYSTEM : Si la création de compte ou de config échoue
        console.error("Échec des étapes post-transaction de l'onboarding, déclenchement du rollback :", innerError);
        
        try {
          await remove(ref(database, `saas_admin/universites/${lowercaseSlug}`));
          await remove(ref(database, `universities/${lowercaseSlug}`));
        } catch (cleanupErr) {
          console.error("Erreur lors de l'exécution du nettoyage du rollback :", cleanupErr);
        }

        throw innerError;
      }

    } catch (err: any) {
      setGlobalError(err.message || "Une erreur est survenue lors de la création de l'université.");
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu Visuel (Aesthetics Arbor Tech) ───────────────────────────────────

  return (
    <div className="relative min-h-screen bg-arbor-bg text-arbor-on-surface flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-arbor-body">
      
      {/* Grille technique de fond identique à la Landing page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />
      
      {/* Halo de lumière décoratif d'arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-arbor-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Conteneur de la carte (z-10 pour être devant les grilles) */}
      <div className="relative z-10 w-full max-w-lg">
        
        {/* En-tête de page : Logo + Titre principal */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-arbor-primary flex items-center justify-center text-arbor-on-primary font-black shadow-lg shadow-arbor-primary/25 text-sm cursor-pointer select-none mb-4 active:scale-95 transition-all duration-200"
          >
            GU
          </div>
          <h2 className="font-arbor-display text-2xl font-extrabold text-white tracking-tight">
            Créer votre université
          </h2>
          <p className="text-xs text-arbor-on-surface-variant mt-1.5 max-w-sm">
            Démarrez la digitalisation académique de votre établissement en quelques étapes.
          </p>
        </div>

        {/* Carte d'Onboarding Glassmorphism */}
        <div className="bg-arbor-surface/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8">
          
          {/* Indicateur de Progression (Points horizontal) */}
          <div className="flex items-center justify-between mb-8 px-4">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      etapeActive === step
                        ? 'bg-arbor-primary text-arbor-on-primary shadow-md shadow-arbor-primary/30 ring-2 ring-white/10 scale-110'
                        : etapeActive > step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/5 text-arbor-on-surface-variant border border-white/10'
                    }`}
                  >
                    {etapeActive > step ? '✓' : step}
                  </div>
                  <span className="text-[9px] text-arbor-on-surface-variant font-medium mt-1 uppercase tracking-wider hidden sm:inline">
                    {step === 1 ? 'Université' : step === 2 ? 'Administrateur' : step === 3 ? 'Plan' : 'Validation'}
                  </span>
                </div>
                {step < 4 && (
                  <div className="flex-grow h-px mx-2 bg-white/10 relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-arbor-primary transition-all duration-500" 
                      style={{ width: etapeActive > step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Messages de Notification d'erreur/succès */}
          {globalError && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 leading-relaxed font-arbor-body">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{globalError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 leading-relaxed font-arbor-body">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulaire Principal */}
          <form onSubmit={handleSoumissionOnboarding} className="space-y-6">
            
            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 1 : CONFIGURATION UNIVERSITÉ 
               ───────────────────────────────────────────────────────────────── */}
            {etapeActive === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-arbor-display text-arbor-primary">
                  1. Votre établissement
                </h3>
                
                {/* Champ Nom de l'université */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nom complet de l'université"
                    value={univNom}
                    onChange={(e) => setUnivNom(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                  />
                </div>

                {/* Champ Slug avec génération automatique */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="slug-url-unique"
                    value={univSlug}
                    onChange={(e) => {
                      setIsSlugManuellementModifie(true);
                      setUnivSlug(slugify(e.target.value));
                    }}
                    className="w-full pl-10 pr-24 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                  />
                  {/* Indicateur de disponibilité du slug */}
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    {slugStatus === 'checking' && (
                      <span className="text-[10px] text-arbor-on-surface-variant/70 animate-pulse">Vérification...</span>
                    )}
                    {slugStatus === 'available' && (
                      <span className="text-[10px] text-emerald-400 font-semibold">✓ Disponible</span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="text-[10px] text-red-400 font-semibold">✗ Déjà utilisé</span>
                    )}
                    {slugStatus === 'invalid_format' && (
                      <span className="text-[10px] text-amber-400 font-semibold">Format invalide</span>
                    )}
                  </div>
                </div>
                <p className="text-[9px] text-arbor-on-surface-variant/70 px-4 leading-normal">
                  Ce slug servira d'identifiant dans votre URL. Exemple : <span className="text-arbor-primary">https://{univSlug || 'slug'}.univ-gu.ci</span>
                </p>

                {/* Sélecteur de Devise */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16v1" />
                    </svg>
                  </div>
                  <select
                    value={univDevise}
                    onChange={(e) => setUnivDevise(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs text-white bg-arbor-surface border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="FCFA">Franc CFA (FCFA)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollar Américain ($)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/50">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 2 : COMPTE ADMINISTRATEUR
               ───────────────────────────────────────────────────────────────── */}
            {etapeActive === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-arbor-display text-arbor-primary">
                  2. Création de votre compte administrateur
                </h3>

                {/* Option Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-slate-900 text-xs font-semibold rounded-full shadow-md transition-all duration-200 active:scale-98 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  S'inscrire avec Google
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-grow h-px bg-white/10" />
                  <span className="text-[10px] text-arbor-on-surface-variant font-medium uppercase tracking-wider">ou par e-mail</span>
                  <div className="flex-grow h-px bg-white/10" />
                </div>

                {/* Formulaire Classique : Nom & Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Prénom"
                      value={adminPrenom}
                      onChange={(e) => setAdminPrenom(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Nom"
                      value={adminNom}
                      onChange={(e) => setAdminNom(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Champ Email */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    disabled={isGoogleAuth}
                    placeholder="Adresse e-mail"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary disabled:bg-white/5 disabled:text-arbor-on-surface-variant/70 disabled:border-white/5 transition-all duration-200"
                  />
                </div>

                {!isGoogleAuth ? (
                  <>
                    {/* Mots de passe */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="Mot de passe (8 caractères minimum)"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-arbor-on-surface-variant/75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="Confirmer le mot de passe"
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-arbor-on-surface-variant/50 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-arbor-primary focus:ring-1 focus:ring-arbor-primary transition-all duration-200"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Authentifié via Google sous l'adresse <strong>{adminEmail}</strong>. Aucun mot de passe n'est requis.</span>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 3 : CHOIX DU PLAN
               ───────────────────────────────────────────────────────────────── */}
            {etapeActive === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-arbor-display text-arbor-primary">
                  3. Choix du plan d'abonnement
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {/* Plan Standard */}
                  <div 
                    onClick={() => setPlanSelectionne('standard')}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      planSelectionne === 'standard'
                        ? 'bg-arbor-primary/10 border-arbor-primary shadow-[0_0_15px_rgba(87,241,219,0.08)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white font-arbor-display">Offre Standard</span>
                      <span className="text-xs font-black text-arbor-primary">130 000 FCFA <span className="text-[9px] font-medium text-arbor-on-surface-variant">/m</span></span>
                    </div>
                    <p className="text-[10px] text-arbor-on-surface-variant leading-relaxed">
                      Jusqu'à 1 000 étudiants. Idéal pour les universités en croissance souhaitant automatiser leur scolarité et leurs notes.
                    </p>
                  </div>

                  {/* Plan Premium */}
                  <div 
                    onClick={() => setPlanSelectionne('premium')}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      planSelectionne === 'premium'
                        ? 'bg-arbor-primary/10 border-arbor-primary shadow-[0_0_15px_rgba(87,241,219,0.08)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white font-arbor-display">Offre Premium</span>
                      <span className="text-xs font-black text-arbor-primary">250 000 FCFA <span className="text-[9px] font-medium text-arbor-on-surface-variant">/m</span></span>
                    </div>
                    <p className="text-[10px] text-arbor-on-surface-variant leading-relaxed">
                      Jusqu'à 3 000 étudiants. Inclut le module de finances avancé, la messagerie et les analyses prédictives.
                    </p>
                  </div>

                  {/* Plan Enterprise */}
                  <div 
                    onClick={() => setPlanSelectionne('enterprise')}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      planSelectionne === 'enterprise'
                        ? 'bg-arbor-primary/10 border-arbor-primary shadow-[0_0_15px_rgba(87,241,219,0.08)]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-white font-arbor-display">Offre Enterprise</span>
                      <span className="text-xs font-black text-arbor-primary">Sur Devis</span>
                    </div>
                    <p className="text-[10px] text-arbor-on-surface-variant leading-relaxed">
                      Étudiants illimités. Hébergement dédié, support 24/7 et développements sur-mesure pour votre structure.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[9px] text-arbor-on-surface-variant leading-relaxed">
                  💡 <strong>Note d'essai :</strong> Votre inscription commence par un essai gratuit de 30 jours. Aucune information de facturation ou carte bancaire n'est requise. La validation se fera ultérieurement.
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────
                ÉTAPE 4 : RÉCAPITULATIF ET SOUMISSION
               ───────────────────────────────────────────────────────────────── */}
            {etapeActive === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-arbor-display text-arbor-primary">
                  4. Vérification et validation finale
                </h3>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3.5 text-xs text-arbor-on-surface-variant">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Université :</span>
                    <span>{univNom}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Identifiant URL (Slug) :</span>
                    <span className="text-arbor-primary font-mono">{univSlug}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Devise :</span>
                    <span>{univDevise}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Administrateur :</span>
                    <span>{adminPrenom} {adminNom}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Email admin :</span>
                    <span>{adminEmail}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-white">Authentification :</span>
                    <span className="capitalize">{isGoogleAuth ? 'Google Account' : 'Email / Mot de passe'}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-white">Plan sélectionné :</span>
                    <span className="font-bold text-arbor-primary uppercase">{planSelectionne}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[9px] text-amber-300 leading-normal">
                  ⚠️ En clicking sur "Créer mon université", vous confirmez l'exactitude des informations ci-dessus. L'écriture et la configuration du tenant seront initiées immédiatement.
                </div>
              </div>
            )}

            {/* Barre de navigation d'actions (Boutons Suivant / Précédent) */}
            <div className="flex gap-4 pt-4 border-t border-white/5 font-arbor-body">
              {etapeActive > 1 && (
                <button
                  type="button"
                  onClick={handlePrecedent}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-full shadow-md transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Précédent
                </button>
              )}
              
              {etapeActive < 4 ? (
                <button
                  type="button"
                  onClick={handleSuivant}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-arbor-primary text-arbor-on-primary hover:bg-arbor-secondary-container hover:text-white text-xs font-semibold rounded-full shadow-md shadow-arbor-primary/10 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-arbor-primary text-arbor-on-primary hover:bg-arbor-secondary-container hover:text-white text-xs font-semibold rounded-full shadow-md shadow-arbor-primary/10 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Créer mon université
                </button>
              )}
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
