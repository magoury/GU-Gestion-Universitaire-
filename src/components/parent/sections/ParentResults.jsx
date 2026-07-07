// src/components/parent/sections/ParentResults.jsx
// ──────────────────────────────────────────────────────────────
// Section Résultats scolaires (Notes & Bulletins).
// ──────────────────────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@fb';
import { useAuth } from '../../../hooks/useAuth.js';
import { useTenant } from '../../../contexts/TenantContext.jsx';
import { useFirebaseData } from '../../../hooks/useFirebaseData.js';
import { ecrireAuditLog } from '../../../services/auditService.js';

function ParentResults({ etudiantLie }) {
  const { user, userProfile } = useAuth();
  const { universityId } = useTenant();

  const [anneeSelectionnee, setAnneeSelectionnee] = useState('2025-2026');

  // Modal Demande de Rendez-vous
  const [modalOuvert, setModalOuvert] = useState(false);
  const [rdvMatiere, setRdvMatiere] = useState('');
  const [rdvMessage, setRdvMessage] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [succesMsg, setSuccesMsg] = useState('');
  const [erreurMsg, setErreurMsg] = useState('');

  // Charger les notes, étudiants et enseignants de l'université
  const { data: allGrades, loading: loadingGrades } = useFirebaseData('grades', universityId);
  const { data: allStudents, loading: loadingStudents } = useFirebaseData('students', universityId);
  const { data: allTeachers } = useFirebaseData('teachers', universityId);

  // Mapping des enseignants (id -> Nom Complet)
  const teachersMap = useMemo(() => {
    if (!allTeachers) return {};
    const map = {};
    Object.values(allTeachers).forEach((t) => {
      map[t.id] = `${t.prenom} ${t.nom}`;
    });
    return map;
  }, [allTeachers]);

  // Notes de l'élève pour l'année sélectionnée
  const myGrades = useMemo(() => {
    if (!allGrades || !etudiantLie) return [];
    return Object.values(allGrades).filter(
      (g) => g.studentId === etudiantLie.id && g.anneeAcademique === anneeSelectionnee
    );
  }, [allGrades, etudiantLie, anneeSelectionnee]);

  // Calcul et regroupement par matière
  const gradesByCourse = useMemo(() => {
    const courses = {};

    myGrades.forEach((g) => {
      const mat = g.courseId || g.matiereId;
      if (!courses[mat]) {
        courses[mat] = {
          id: mat,
          devoir: [],
          examen: [],
          projet: [],
          participation: [],
          ects: 6, // ECTS par défaut
          enseignantId: g.enseignantId,
          enseignantNom: teachersMap[g.enseignantId] || 'Enseignant',
          commentaires: []
        };
      }
      if (courses[mat][g.type]) {
        courses[mat][g.type].push(g.note);
      }
      if (g.commentaire) {
        courses[mat].commentaires.push(g.commentaire);
      }
    });

    return Object.values(courses).map((course) => {
      const devAvg = course.devoir.length > 0 ? course.devoir.reduce((a, b) => a + b, 0) / course.devoir.length : null;
      const exAvg = course.examen.length > 0 ? course.examen.reduce((a, b) => a + b, 0) / course.examen.length : null;
      const projAvg = course.projet.length > 0 ? course.projet.reduce((a, b) => a + b, 0) / course.projet.length : null;
      const partAvg = course.participation.length > 0 ? course.participation.reduce((a, b) => a + b, 0) / course.participation.length : null;

      let notesCum = 0;
      let coeffsCum = 0;

      if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0; }
      if (exAvg !== null) { notesCum += exAvg * 2.0; coeffsCum += 2.0; }
      if (projAvg !== null) { notesCum += projAvg * 1.5; coeffsCum += 1.5; }
      if (partAvg !== null) { notesCum += partAvg * 0.5; coeffsCum += 0.5; }

      const moyenne = coeffsCum > 0 ? notesCum / coeffsCum : 0;
      const valide = moyenne >= 10;

      return {
        ...course,
        devAvg,
        exAvg,
        projAvg,
        partAvg,
        moyenne,
        valide,
        commentaire: course.commentaires.join(' ; ') || 'Bon travail'
      };
    });
  }, [myGrades, teachersMap]);

  // Moyenne Générale Annuelle (MGA)
  const averageSummary = useMemo(() => {
    if (gradesByCourse.length === 0) {
      return { mga: '0.00', mention: 'N/A', admis: false };
    }

    const sum = gradesByCourse.reduce((acc, c) => acc + c.moyenne, 0);
    const mgaRaw = sum / gradesByCourse.length;
    const mga = mgaRaw.toFixed(2);

    let mention = 'Ajourné';
    let admis = false;
    if (mgaRaw >= 10) {
      admis = true;
      if (mgaRaw >= 16) mention = 'Très Bien';
      else if (mgaRaw >= 14) mention = 'Bien';
      else if (mgaRaw >= 12) mention = 'Assez Bien';
      else mention = 'Passable';
    }

    return { mga, mention, admis };
  }, [gradesByCourse]);

  // Calcul du classement dans la promotion (Filière & Niveau)
  const classementPromotion = useMemo(() => {
    if (!allStudents || !allGrades || !etudiantLie) return { rang: 1, total: 1 };

    // 1. Filtrer tous les étudiants de la même filière et niveau
    const promotionClassmates = Object.values(allStudents).filter(
      (s) => s.filiere === etudiantLie.filiere && s.niveau === etudiantLie.niveau
    );

    if (promotionClassmates.length === 0) return { rang: 1, total: 1 };

    // 2. Calculer la MGA de chaque étudiant de la promotion
    const studentsMGAs = promotionClassmates.map((student) => {
      // Notes de l'étudiant
      const sGrades = Object.values(allGrades).filter(
        (g) => g.studentId === student.id && g.anneeAcademique === anneeSelectionnee
      );

      if (sGrades.length === 0) return { studentId: student.id, mga: 0 };

      // Regrouper par matière
      const scourses = {};
      sGrades.forEach((g) => {
        const mat = g.courseId || g.matiereId;
        if (!scourses[mat]) {
          scourses[mat] = { devoir: [], examen: [], projet: [], participation: [] };
        }
        if (scourses[mat][g.type]) {
          scourses[mat][g.type].push(g.note);
        }
      });

      const scoursesList = Object.keys(scourses).map((key) => {
        const c = scourses[key];
        const devAvg = c.devoir.length > 0 ? c.devoir.reduce((a, b) => a + b, 0) / c.devoir.length : null;
        const exAvg = c.examen.length > 0 ? c.examen.reduce((a, b) => a + b, 0) / c.examen.length : null;
        const projAvg = c.projet.length > 0 ? c.projet.reduce((a, b) => a + b, 0) / c.projet.length : null;
        const partAvg = c.participation.length > 0 ? c.participation.reduce((a, b) => a + b, 0) / c.participation.length : null;

        let notesCum = 0;
        let coeffsCum = 0;
        if (devAvg !== null) { notesCum += devAvg * 1.0; coeffsCum += 1.0; }
        if (exAvg !== null) { notesCum += exAvg * 2.0; coeffsCum += 2.0; }
        if (projAvg !== null) { notesCum += projAvg * 1.5; coeffsCum += 1.5; }
        if (partAvg !== null) { notesCum += partAvg * 0.5; coeffsCum += 0.5; }

        const moyenne = coeffsCum > 0 ? notesCum / coeffsCum : 0;
        return moyenne;
      });

      const sum = scoursesList.reduce((acc, val) => acc + val, 0);
      const mga = scoursesList.length > 0 ? sum / scoursesList.length : 0;
      return { studentId: student.id, mga };
    });

    // 3. Trier par MGA descendante
    studentsMGAs.sort((a, b) => b.mga - a.mga);

    // 4. Trouver le rang de notre étudiant
    const index = studentsMGAs.findIndex((x) => x.studentId === etudiantLie.id);
    const rang = index !== -1 ? index + 1 : 1;

    return {
      rang,
      total: promotionClassmates.length
    };
  }, [allStudents, allGrades, etudiantLie, anneeSelectionnee]);

  // Gérer la soumission du RDV
  const handleDemanderRdv = async (e) => {
    e.preventDefault();
    if (!rdvMatiere) {
      setErreurMsg('Veuillez sélectionner une matière.');
      return;
    }
    if (!rdvMessage.trim()) {
      setErreurMsg('Veuillez saisir votre message.');
      return;
    }

    setEnvoiEnCours(true);
    setSuccesMsg('');
    setErreurMsg('');

    try {
      const coursSelectionne = gradesByCourse.find((c) => c.id === rdvMatiere);
      const enseignantId = coursSelectionne?.enseignantId || 'system';
      const enseignantNom = coursSelectionne?.enseignantNom || 'Enseignant';

      const parentName = `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`;
      const studentName = `${etudiantLie.prenom} ${etudiantLie.nom}`;

      const notifRef = push(ref(database, `universities/${universityId}/notifications`));
      await set(notifRef, {
        id: notifRef.key,
        destinataireId: enseignantId,
        titre: `Demande de RDV Parent - ${parentName}`,
        message: `Message du parent de ${studentName} concernant la matière ${rdvMatiere} : "${rdvMessage}"`,
        type: 'rdv_parent',
        matiereId: rdvMatiere,
        studentId: etudiantLie.id,
        parentId: user.uid,
        lue: false,
        timestamp: Date.now()
      });

      // Écrire un log d'audit
      await ecrireAuditLog(universityId, {
        acteurId: user.uid,
        acteurNom: parentName,
        acteurRole: 'parent',
        action: 'RDV_DEMANDE',
        cible: enseignantId,
        detail: `Demande de rendez-vous avec l'enseignant ${enseignantNom} pour la matière ${rdvMatiere}`
      });

      setSuccesMsg(`Votre demande de rendez-vous pour la matière ${rdvMatiere} a bien été envoyée.`);
      setRdvMessage('');
      setTimeout(() => {
        setModalOuvert(false);
        setSuccesMsg('');
      }, 2500);
    } catch (err) {
      console.error(err);
      setErreurMsg("Une erreur s'est produite lors de l'envoi de la demande.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-on-surface font-body">
      
      {/* Sélecteur d'année académique et demande rdv */}
      <div className="flex justify-between items-center bg-surface/60 backdrop-blur-md p-4 rounded-xl border border-white/10 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase text-on-surface-muted">Année Académique :</span>
          <select
            value={anneeSelectionnee}
            onChange={(e) => setAnneeSelectionnee(e.target.value)}
            className="select select-sm select-bordered bg-bg border-white/10 text-on-surface rounded font-medium focus:outline-none"
          >
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (gradesByCourse.length > 0) {
              setRdvMatiere(gradesByCourse[0].id);
            }
            setModalOuvert(true);
          }}
          disabled={gradesByCourse.length === 0}
          className="btn btn-sm btn-accent text-bg hover:opacity-90 font-bold border-none rounded cursor-pointer disabled:opacity-50"
        >
          📅 Demander un rendez-vous enseignant
        </button>
      </div>

      {/* Tableau des notes */}
      <div className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
          <div>
            <h3 className="font-bold font-display text-lg">Bulletin de Notes</h3>
            <p className="text-xs text-on-surface-muted mt-0.5">
              Classe : {etudiantLie.filiere} ({etudiantLie.niveau})
            </p>
          </div>
          <div className="text-[10px] text-accent font-semibold uppercase tracking-wider">
            Lecture seule
          </div>
        </div>

        {loadingGrades || loadingStudents ? (
          <div className="py-20 flex justify-center items-center flex-col gap-2">
            <span className="loading loading-spinner text-accent loading-md"></span>
            <span className="text-xs text-on-surface-muted">Chargement du relevé de notes...</span>
          </div>
        ) : gradesByCourse.length === 0 ? (
          <div className="py-20 text-center text-on-surface-muted text-sm">
            Aucun résultat enregistré pour l'année académique sélectionnée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-on-surface-muted text-xs uppercase font-semibold">
                  <th className="py-3">Matière</th>
                  <th className="py-3">Enseignant</th>
                  <th className="py-3 text-center">ECTS</th>
                  <th className="py-3 text-center">Devoir</th>
                  <th className="py-3 text-center">Examen</th>
                  <th className="py-3 text-center">Projet</th>
                  <th className="py-3 text-center">Part.</th>
                  <th className="py-3 text-center">Moyenne</th>
                  <th className="py-3 pl-4">Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {gradesByCourse.map((c) => {
                  const moy = c.moyenne;
                  const colorMoy = moy >= 12
                    ? 'text-success font-bold'
                    : moy >= 10
                    ? 'text-warning font-bold'
                    : 'text-error font-bold';

                  const badgeBg = moy >= 12
                    ? 'bg-success/15 border-success/20'
                    : moy >= 10
                    ? 'bg-warning/15 border-warning/20'
                    : 'bg-error/15 border-error/20';

                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 text-xs">
                      <td className="py-3.5 font-bold text-on-surface">{c.id}</td>
                      <td className="py-3.5 text-on-surface-muted">{c.enseignantNom}</td>
                      <td className="py-3.5 text-center font-medium">{c.ects} ECTS</td>
                      <td className="py-3.5 text-center text-on-surface-muted">
                        {c.devAvg !== null ? c.devAvg.toFixed(1) : '—'}
                      </td>
                      <td className="py-3.5 text-center text-on-surface-muted">
                        {c.exAvg !== null ? c.exAvg.toFixed(1) : '—'}
                      </td>
                      <td className="py-3.5 text-center text-on-surface-muted">
                        {c.projAvg !== null ? c.projAvg.toFixed(1) : '—'}
                      </td>
                      <td className="py-3.5 text-center text-on-surface-muted">
                        {c.partAvg !== null ? c.partAvg.toFixed(1) : '—'}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded border ${colorMoy} ${badgeBg}`}>
                          {moy.toFixed(2)}/20
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-on-surface-muted italic max-w-xs truncate" title={c.commentaire}>
                        {c.commentaire}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pied du tableau : Synthèse académique */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
              <div className="bg-bg/40 border border-white/5 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] uppercase text-on-surface-muted font-semibold">Moyenne Générale</span>
                <span className="text-base font-bold text-accent mt-1 font-display">{averageSummary.mga}/20</span>
              </div>
              <div className="bg-bg/40 border border-white/5 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] uppercase text-on-surface-muted font-semibold">Mention</span>
                <span className="text-base font-bold text-on-surface mt-1">{averageSummary.mention}</span>
              </div>
              <div className="bg-bg/40 border border-white/5 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] uppercase text-on-surface-muted font-semibold">Classement</span>
                <span className="text-base font-bold text-on-surface mt-1">
                  {classementPromotion.rang}<sup>e</sup> / {classementPromotion.total} élèves
                </span>
              </div>
              <div className="bg-bg/40 border border-white/5 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[10px] uppercase text-on-surface-muted font-semibold">Décision finale</span>
                <span className={`text-base font-bold mt-1 uppercase ${averageSummary.admis ? 'text-success' : 'text-error'}`}>
                  {averageSummary.admis ? 'Admis' : 'Ajourné'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Demande de Rendez-vous */}
      {modalOuvert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold font-display text-on-surface mb-2">
              Demande de rendez-vous enseignant
            </h3>
            <p className="text-xs text-on-surface-muted mb-4">
              Ce message sera transmis directement à l'enseignant de la matière sélectionnée.
            </p>

            <form onSubmit={handleDemanderRdv} className="flex flex-col gap-4">
              {erreurMsg && (
                <div className="p-2.5 bg-error/15 text-error text-xs rounded border border-error/25 font-semibold">
                  ⚠️ {erreurMsg}
                </div>
              )}
              {succesMsg && (
                <div className="p-2.5 bg-success/15 text-success text-xs rounded border border-success/25 font-semibold">
                  ✓ {succesMsg}
                </div>
              )}

              <div>
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Matière / Enseignant</label>
                <select
                  value={rdvMatiere}
                  onChange={(e) => setRdvMatiere(e.target.value)}
                  className="select select-sm select-bordered w-full bg-bg border-white/10 rounded focus:outline-none"
                  required
                >
                  {gradesByCourse.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — Prof: {c.enseignantNom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs font-semibold text-on-surface-muted uppercase p-1">Votre message</label>
                <textarea
                  value={rdvMessage}
                  onChange={(e) => setRdvMessage(e.target.value)}
                  placeholder="Expliquez brièvement l'objet de votre rendez-vous..."
                  rows={4}
                  className="textarea textarea-sm textarea-bordered w-full bg-bg border-white/10 rounded focus:outline-none text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOuvert(false)}
                  className="btn btn-sm bg-surface-high border border-white/10 hover:bg-surface-high/60 text-on-surface rounded cursor-pointer"
                  disabled={envoiEnCours}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-accent text-bg border-none hover:opacity-90 rounded cursor-pointer flex items-center gap-1.5"
                  disabled={envoiEnCours}
                >
                  {envoiEnCours ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <span>Envoyer la demande</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ParentResults;
