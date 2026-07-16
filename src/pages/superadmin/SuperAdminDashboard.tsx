// src/pages/superadmin/SuperAdminDashboard.tsx
// ──────────────────────────────────────────────────────────────
// Dashboard central du Super Admin — Command Center.
// Visualisation globale, MRR, suspension, impersonnalisation.
//
// MIGRATION : JSX → TSX (M6)
//   - Import corrigé : superAdminService.ts (pas .js)
//   - MRR correctement exclu pour les tenants suspendu (fix M4.8 actif)
//   - Types stricts : SaasUniversite, KPIsGlobaux, RevenuMensuel, AuditLog
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
} from '../../services/superAdminService'
import { lireAuditLogs } from '../../services/auditService.js'
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

interface ActionUniv {
  id: string
  nom: string
  suspendre: boolean
}

function getHslColor(name = ''): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash % 360)
  return `hsl(${h}, 50%, 30%)`
}

const KPI_INITIAL: KPIsGlobaux = {
  totalUniversites: 0,
  nbUniversitesActives: 0,
  mrr: 0,
  nbTotalEtudiants: 0,
  nbAlertes: 0,
}

function SuperAdminDashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string>('overview')

  const [universites, setUniversites] = useState<SaasUniversite[]>([])
  const [kpis, setKpis] = useState<KPIsGlobaux>(KPI_INITIAL)
  const [revenusMensuels, setRevenusMensuels] = useState<RevenuMensuel[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [recherche, setRecherche] = useState<string>('')
  const [filtrePlan, setFiltrePlan] = useState<string>('all')
  const [filtreStatut, setFiltreStatut] = useState<string>('all')

  const [universiteDetails, setUniversiteDetails] = useState<SaasUniversite | null>(null)
  const [logsDetails, setLogsDetails] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)

  const [univAActionner, setUnivAActionner] = useState<ActionUniv | null>(null)

  const chargerDonnees = async (): Promise<void> => {
    setLoading(true)
    try {
      const [uList, stats, revs] = await Promise.all([
        listerUniversites(),
        lireKPIsGlobaux(),
        lireRevenusMensuels(),
      ])
      setUniversites(uList)
      setKpis(stats)
      setRevenusMensuels(revs)
    } catch (err) {
      console.error('Erreur de chargement des donnees Super Admin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void chargerDonnees()
  }, [])

  const ouvrirDrawerDetails = async (univ: SaasUniversite): Promise<void> => {
    setUniversiteDetails(univ)
    setLoadingLogs(true)
    try {
      const logs = await lireAuditLogs(univ.id, { limite: 15 })
      setLogsDetails(logs)
    } catch (err) {
      console.error('Erreur chargement logs audit:', err)
      setLogsDetails([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const executerActionUniv = async (): Promise<void> => {
    if (!univAActionner) return
    try {
      if (univAActionner.suspendre) {
        await suspendreUniversite(univAActionner.id)
      } else {
        await reactiverUniversite(univAActionner.id)
      }
      setUnivAActionner(null)
      await chargerDonnees()
      if (universiteDetails && universiteDetails.id === univAActionner.id) {
        setUniversiteDetails({ ...universiteDetails, statut: univAActionner.suspendre ? 'suspendu' : 'actif' })
        const logs = await lireAuditLogs(univAActionner.id, { limite: 15 })
        setLogsDetails(logs)
      }
    } catch (err) {
      console.error('Erreur action universite:', err)
      alert('Erreur lors de la mise a jour du statut.')
    }
  }

  const univsFiltrees = useMemo<SaasUniversite[]>(() => {
    return universites.filter((u) => {
      const matchRecherche =
        u.nom.toLowerCase().includes(recherche.toLowerCase()) ||
        u.ville.toLowerCase().includes(recherche.toLowerCase()) ||
        u.pays.toLowerCase().includes(recherche.toLowerCase())
      const matchPlan = filtrePlan === 'all' || u.plan.toLowerCase() === filtrePlan.toLowerCase()
      const matchStatut = filtreStatut === 'all' || u.statut.toLowerCase() === filtreStatut.toLowerCase()
      return matchRecherche && matchPlan && matchStatut
    })
  }, [universites, recherche, filtrePlan, filtreStatut])

  const maxRevenu = useMemo<number>(() => {
    if (revenusMensuels.length === 0) return 1
    return Math.max(...revenusMensuels.map((r) => r.montant))
  }, [revenusMensuels])

  return (
    <div className="w-screen h-screen overflow-hidden flex font-body text-xs text-on-surface bg-bg select-none">
      <ForestBackground />
      <SuperAdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 ml-52 h-screen flex flex-col overflow-hidden">
        <SuperAdminHeader title={activeSection.toUpperCase()} />
        <main className="flex-1 overflow-y-auto p-6 sidebar-nav">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center flex-col gap-2">
              <span className="loading loading-spinner text-accent loading-md"></span>
              <span className="text-on-surface-muted tracking-wider text-xs">Chargement du Command Center...</span>
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-on-surface">Global SaaS Monitoring &amp; Infrastructure Health</h2>
                      <p className="text-[10px] text-on-surface-muted">Vue d ensemble en temps reel de tous les tenants et de l etat financier de la plateforme.</p>
                    </div>
                    <button onClick={() => void chargerDonnees()} title="Rafraichir" className="btn btn-sm btn-ghost h-8 min-h-[32px] w-8 p-0 flex items-center justify-center rounded-md border border-white/10">
                      <RefreshIcon className="w-3.5 h-3.5 text-on-surface-muted hover:text-on-surface" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* MRR — donnees reelles via superAdminService.ts (fix M4.8 : suspendu exclu) */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Total Revenue (MRR)</div>
                        <div className="text-xl font-bold font-display text-accent mt-1">{kpis.mrr.toLocaleString('fr-FR')} FCFA</div>
                        {/* TODO(M7): calculer croissance trimestrielle depuis Firebase — valeur "+12.5%" etait fictive */}
                        <span className="text-[9px] text-on-surface-muted/50 font-medium block mt-0.5">Donnees Firebase temps reel</span>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-surface-high border border-white/5 flex items-center justify-center flex-shrink-0">
                        <MoneyIcon className="w-4.5 h-4.5 text-accent" />
                      </div>
                    </div>

                    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Active Universities</div>
                        <div className="text-xl font-bold font-display text-on-surface mt-1">{kpis.nbUniversitesActives} / {kpis.totalUniversites}</div>
                        {/* TODO(M7): calculer delta mensuel d inscriptions */}
                        <span className="text-[9px] text-on-surface-muted/50 font-medium block mt-0.5">Actives + essai / total</span>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-surface-high border border-white/5 flex items-center justify-center flex-shrink-0">
                        <BuildingIcon className="w-4.5 h-4.5 text-primary" />
                      </div>
                    </div>

                    {/* Uptime — TODO connecter monitoring reel (valeur 99.99% etait fictive) */}
                    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">System Uptime</div>
                        <div className="text-xl font-bold font-display text-on-surface mt-1">—</div>
                        {/* TODO(M7): connecter Firebase Hosting / monitoring externe */}
                        <span className="text-[9px] text-on-surface-muted/50 block mt-0.5">Monitoring a connecter</span>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-surface-high border border-white/5 flex items-center justify-center flex-shrink-0">
                        <ClockIcon className="w-4.5 h-4.5 text-success" />
                      </div>
                    </div>

                    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-on-surface-muted uppercase tracking-wider font-semibold">Total Users</div>
                        <div className="text-xl font-bold font-display text-on-surface mt-1">{kpis.nbTotalEtudiants.toLocaleString('fr-FR')}</div>
                        <span className="text-[9px] text-on-surface-muted/50 block mt-0.5">Across all tenants</span>
                      </div>
                      <div className="w-9 h-9 rounded-md bg-surface-high border border-white/5 flex items-center justify-center flex-shrink-0">
                        <TeachersIcon className="w-4.5 h-4.5 text-primary" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-1">
                    <div className="lg:col-span-2 bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <h3 className="font-semibold text-sm text-on-surface">Recent Active Tenants</h3>
                        <button onClick={() => setActiveSection('universites')} className="text-[10px] text-accent font-semibold hover:underline">View All &rarr;</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="table table-sm w-full text-left">
                          <thead>
                            <tr className="border-b border-white/5 text-on-surface-muted text-[10px]">
                              <th className="py-2 pl-0">University Name</th>
                              <th className="py-2">Plan Level</th>
                              <th className="py-2">Status</th>
                              <th className="py-2">Monthly Revenue</th>
                              <th className="py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {universites.slice(0, 5).map((univ) => {
                              const color = getHslColor(univ.nom)
                              const initiales = univ.nom.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                              return (
                                <tr key={univ.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2.5 pl-0 flex items-center gap-2">
                                    <div style={{ backgroundColor: color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/10 flex-shrink-0">{initiales}</div>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-on-surface">{univ.nom}</span>
                                      <span className="text-[9px] text-on-surface-muted">{univ.ville}, {univ.pays}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5"><span className="badge badge-xs badge-outline border-accent text-accent font-medium">{univ.plan}</span></td>
                                  <td className="py-2.5">
                                    {univ.statut === 'actif' && <span className="badge badge-xs badge-success text-[9px]">Actif</span>}
                                    {univ.statut === 'suspendu' && <span className="badge badge-xs badge-error text-[9px]">Suspendu</span>}
                                    {univ.statut === 'essai' && <span className="badge badge-xs badge-warning text-[9px]">Essai</span>}
                                  </td>
                                  <td className="py-2.5 font-display text-accent font-semibold">{univ.mrr.toLocaleString('fr-FR')} FCFA</td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button onClick={() => navigate(`/superadmin/university/${univ.id}`)} className="btn btn-xs h-6 min-h-[24px] px-2 bg-primary/20 hover:bg-primary text-primary-container border border-primary/20 hover:text-white">Gerer</button>
                                      <button onClick={() => setUnivAActionner({ id: univ.id, nom: univ.nom, suspendre: univ.statut !== 'suspendu' })} className={`btn btn-xs h-6 min-h-[24px] px-2 border border-white/5 ${univ.statut === 'suspendu' ? 'bg-success/20 hover:bg-success text-success-content' : 'bg-error/20 hover:bg-error text-error-content'}`}>{univ.statut === 'suspendu' ? 'Reactiver' : 'Suspendre'}</button>
                                      <button onClick={() => void ouvrirDrawerDetails(univ)} className="btn btn-xs h-6 min-h-[24px] px-2 btn-ghost border border-white/10">Details</button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col justify-between">
                      <div className="border-b border-white/10 pb-2 mb-2">
                        <h3 className="font-semibold text-sm text-on-surface">Global Platform Growth</h3>
                        <p className="text-[9px] text-on-surface-muted">Revenus mensuels recurrents cumules.</p>
                      </div>
                      <div className="h-32 flex items-end justify-between gap-1.5 px-2">
                        {revenusMensuels.map((r, i) => {
                          const hauteur = `${Math.max(5, Math.min(100, (r.montant / maxRevenu) * 100))}%`
                          const estDernier = i === revenusMensuels.length - 1
                          return (
                            <div key={r.mois} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <div style={{ height: hauteur }} className={`w-full rounded-t-sm transition-all duration-500 hover:brightness-125 relative group ${estDernier ? 'bg-accent' : 'bg-primary-container'}`}>
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface border border-white/15 px-1.5 py-0.5 rounded text-[8px] font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">{r.montant.toLocaleString('fr-FR')} F</div>
                              </div>
                              <span className="text-[9px] text-on-surface-muted">{r.mois}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-2 text-[10px]">
                        <div>
                          <span className="text-on-surface-muted">MRR Growth</span>
                          {/* TODO(M7): calculer depuis Firebase (valeur +24.8% etait fictive) */}
                          <span className="text-on-surface-muted/50 font-bold block">—</span>
                        </div>
                        <div className="text-right">
                          <span className="text-on-surface-muted">Tenant Churn</span>
                          {/* TODO(M7): calculer depuis suspensions Firebase (valeur 0.4% etait fictive) */}
                          <span className="text-on-surface-muted/50 font-bold block">—</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-4 mt-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                      <div>
                        <h3 className="font-semibold text-sm text-on-surface">Toutes les universites clientes</h3>
                        <p className="text-[9px] text-on-surface-muted">Rechercher et filtrer les tenants academiques.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="text" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="h-8 px-3 rounded bg-white/5 border border-white/10 text-[10px] text-on-surface placeholder-on-surface-muted/50 focus:outline-none focus:border-accent" />
                        <select value={filtrePlan} onChange={(e) => setFiltrePlan(e.target.value)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                          <option value="all">Tous les plans</option>
                          <option value="standard">Standard</option>
                          <option value="premium">Premium</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="h-8 px-2 rounded bg-surface border border-white/10 text-[10px] text-on-surface focus:outline-none">
                          <option value="all">Tous les statuts</option>
                          <option value="actif">Actif</option>
                          <option value="suspendu">Suspendu</option>
                          <option value="essai">Essai</option>
                        </select>
                      </div>
                    </div>
                    {univsFiltrees.length === 0 ? (
                      <div className="p-8 text-center text-on-surface-muted">Aucune universite ne correspond aux criteres de recherche.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {univsFiltrees.map((univ) => {
                          const color = getHslColor(univ.nom)
                          const initiales = univ.nom.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                          return (
                            <div key={univ.id} className="bg-surface/80 border border-white/10 rounded-lg p-4 flex flex-col justify-between gap-3 hover:border-white/20 transition-all">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div style={{ backgroundColor: color }} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white/10 flex-shrink-0">{initiales}</div>
                                  <div className="flex flex-col overflow-hidden">
                                    <h4 className="font-semibold text-on-surface truncate" title={univ.nom}>{univ.nom}</h4>
                                    <span className="text-[9px] text-on-surface-muted">{univ.ville}, {univ.pays}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className={`badge badge-xs badge-outline uppercase tracking-wider font-semibold text-[8px] ${univ.plan.toLowerCase() === 'premium' ? 'border-accent text-accent' : univ.plan.toLowerCase() === 'enterprise' ? 'border-warning text-warning' : 'border-primary text-primary'}`}>{univ.plan}</span>
                                  {univ.statut === 'actif' && <span className="badge badge-xs badge-success text-[8px]">Actif</span>}
                                  {univ.statut === 'suspendu' && <span className="badge badge-xs badge-error text-[8px]">Suspendu</span>}
                                  {univ.statut === 'essai' && <span className="badge badge-xs badge-warning text-[8px]">Essai</span>}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 bg-white/2 p-2 rounded border border-white/5 text-[10px]">
                                <div>
                                  <span className="text-on-surface-muted block text-[9px]">Effectif</span>
                                  <span className="font-semibold">{univ.nbEtudiants} etudiants</span>
                                </div>
                                <div>
                                  <span className="text-on-surface-muted block text-[9px]">Date d expiration</span>
                                  <span className="font-semibold">{new Date(univ.dateExpiration).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 mt-1">
                                <button onClick={() => navigate(`/superadmin/university/${univ.id}`)} className="btn btn-xs h-7 min-h-[28px] bg-primary hover:bg-primary-container text-white border-none font-semibold uppercase text-[9px] tracking-wider rounded">Gerer</button>
                                <button onClick={() => setUnivAActionner({ id: univ.id, nom: univ.nom, suspendre: univ.statut !== 'suspendu' })} className={`btn btn-xs h-7 min-h-[28px] border border-white/5 font-semibold uppercase text-[9px] tracking-wider rounded ${univ.statut === 'suspendu' ? 'bg-success/20 hover:bg-success text-success-content' : 'bg-error/20 hover:bg-error text-error-content'}`}>{univ.statut === 'suspendu' ? 'Activer' : 'Suspendre'}</button>
                                <button onClick={() => void ouvrirDrawerDetails(univ)} className="btn btn-xs h-7 min-h-[28px] btn-ghost border border-white/10 font-semibold uppercase text-[9px] tracking-wider rounded">Details</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeSection !== 'overview' && (
                <div className="bg-surface/60 backdrop-blur-sm border border-white/10 rounded-lg p-6 text-center text-on-surface-muted">
                  <h2 className="text-sm font-semibold text-on-surface mb-2 capitalize">{activeSection} Section</h2>
                  <p className="text-[10px]">Cette section du Command Center (Super Admin) est rattachee au monitoring global.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {universiteDetails && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="flex-1" onClick={() => setUniversiteDetails(null)} />
          <div className="w-80 h-screen bg-surface border-l border-white/10 p-5 flex flex-col justify-between z-50 animate-slide-left">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex flex-col">
                  <h3 className="font-semibold text-sm text-accent truncate max-w-[200px]" title={universiteDetails.nom}>{universiteDetails.nom}</h3>
                  <span className="text-[9px] text-on-surface-muted">Dossier Infrastructure</span>
                </div>
                <button onClick={() => setUniversiteDetails(null)} className="btn btn-xs btn-circle btn-ghost">X</button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-semibold text-on-surface-muted uppercase tracking-wider mb-1">Souscription et Contrat</div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Identifiant unique</span>
                  <span className="font-mono font-bold select-text text-accent">{universiteDetails.id}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Plan contractuel</span>
                  <span className="font-bold text-on-surface">{universiteDetails.plan}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Revenus (MRR)</span>
                  <span className="font-bold text-accent">{universiteDetails.mrr.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Date d expiration</span>
                  <span className="font-semibold">{new Date(universiteDetails.dateExpiration).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-on-surface-muted">Statut actuel</span>
                  <span>
                    {universiteDetails.statut === 'actif' && <span className="text-success font-semibold">Actif</span>}
                    {universiteDetails.statut === 'suspendu' && <span className="text-error font-semibold">Suspendu</span>}
                    {universiteDetails.statut === 'essai' && <span className="text-warning font-semibold">Essai</span>}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-[10px] font-semibold text-on-surface-muted uppercase tracking-wider mb-2">Logs d audit recents</div>
                {loadingLogs ? (
                  <div className="flex items-center justify-center p-4"><span className="loading loading-spinner loading-xs text-accent"></span></div>
                ) : logsDetails.length === 0 ? (
                  <div className="text-[10px] text-on-surface-muted italic">Aucune activite enregistree sur ce tenant.</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 sidebar-nav">
                    {logsDetails.map((log) => (
                      <div key={log.id} className="p-2 bg-white/2 rounded border border-white/5 flex flex-col gap-1 text-[9px] hover:bg-white/5 transition-all">
                        <div className="flex items-center justify-between text-accent font-semibold">
                          <span>{log.action}</span>
                          <span className="text-on-surface-muted/50 font-normal">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                        <p className="text-on-surface truncate" title={log.detail}>{log.detail}</p>
                        <div className="text-on-surface-muted text-[8px] flex items-center justify-between">
                          <span>Par: {log.acteurNom}</span>
                          <span className="opacity-50">{log.acteurRole}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <button onClick={() => navigate(`/superadmin/university/${universiteDetails.id}`)} className="w-full btn btn-sm bg-accent hover:bg-accent/80 text-bg border-none font-semibold text-xs rounded uppercase tracking-wider py-2 h-auto">
                Impersonnaliser la session
              </button>
            </div>
          </div>
        </div>
      )}

      {univAActionner && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-lg p-5 max-w-sm w-full flex flex-col gap-4 animate-scale-up">
            <div>
              <h3 className="font-semibold text-sm text-on-surface">{univAActionner.suspendre ? "Suspendre l universite ?" : "Reactiver l universite ?"}</h3>
              <p className="text-[10px] text-on-surface-muted mt-1 leading-normal">
                {univAActionner.suspendre
                  ? `Voulez-vous suspendre l universite "${univAActionner.nom}" ? Cette action desactivera l acces a la plateforme pour tous les utilisateurs.`
                  : `Voulez-vous reactiver l universite "${univAActionner.nom}" ? Cela restaurera instantanement les acces.`}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setUnivAActionner(null)} className="btn btn-sm btn-ghost h-8 min-h-[32px] px-3 font-semibold text-xs border border-white/10 rounded">Annuler</button>
              <button onClick={() => void executerActionUniv()} className={`btn btn-sm h-8 min-h-[32px] px-3 font-semibold text-xs border-none rounded ${univAActionner.suspendre ? 'bg-error hover:bg-error/80 text-white' : 'bg-success hover:bg-success/80 text-white'}`}>
                {univAActionner.suspendre ? 'Suspendre' : 'Reactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminDashboard
