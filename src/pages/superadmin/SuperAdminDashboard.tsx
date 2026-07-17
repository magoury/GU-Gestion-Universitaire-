// src/pages/superadmin/SuperAdminDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Dashboard central Super Admin — 5 sections fonctionnelles.
// MRR Growth et Tenant Churn calcules dynamiquement depuis Firebase.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ForestBackground from '../../components/layout/ForestBackground.jsx'
import SuperAdminSidebar from '../../components/superadmin/SuperAdminSidebar.jsx'
import SuperAdminHeader from '../../components/superadmin/SuperAdminHeader.jsx'
import {
  listerUniversites,
  suspendreUniversite,
  reactiverUniversite,
  lireKPIsGlobaux,
  lireRevenusMensuels,
  lireUtilisateursGlobaux,
  lireConfigPlateforme,
  sauvegarderConfigPlateforme,
} from '../../services/superAdminService'
import type { UtilisateurGlobal, ConfigPlateforme } from '../../services/superAdminService'
import { lireAuditLogs } from '../../services/auditService'
import {
  MoneyIcon,
  BuildingIcon,
  ClockIcon,
  TeachersIcon,
  RefreshIcon,
} from '../../components/icons/Icons.jsx'
import type { SaasUniversite } from '@/types'
import type { KPIsGlobaux, RevenuMensuel } from '@/types'
import type { AuditLog } from '@/types'

// Composants UI partagés
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import KPICard from '../../components/ui/KPICard'
import StatusBadge from '../../components/ui/StatusBadge'

// ── Types internes ────────────────────────────────────────────
interface ActionUniv { id: string; nom: string; suspendre: boolean }
type SortKey = 'nom' | 'mrr' | 'dateExpiration'

// ── Utilitaires ───────────────────────────────────────────────
function getHslColor(name = ''): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h % 360)}, 50%, 30%)`
}
function initiales(nom: string): string {
  return nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const KPI_INITIAL: KPIsGlobaux = {
  totalUniversites: 0, nbUniversitesActives: 0, mrr: 0, nbTotalEtudiants: 0, nbAlertes: 0,
}

// MRR Growth reel : mois N vs mois N-1 depuis /saas_admin/revenue/mensuel
function calculerMrrGrowth(revenus: RevenuMensuel[]): string {
  if (revenus.length < 2) return '—'
  const n = revenus[revenus.length - 1].montant
  const n1 = revenus[revenus.length - 2].montant
  if (n1 === 0) return 'N/A'
  const pct = ((n - n1) / n1) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

// Churn approximation : nb suspendus / nb total
// APPROXIMATION documentee : un calcul exact sur 30j necessite un historique
// de changements de statut (non stocke dans la structure Firebase actuelle).
function calculerChurnApprox(univs: SaasUniversite[]): string {
  if (univs.length === 0) return '—'
  const nb = univs.filter(u => u.statut === 'suspendu').length
  return `${((nb / univs.length) * 100).toFixed(1)}%`
}

// ════════════════════════════════════════════════════════════════
function SuperAdminDashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [universites, setUniversites] = useState<SaasUniversite[]>([])
  const [kpis, setKpis] = useState<KPIsGlobaux>(KPI_INITIAL)
  const [revenusMensuels, setRevenusMensuels] = useState<RevenuMensuel[]>([])
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurGlobal[]>([])
  const [config, setConfig] = useState<ConfigPlateforme | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [recherche, setRecherche] = useState<string>('')
  const [filtrePlan, setFiltrePlan] = useState<string>('all')
  const [filtreStatut, setFiltreStatut] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('nom')
  const [rechercheUser, setRechercheUser] = useState<string>('')
  const [filtreRole, setFiltreRole] = useState<string>('all')
  const [universiteDetails, setUniversiteDetails] = useState<SaasUniversite | null>(null)
  const [logsDetails, setLogsDetails] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)
  const [univAActionner, setUnivAActionner] = useState<ActionUniv | null>(null)
  const [configForm, setConfigForm] = useState<ConfigPlateforme>({
    dureeEssaiJours: 30, seuilAlerteEtudiants: 500, seuilAlerteMRR: 100000,
  })
  const [savingConfig, setSavingConfig] = useState<boolean>(false)
  const [configMsg, setConfigMsg] = useState<string>('')

  // ── Metriques calculees ──────────────────────────────────────
  const mrrGrowth = useMemo(() => calculerMrrGrowth(revenusMensuels), [revenusMensuels])
  const churnApprox = useMemo(() => calculerChurnApprox(universites), [universites])
  const maxRevenu = useMemo(() =>
    revenusMensuels.length === 0 ? 1 : Math.max(...revenusMensuels.map(r => r.montant)),
    [revenusMensuels])

  const repartitionPlans = useMemo(() => {
    const c: Record<string, number> = {}
    universites.forEach(u => { c[u.plan] = (c[u.plan] ?? 0) + 1 })
    const t = universites.length || 1
    return Object.entries(c).filter(([, n]) => n > 0)
      .map(([plan, n]) => ({ plan, n, pct: Math.round((n / t) * 100) }))
  }, [universites])

  const univsFiltrees = useMemo<SaasUniversite[]>(() =>
    universites
      .filter(u => {
        const r = u.nom.toLowerCase().includes(recherche.toLowerCase())
          || u.ville.toLowerCase().includes(recherche.toLowerCase())
        const p = filtrePlan === 'all' || u.plan.toLowerCase() === filtrePlan.toLowerCase()
        const s = filtreStatut === 'all' || u.statut === filtreStatut
        return r && p && s
      })
      .sort((a, b) =>
        sortKey === 'mrr' ? b.mrr - a.mrr
          : sortKey === 'dateExpiration' ? b.dateExpiration - a.dateExpiration
            : a.nom.localeCompare(b.nom)
      ),
    [universites, recherche, filtrePlan, filtreStatut, sortKey])

  const usersFiltres = useMemo<UtilisateurGlobal[]>(() =>
    utilisateurs.filter(u => {
      const r = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(rechercheUser.toLowerCase())
      return r && (filtreRole === 'all' || u.role === filtreRole)
    }),
    [utilisateurs, rechercheUser, filtreRole])

  const statsRoles = useMemo(() => {
    const c: Record<string, number> = {}
    utilisateurs.forEach(u => { c[u.role] = (c[u.role] ?? 0) + 1 })
    return c
  }, [utilisateurs])

  // ── Chargement donnees ────────────────────────────────────────
  const chargerDonnees = async (): Promise<void> => {
    setLoading(true)
    try {
      const [uList, stats, revs] = await Promise.all([
        listerUniversites(), lireKPIsGlobaux(), lireRevenusMensuels(),
      ])
      setUniversites(uList); setKpis(stats); setRevenusMensuels(revs)
    } catch (err) {
      console.error('Erreur chargement:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void chargerDonnees() }, [])

  useEffect(() => {
    if (activeSection === 'utilisateurs' && utilisateurs.length === 0)
      void lireUtilisateursGlobaux().then(setUtilisateurs).catch(console.error)
    if (activeSection === 'config' && config === null)
      void lireConfigPlateforme().then(cfg => { setConfig(cfg); setConfigForm(cfg) }).catch(console.error)
  }, [activeSection, utilisateurs.length, config])

  const ouvrirDrawerDetails = async (univ: SaasUniversite): Promise<void> => {
    setUniversiteDetails(univ); setLoadingLogs(true)
    try { setLogsDetails(await lireAuditLogs(univ.id, { limite: 15 })) }
    catch { setLogsDetails([]) } finally { setLoadingLogs(false) }
  }

  const executerActionUniv = async (): Promise<void> => {
    if (!univAActionner) return
    try {
      univAActionner.suspendre
        ? await suspendreUniversite(univAActionner.id)
        : await reactiverUniversite(univAActionner.id)
      setUnivAActionner(null)
      await chargerDonnees()
      if (universiteDetails?.id === univAActionner.id) {
        setUniversiteDetails({ ...universiteDetails, statut: univAActionner.suspendre ? 'suspendu' : 'actif' })
        setLogsDetails(await lireAuditLogs(univAActionner.id, { limite: 15 }))
      }
    } catch (err) { console.error('Erreur:', err); alert('Erreur mise a jour statut.') }
  }

  const handleSaveConfig = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault(); setSavingConfig(true); setConfigMsg('')
    try {
      await sauvegarderConfigPlateforme(configForm)
      setConfig(configForm); setConfigMsg('Configuration sauvegardee.')
    } catch { setConfigMsg('Erreur lors de la sauvegarde.') } finally { setSavingConfig(false) }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="w-screen h-screen overflow-hidden flex font-body text-xs text-on-surface bg-bg select-none">
      <ForestBackground />
      <SuperAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 ml-52 h-screen flex flex-col overflow-hidden">
        <SuperAdminHeader title={activeSection.toUpperCase()} />

        <main className="flex-1 overflow-y-auto p-6 sidebar-nav">
          {loading ? (
            <LoadingSpinner message="Chargement du Command Center..." />
          ) : (<>

            {/* ═══ OVERVIEW ════════════════════════════════════════════ */}
            {activeSection === 'overview' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-on-surface">Global SaaS Monitoring</h2>
                    <p className="text-[10px] text-on-surface-muted">Vue temps reel — tous tenants.</p>
                  </div>
                  <button onClick={() => void chargerDonnees()} className="btn btn-sm btn-ghost h-8 min-h-[32px] w-8 p-0 rounded-md border border-white/10">
                    <RefreshIcon className="w-3.5 h-3.5 text-on-surface-muted" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <KPICard label="Total Revenue (MRR)" value={`${kpis.mrr.toLocaleString('fr-FR')} FCFA`} sub="Actifs + essai uniquement" icon={<MoneyIcon className="w-4.5 h-4.5 text-accent" />} />
                  <KPICard label="Active Universities" value={`${kpis.nbUniversitesActives} / ${kpis.totalUniversites}`} sub="Actives + essai / total" icon={<BuildingIcon className="w-4.5 h-4.5 text-primary" />} />
                  <KPICard label="MRR Growth" value={mrrGrowth} sub="Mois N vs mois N-1" icon={<ClockIcon className="w-4.5 h-4.5 text-success" />} />
                  <KPICard label="Total Students" value={kpis.nbTotalEtudiants.toLocaleString('fr-FR')} sub="Across all tenants" icon={<TeachersIcon className="w-4.5 h-4.5 text-primary" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-surface/60 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <h3 className="font-semibold text-sm text-on-surface">Recent Tenants</h3>
                      <button onClick={() => setActiveSection('universites')} className="text-[10px] text-accent font-semibold hover:underline">View All</button>
                    </div>
                    <table className="table table-sm w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-on-surface-muted text-[10px]">
                          <th className="py-2 pl-0">Universite</th><th>Plan</th><th>Statut</th><th>MRR</th><th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {universites.slice(0, 5).map(u => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2 pl-0">
                              <div className="flex items-center gap-2">
                                <div style={{ backgroundColor: getHslColor(u.nom) }} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{initiales(u.nom)}</div>
                                <div><div className="font-semibold">{u.nom}</div><div className="text-[9px] text-on-surface-muted">{u.ville}</div></div>
                              </div>
                            </td>
                            <td><span className="badge badge-xs badge-outline border-accent text-accent">{u.plan}</span></td>
                            <td><StatusBadge status={u.statut} /></td>
                            <td className="text-accent font-semibold">{u.mrr.toLocaleString('fr-FR')} F</td>
                            <td className="text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => navigate(`/superadmin/university/${u.id}`)} className="btn btn-xs h-6 px-2 bg-primary/20 hover:bg-primary border border-primary/20 text-primary-container hover:text-white">Gerer</button>
                                <button onClick={() => setUnivAActionner({ id: u.id, nom: u.nom, suspendre: u.statut !== 'suspendu' })} className={`btn btn-xs h-6 px-2 border border-white/5 ${u.statut === 'suspendu' ? 'bg-success/20 hover:bg-success text-success-content' : 'bg-error/20 hover:bg-error text-error-content'}`}>{u.statut === 'suspendu' ? 'Reactiver' : 'Suspendre'}</button>
                                <button onClick={() => void ouvrirDrawerDetails(u)} className="btn btn-xs h-6 px-2 btn-ghost border border-white/10">Details</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-surface/60 border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                    <div className="border-b border-white/10 pb-2 mb-2">
                      <h3 className="font-semibold text-sm">Platform Growth</h3>
                      <p className="text-[9px] text-on-surface-muted">MRR mensuel.</p>
                    </div>
                    <div className="h-32 flex items-end justify-between gap-1 px-1">
                      {revenusMensuels.map((r, i) => {
                        const h = `${Math.max(5, (r.montant / maxRevenu) * 100)}%`
                        return (
                          <div key={r.mois} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                            <div style={{ height: h }} className={`w-full rounded-t relative group ${i === revenusMensuels.length - 1 ? 'bg-accent' : 'bg-primary-container'} hover:brightness-125 transition-all`}>
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface border border-white/15 px-1 py-0.5 rounded text-[8px] text-accent opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{r.montant.toLocaleString('fr-FR')}F</div>
                            </div>
                            <span className="text-[9px] text-on-surface-muted">{r.mois}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 text-[10px] mt-2">
                      <div>
                        <span className="text-on-surface-muted">MRR Growth</span>
                        <span className={`font-bold block ${mrrGrowth.startsWith('+') ? 'text-success' : mrrGrowth === '—' ? 'text-on-surface-muted/50' : 'text-error'}`}>{mrrGrowth}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-on-surface-muted">Churn (approx)</span>
                        <span className="text-on-surface-muted/70 font-bold block">{churnApprox}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ ANALYTICS ═══════════════════════════════════════════ */}
            {activeSection === 'analytics' && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Analytics Plateforme</h2>
                  <p className="text-[10px] text-on-surface-muted">Metriques financieres et repartition des tenants.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-surface/60 border border-white/10 rounded-lg p-5">
                    <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">MRR Growth</div>
                    <div className={`text-3xl font-bold font-display mt-2 ${mrrGrowth.startsWith('+') ? 'text-success' : mrrGrowth.startsWith('-') ? 'text-error' : 'text-on-surface-muted'}`}>{mrrGrowth}</div>
                    <p className="text-[9px] text-on-surface-muted mt-2">Calcul reel : mois N vs mois N-1 depuis /saas_admin/revenue/mensuel.</p>
                  </div>
                  <div className="bg-surface/60 border border-white/10 rounded-lg p-5">
                    <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Tenant Churn (approx)</div>
                    <div className="text-3xl font-bold font-display mt-2 text-warning">{churnApprox}</div>
                    {/* APPROXIMATION : suspendus/total — historique 30j non stocke en Firebase. */}
                    <p className="text-[9px] text-on-surface-muted mt-2">Approximation : suspendus / total tenants (historique 30j non disponible).</p>
                  </div>
                  <div className="bg-surface/60 border border-white/10 rounded-lg p-5">
                    <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">MRR Total</div>
                    <div className="text-3xl font-bold font-display mt-2 text-accent">{kpis.mrr.toLocaleString('fr-FR')} F</div>
                    <p className="text-[9px] text-on-surface-muted mt-2">Actifs + essai uniquement (fix M4.8).</p>
                  </div>
                </div>

                <div className="bg-surface/60 border border-white/10 rounded-lg p-5">
                  <h3 className="font-semibold text-sm mb-4">Evolution MRR mensuel</h3>
                  <div className="h-44 flex items-end justify-between gap-2 px-2">
                    {revenusMensuels.map((r, i) => {
                      const h = `${Math.max(5, (r.montant / maxRevenu) * 100)}%`
                      return (
                        <div key={r.mois} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div style={{ height: h }} className={`w-full rounded-t relative group ${i === revenusMensuels.length - 1 ? 'bg-accent' : 'bg-primary-container'} hover:brightness-125 transition-all`}>
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface border border-white/15 px-2 py-1 rounded text-[8px] text-accent opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{r.montant.toLocaleString('fr-FR')} FCFA</div>
                          </div>
                          <span className="text-[9px] text-on-surface-muted">{r.mois}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-surface/60 border border-white/10 rounded-lg p-5">
                  <h3 className="font-semibold text-sm mb-4">Repartition par plan</h3>
                  <div className="flex flex-col gap-3">
                    {repartitionPlans.map(({ plan, n, pct }) => {
                      const c = plan === 'Premium' ? 'bg-accent' : plan === 'Enterprise' ? 'bg-warning' : plan === 'Starter' ? 'bg-primary/50' : 'bg-primary'
                      return (
                        <div key={plan} className="flex items-center gap-3">
                          <span className="text-[10px] text-on-surface-muted w-20 shrink-0">{plan}</span>
                          <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                            <div className={`h-full ${c} rounded transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold w-14 text-right">{n} ({pct}%)</span>
                        </div>
                      )
                    })}
                    {repartitionPlans.length === 0 && <div className="text-on-surface-muted text-[10px]">Aucune universite enregistree.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ UNIVERSITES ═════════════════════════════════════════ */}
            {activeSection === 'universites' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-on-surface">Toutes les universites clientes</h2>
                    <p className="text-[10px] text-on-surface-muted">{univsFiltrees.length} / {universites.length} affichees</p>
                  </div>
                  <button onClick={() => void chargerDonnees()} className="btn btn-sm btn-ghost h-8 w-8 p-0 rounded-md border border-white/10">
                    <RefreshIcon className="w-3.5 h-3.5 text-on-surface-muted" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="h-8 px-3 rounded bg-white/5 border border-white/10 text-[10px] text-on-surface focus:outline-none focus:border-accent" />
                  <select value={filtrePlan} onChange={e => setFiltrePlan(e.target.value)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                    <option value="all">Tous les plans</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="starter">Starter</option>
                  </select>
                  <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                    <option value="all">Tous statuts</option>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="essai">Essai</option>
                  </select>
                  <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                    <option value="nom">Tri : Nom</option>
                    <option value="mrr">Tri : MRR</option>
                    <option value="dateExpiration">Tri : Expiration</option>
                  </select>
                </div>

                {univsFiltrees.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-muted">Aucun tenant ne correspond aux criteres.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {univsFiltrees.map(u => (
                      <div key={u.id} className="bg-surface/80 border border-white/10 rounded-lg p-4 flex flex-col gap-3 hover:border-white/20 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div style={{ backgroundColor: getHslColor(u.nom) }} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/10 shrink-0">{initiales(u.nom)}</div>
                            <div className="overflow-hidden">
                              <h4 className="font-semibold truncate" title={u.nom}>{u.nom}</h4>
                              <span className="text-[9px] text-on-surface-muted">{u.ville}, {u.pays}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`badge badge-xs badge-outline uppercase text-[8px] ${u.plan.toLowerCase() === 'premium' ? 'border-accent text-accent' : u.plan.toLowerCase() === 'enterprise' ? 'border-warning text-warning' : 'border-primary text-primary'}`}>{u.plan}</span>
                            <StatusBadge status={u.statut} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-white/2 p-2 rounded border border-white/5 text-[10px]">
                          <div><span className="text-on-surface-muted block text-[9px]">Effectif</span><span className="font-semibold">{u.nbEtudiants} etudiants</span></div>
                          <div><span className="text-on-surface-muted block text-[9px]">MRR</span><span className="font-semibold text-accent">{u.mrr.toLocaleString('fr-FR')} F</span></div>
                          <div className="col-span-2"><span className="text-on-surface-muted block text-[9px]">Expiration</span><span className="font-semibold">{new Date(u.dateExpiration).toLocaleDateString('fr-FR')}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button onClick={() => navigate(`/superadmin/university/${u.id}`)} className="btn btn-xs h-7 bg-primary hover:bg-primary-container text-white border-none font-semibold uppercase text-[9px] tracking-wider">Gerer</button>
                          <button onClick={() => setUnivAActionner({ id: u.id, nom: u.nom, suspendre: u.statut !== 'suspendu' })} className={`btn btn-xs h-7 border border-white/5 font-semibold uppercase text-[9px] ${u.statut === 'suspendu' ? 'bg-success/20 hover:bg-success text-success-content' : 'bg-error/20 hover:bg-error text-error-content'}`}>{u.statut === 'suspendu' ? 'Activer' : 'Suspendre'}</button>
                          <button onClick={() => void ouvrirDrawerDetails(u)} className="btn btn-xs h-7 btn-ghost border border-white/10 font-semibold uppercase text-[9px]">Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ UTILISATEURS ════════════════════════════════════════ */}
            {activeSection === 'utilisateurs' && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Utilisateurs — Vue globale</h2>
                  <p className="text-[10px] text-on-surface-muted">Tous comptes tenants depuis /users (super_admin exclus).</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([['admin_universite', 'Admins'], ['teacher', 'Enseignants'], ['student', 'Etudiants'], ['parent', 'Parents']] as [string, string][]).map(([role, label]) => (
                    <div key={role} className="bg-surface/60 border border-white/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold font-display text-accent">{statsRoles[role] ?? 0}</div>
                      <div className="text-[10px] text-on-surface-muted mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input type="text" placeholder="Rechercher nom, email..." value={rechercheUser} onChange={e => setRechercheUser(e.target.value)} className="h-8 px-3 rounded bg-white/5 border border-white/10 text-[10px] text-on-surface focus:outline-none focus:border-accent" />
                  <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                    <option value="all">Tous les roles</option>
                    <option value="admin_universite">Admin Universite</option>
                    <option value="teacher">Enseignant</option>
                    <option value="student">Etudiant</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
                {utilisateurs.length === 0 ? (
                  <LoadingSpinner message="Chargement des utilisateurs..." />
                ) : (
                  <div className="bg-surface/60 border border-white/10 rounded-lg overflow-hidden">
                    <table className="table table-sm w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-on-surface-muted text-[10px] bg-white/2">
                          <th className="py-2.5 pl-4">Utilisateur</th>
                          <th>Role</th>
                          <th>Universite</th>
                          <th>Statut</th>
                          <th>Creation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersFiltres.slice(0, 100).map(u => (
                          <tr key={u.uid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2.5 pl-4">
                              <div className="font-semibold">{u.prenom} {u.nom}</div>
                              <div className="text-[9px] text-on-surface-muted">{u.email}</div>
                            </td>
                            <td>
                              <span className={`badge badge-xs badge-outline text-[8px] ${u.role === 'admin_universite' ? 'border-accent text-accent' : u.role === 'teacher' ? 'border-primary text-primary' : u.role === 'parent' ? 'border-warning text-warning' : 'border-white/20 text-on-surface-muted'}`}>{u.role}</span>
                            </td>
                            <td className="font-mono text-[9px] text-on-surface-muted">{u.universityId ?? '—'}</td>
                            <td>{u.actif ? <span className="badge badge-xs badge-success text-[8px]">Actif</span> : <span className="badge badge-xs badge-error text-[8px]">Suspendu</span>}</td>
                            <td className="text-[9px] text-on-surface-muted">{u.dateCreation ? new Date(u.dateCreation).toLocaleDateString('fr-FR') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {usersFiltres.length > 100 && (
                      <div className="text-[9px] text-on-surface-muted p-3 text-center">{usersFiltres.length - 100} utilisateurs supplementaires — affiner la recherche.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ CONFIG ══════════════════════════════════════════════ */}
            {activeSection === 'config' && (
              <div className="flex flex-col gap-4 max-w-xl">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Parametres plateforme</h2>
                  <p className="text-[10px] text-on-surface-muted">Stockes dans /saas_admin/config — s appliquent a toutes les universites.</p>
                </div>
                {config === null ? (
                  <LoadingSpinner message="Chargement de la configuration..." />
                ) : (
                  <form onSubmit={handleSaveConfig} className="bg-surface/60 border border-white/10 rounded-lg p-6 flex flex-col gap-5">
                    {([
                      { key: 'dureeEssaiJours', label: 'Duree essai gratuit', unit: 'jours', min: 1, max: 365, desc: 'Duree accordee a une nouvelle universite avant validation du plan payant.' },
                      { key: 'seuilAlerteEtudiants', label: 'Seuil alerte effectif', unit: 'etudiants / tenant', min: 1, max: 99999, desc: 'Declenche une alerte si un tenant depasse ce nombre d etudiants.' },
                      { key: 'seuilAlerteMRR', label: 'Seuil alerte MRR', unit: 'FCFA', min: 0, max: 99999999, desc: 'Alerte si le MRR global tombe en dessous de ce seuil.' },
                    ] as { key: keyof ConfigPlateforme; label: string; unit: string; min: number; max: number; desc: string }[]).map(({ key, label, unit, min, max, desc }) => (
                      <div key={key} className="flex flex-col gap-2">
                        <label className="text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">{label}</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number" min={min} max={max}
                            value={configForm[key]}
                            onChange={e => setConfigForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                            className="w-32 h-9 px-3 rounded bg-white/5 border border-white/10 text-sm text-on-surface focus:outline-none focus:border-accent"
                          />
                          <span className="text-[11px] text-on-surface-muted">{unit}</span>
                        </div>
                        <p className="text-[9px] text-on-surface-muted">{desc}</p>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                      <button type="submit" disabled={savingConfig} className="btn btn-sm bg-accent hover:bg-accent/80 text-bg border-none font-semibold text-xs px-5 h-9 min-h-[36px]">
                        Sauvegarder
                      </button>
                      <button type="button" onClick={() => { if (config) setConfigForm(config) }} className="btn btn-sm btn-ghost border border-white/10 text-xs h-9">Reinitialiser</button>
                      {configMsg && <span className={`text-[10px] ${configMsg.includes('Erreur') ? 'text-error' : 'text-success'}`}>{configMsg}</span>}
                    </div>
                  </form>
                )}
              </div>
            )}

          </>)}
        </main>
      </div>

      {/* ── Drawer lateral details ─────────────────────────────── */}
      {universiteDetails && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="flex-1" onClick={() => setUniversiteDetails(null)} />
          <div className="w-80 h-screen bg-surface border-l border-white/10 p-5 flex flex-col justify-between z-50 animate-slide-left">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-accent truncate max-w-[200px]">{universiteDetails.nom}</h3>
                  <span className="text-[9px] text-on-surface-muted">Dossier Infrastructure</span>
                </div>
                <button onClick={() => setUniversiteDetails(null)} className="btn btn-xs btn-circle btn-ghost">X</button>
              </div>
              <div className="flex flex-col gap-2 text-[10px]">
                <div className="font-semibold text-on-surface-muted uppercase tracking-wider mb-1">Souscription</div>
                {[['ID', universiteDetails.id], ['Plan', universiteDetails.plan], ['MRR', `${universiteDetails.mrr.toLocaleString('fr-FR')} FCFA`], ['Expiration', new Date(universiteDetails.dateExpiration).toLocaleDateString('fr-FR')]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-on-surface-muted">{k}</span>
                    <span className="font-bold">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Statut</span>
                  <StatusBadge status={universiteDetails.statut} />
                </div>
              </div>
              <div className="mt-5">
                <div className="text-[10px] font-semibold text-on-surface-muted uppercase tracking-wider mb-2">Logs d audit</div>
                {loadingLogs ? (
                  <LoadingSpinner size="xs" message="Chargement..." />
                ) : logsDetails.length === 0 ? (
                  <div className="text-[10px] text-on-surface-muted italic">Aucune activite enregistree.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto sidebar-nav">
                    {logsDetails.map(log => (
                      <div key={log.id} className="p-2 bg-white/2 rounded border border-white/5 text-[9px] hover:bg-white/5">
                        <div className="flex justify-between text-accent font-semibold">
                          <span>{log.action}</span>
                          <span className="text-on-surface-muted/50">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                        <p className="text-on-surface truncate mt-0.5">{log.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <button onClick={() => navigate(`/superadmin/university/${universiteDetails.id}`)} className="w-full btn btn-sm bg-accent hover:bg-accent/80 text-bg border-none font-semibold text-xs uppercase tracking-wider py-2 h-auto">
                Impersonnaliser la session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suspension ─────────────────────── */}
      {univAActionner && (
        <ConfirmationModal
          title={univAActionner.suspendre ? "Suspendre l'université ?" : "Réactiver l'université ?"}
          message={univAActionner.suspendre
            ? `Suspension de "${univAActionner.nom}". Accès bloqués pour tous les utilisateurs du tenant.`
            : `Réactivation de "${univAActionner.nom}". Accès restaurés instantanément.`}
          confirmLabel={univAActionner.suspendre ? 'Suspendre' : 'Réactiver'}
          cancelLabel="Annuler"
          onConfirm={() => void executerActionUniv()}
          onCancel={() => setUnivAActionner(null)}
          variant={univAActionner.suspendre ? 'danger' : 'success'}
        />
      )}

    </div>
  )
}

export default SuperAdminDashboard
