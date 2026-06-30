/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AUTHSERVICE.JS                                              ║
 * ║                                                              ║
 * ║  Service d'authentification complet.                         ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Inscription (register)                                    ║
 * ║  - Connexion (login) avec JWT                                ║
 * ║  - Connexion biométrique (empreinte / Face ID)               ║
 * ║  - Déconnexion (logout)                                      ║
 * ║  - Récupération session depuis SecureStore                   ║
 * ║  - Récupération mot de passe                                 ║
 * ║  - Stockage sécurisé du JWT (expo-secure-store)              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { post } from "./api";
import { ENDPOINTS, STORAGE_KEYS } from "../utils/constants";
import { execute, queryOne } from "./database";

// ══════════════════════════════════════════════════════════════
//  INSCRIPTION
// ══════════════════════════════════════════════════════════════

/**
 * Inscrit un nouvel utilisateur.
 *
 * Processus :
 * 1. Vérifier que le téléphone n'est pas déjà utilisé (local)
 * 2. Envoyer les données au backend Spring Boot
 * 3. Sauvegarder le JWT reçu dans SecureStore
 * 4. Sauvegarder l'utilisateur en SQLite local
 * 5. Retourner les données de session
 *
 * @param {Object} donnees - { nom, telephone, email, motDePasse, role }
 * @returns {Promise<Object>} - { utilisateur, token, refreshToken }
 */
export const inscrire = async (donnees) => {
  try {
    // ─ Validation basique avant d'appeler l'API ────────────────
    if (!donnees.nom?.trim()) {
      throw new Error("Le nom est obligatoire");
    }
    if (!donnees.telephone?.trim()) {
      throw new Error("Le numéro de téléphone est obligatoire");
    }
    if (!donnees.motDePasse || donnees.motDePasse.length < 6) {
      throw new Error("Le mot de passe doit faire au moins 6 caractères");
    }

    // ─ Vérifier si le téléphone existe déjà localement ────────
    const existant = await queryOne(
      "SELECT id FROM utilisateurs WHERE telephone = ? LIMIT 1",
      [donnees.telephone]
    );
    if (existant) {
      throw new Error("Ce numéro de téléphone est déjà utilisé");
    }

    // ─ Appel API backend ───────────────────────────────────────
    let sessionData;
    try {
      sessionData = await post(ENDPOINTS.REGISTER, {
        nom:        donnees.nom.trim(),
        telephone:  donnees.telephone.trim(),
        email:      donnees.email?.trim() || null,
        motDePasse: donnees.motDePasse,
        role:       donnees.role || "vendeur",
      });
    } catch (apiError) {
      // Si pas de réseau → créer localement
      if (apiError.offline) {
        return await inscrireLocalement(donnees);
      }
      throw apiError;
    }

    // ─ Sauvegarder les tokens dans SecureStore ─────────────────
    await SecureStore.setItemAsync(
      STORAGE_KEYS.TOKEN,
      sessionData.token
    );
    await SecureStore.setItemAsync(
      STORAGE_KEYS.REFRESH_TOKEN,
      sessionData.refreshToken
    );

    // ─ Sauvegarder l'utilisateur en SQLite local ───────────────
    await sauvegarderUtilisateurLocal(sessionData.utilisateur);

    return sessionData;

  } catch (error) {
    throw error;
  }
};

/**
 * Inscription en mode offline (pas de réseau).
 * Données sauvegardées localement et synchronisées plus tard.
 *
 * @param {Object} donnees
 * @returns {Promise<Object>}
 */
const inscrireLocalement = async (donnees) => {
  const result = await execute(
    `INSERT INTO utilisateurs
      (nom, telephone, email, motDePasse, role, syncEnAttente)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      donnees.nom.trim(),
      donnees.telephone.trim(),
      donnees.email?.trim() || null,
      donnees.motDePasse, // Hashé côté serveur normalement
      donnees.role || "vendeur",
    ]
  );

  const utilisateur = {
    id:        result.lastInsertRowId,
    nom:       donnees.nom,
    telephone: donnees.telephone,
    email:     donnees.email || null,
    role:      donnees.role || "vendeur",
  };

  // Token local temporaire (sera remplacé lors de la sync)
  const tokenLocal = `LOCAL_${Date.now()}`;
  await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, tokenLocal);

  return {
    utilisateur,
    token:        tokenLocal,
    refreshToken: null,
    offline:      true,
  };
};

// ══════════════════════════════════════════════════════════════
//  CONNEXION
// ══════════════════════════════════════════════════════════════

/**
 * Connecte un utilisateur avec téléphone + mot de passe.
 *
 * Processus :
 * 1. Tenter la connexion via l'API backend
 * 2. Si offline → connexion locale depuis SQLite
 * 3. Sauvegarder JWT dans SecureStore
 * 4. Retourner les données de session
 *
 * @param {string} telephone
 * @param {string} motDePasse
 * @returns {Promise<Object>} - { utilisateur, token, refreshToken }
 */
export const connecter = async (telephone, motDePasse) => {
  try {
    // ─ Validation ──────────────────────────────────────────────
    if (!telephone?.trim() || !motDePasse) {
      throw new Error("Téléphone et mot de passe obligatoires");
    }

    // ─ Tentative de connexion en ligne ─────────────────────────
    let sessionData;
    try {
      sessionData = await post(ENDPOINTS.LOGIN, {
        telephone: telephone.trim(),
        motDePasse,
      });

      // Sauvegarder les nouveaux tokens
      await SecureStore.setItemAsync(
        STORAGE_KEYS.TOKEN,
        sessionData.token
      );
      await SecureStore.setItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN,
        sessionData.refreshToken
      );

      // Mettre à jour l'utilisateur local
      await sauvegarderUtilisateurLocal(sessionData.utilisateur);

    } catch (apiError) {
      if (apiError.offline) {
        // ─ Connexion offline depuis SQLite ─────────────────────
        sessionData = await connecterLocalement(telephone, motDePasse);
      } else {
        throw apiError;
      }
    }

    return sessionData;

  } catch (error) {
    throw error;
  }
};

/**
 * Connexion locale depuis la base de données SQLite.
 * Utilisée quand il n'y a pas de réseau.
 *
 * @param {string} telephone
 * @param {string} motDePasse
 * @returns {Promise<Object>}
 */
const connecterLocalement = async (telephone, motDePasse) => {
  // Chercher l'utilisateur dans la base locale
  // Note : en production, le mot de passe est hashé
  const utilisateur = await queryOne(
    `SELECT * FROM utilisateurs
     WHERE telephone = ? AND estActif = 1 LIMIT 1`,
    [telephone.trim()]
  );

  if (!utilisateur) {
    throw new Error("Numéro de téléphone introuvable");
  }

  // Vérification du mot de passe (simplifié pour offline)
  // En production : comparer avec le hash stocké
  if (utilisateur.motDePasse !== motDePasse) {
    throw new Error("Mot de passe incorrect");
  }

  // Récupérer le token existant
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

  return {
    utilisateur,
    token:   token || `LOCAL_${Date.now()}`,
    offline: true,
  };
};

// ══════════════════════════════════════════════════════════════
//  CONNEXION BIOMÉTRIQUE
// ══════════════════════════════════════════════════════════════

/**
 * Vérifie si la biométrie est disponible sur l'appareil.
 *
 * @returns {Promise<boolean>}
 */
export const biometrieDisponible = async () => {
  try {
    // Vérifier si le matériel biométrique est présent
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) return false;

    // Vérifier si des empreintes sont enregistrées
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;

  } catch {
    return false;
  }
};

/**
 * Lance l'authentification biométrique.
 *
 * @returns {Promise<boolean>} - true si succès
 */
export const authentifierBiometrie = async () => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:    "Connexion Hardoize",
      subtitle:         "Utilisez votre empreinte ou Face ID",
      cancelLabel:      "Annuler",
      fallbackLabel:    "Utiliser le mot de passe",
      // Autoriser le code PIN comme alternative
      disableDeviceFallback: false,
    });

    return result.success;

  } catch (error) {
    console.error("Erreur biométrie :", error);
    return false;
  }
};

/**
 * Récupère la session sauvegardée pour la biométrie.
 * L'utilisateur s'authentifie avec son empreinte puis
 * on charge la session depuis SecureStore.
 *
 * @returns {Promise<Object|null>} - Données de session ou null
 */
export const connecterAvecBiometrie = async () => {
  try {
    // 1. Vérifier que la biométrie est activée dans l'app
    const biometrieActivee = await SecureStore.getItemAsync(
      STORAGE_KEYS.BIOMETRIE
    );
    if (biometrieActivee !== "true") {
      throw new Error("Biométrie non activée");
    }

    // 2. Lancer l'authentification biométrique
    const succes = await authentifierBiometrie();
    if (!succes) {
      throw new Error("Authentification biométrique échouée");
    }

    // 3. Charger la session depuis SecureStore
    const session = await recupererSession();
    if (!session) {
      throw new Error("Aucune session sauvegardée");
    }

    return session;

  } catch (error) {
    throw error;
  }
};

// ══════════════════════════════════════════════════════════════
//  SESSION
// ══════════════════════════════════════════════════════════════

/**
 * Récupère la session sauvegardée (utilisateur + token).
 * Appelé au démarrage de l'application pour vérifier
 * si l'utilisateur est déjà connecté.
 *
 * @returns {Promise<Object|null>}
 */
export const recupererSession = async () => {
  try {
    // Récupérer le token
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    if (!token) return null;

    // Récupérer les données utilisateur
    const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
    if (!userJson) return null;

    const utilisateur = JSON.parse(userJson);

    return { utilisateur, token };

  } catch {
    return null;
  }
};

/**
 * Déconnecte l'utilisateur.
 * Supprime le JWT et les données de session.
 *
 * @returns {Promise<void>}
 */
export const deconnecter = async () => {
  try {
    // Notifier le backend (optionnel)
    try {
      await post("/auth/logout");
    } catch {
      // Ignorer si pas de réseau
    }

    // Supprimer les tokens locaux
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);

  } catch (error) {
    console.error("Erreur déconnexion :", error);
  }
};

/**
 * Vérifie si l'utilisateur est connecté.
 *
 * @returns {Promise<boolean>}
 */
export const estConnecte = async () => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
  return !!token;
};

// ══════════════════════════════════════════════════════════════
//  RÉCUPÉRATION MOT DE PASSE
// ══════════════════════════════════════════════════════════════

/**
 * Envoie un code OTP pour récupérer le mot de passe.
 *
 * @param {string} contact - Téléphone ou email
 * @returns {Promise<void>}
 */
export const demanderResetMdp = async (contact) => {
  await post("/auth/reset-password/demande", { contact });
};

/**
 * Vérifie le code OTP et définit un nouveau mot de passe.
 *
 * @param {string} contact
 * @param {string} code    - Code OTP reçu par SMS/email
 * @param {string} nouveauMdp
 * @returns {Promise<void>}
 */
export const reinitialiserMdp = async (contact, code, nouveauMdp) => {
  await post("/auth/reset-password/confirmer", {
    contact,
    code,
    nouveauMotDePasse: nouveauMdp,
  });
};

// ══════════════════════════════════════════════════════════════
//  UTILITAIRES INTERNES
// ══════════════════════════════════════════════════════════════

/**
 * Sauvegarde les données utilisateur localement.
 * - SecureStore : pour la session rapide
 * - SQLite : pour le mode offline
 *
 * @param {Object} utilisateur
 */
const sauvegarderUtilisateurLocal = async (utilisateur) => {
  // Sauvegarder dans SecureStore pour accès rapide
  await SecureStore.setItemAsync(
    STORAGE_KEYS.USER,
    JSON.stringify(utilisateur)
  );

  // Upsert dans SQLite pour mode offline
  await execute(
    `INSERT OR REPLACE INTO utilisateurs
      (id, serverId, nom, telephone, email, role,
       photoUri, evaluation, syncEnAttente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      utilisateur.localId || utilisateur.id,
      utilisateur.id?.toString(),
      utilisateur.nom,
      utilisateur.telephone,
      utilisateur.email || null,
      utilisateur.role || "vendeur",
      utilisateur.photoUri || null,
      utilisateur.evaluation || 5.0,
    ]
  );
};