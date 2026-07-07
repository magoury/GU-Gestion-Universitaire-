// src/scripts/createSuperAdmin.js
// ──────────────────────────────────────────────────────────────
// Pour exécuter ce script UNE SEULE FOIS :
// node src/scripts/createSuperAdmin.js
// NE PAS intégrer dans le build de production
// ──────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBzEo4v-LT6-mjIZ8edIk5ve-p-nsVhdtE",
  authDomain: "projet-saas-universte.firebaseapp.com",
  databaseURL: "https://projet-saas-universte-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "projet-saas-universte",
  storageBucket: "projet-saas-universte.firebasestorage.app",
  messagingSenderId: "96464533551",
  appId: "1:96464533551:web:e64993ddd9f6aafdc12eda"
};

const SUPER_ADMIN_EMAIL = "danielmagoury763@gmail.com";
const SUPER_ADMIN_PIN = "1234567890"; // 10 chiffres exactement
const SUPER_ADMIN_NOM = "Magoury";
const SUPER_ADMIN_PRENOM = "Daniel";

async function createSuperAdmin() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  try {
    console.log("Création du compte Super Admin...");
    
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      SUPER_ADMIN_EMAIL, 
      SUPER_ADMIN_PIN
    );
    
    const uid = userCredential.user.uid;
    console.log("Compte Auth créé, UID :", uid);
    
    await set(ref(database, `users/${uid}`), {
      uid,
      nom: SUPER_ADMIN_NOM,
      prenom: SUPER_ADMIN_PRENOM,
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin_plateforme',
      universityId: null,
      createdAt: Date.now()
    });
    
    console.log("✅ Super Admin créé avec succès !");
    console.log("Email :", SUPER_ADMIN_EMAIL);
    console.log("PIN :", SUPER_ADMIN_PIN);
    console.log("UID :", uid);
    console.log("Accès : cliquer sur le logo GU en bas de la page de connexion");
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("⚠️ Ce compte existe déjà dans Firebase Auth.");
      console.log("Si le profil Realtime DB est manquant, créez-le manuellement.");
      process.exit(0);
    } else {
      console.error("❌ Erreur :", error.message);
      process.exit(1);
    }
  }
}

createSuperAdmin();
