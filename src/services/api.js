/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  API.JS                                                      ║
 * ║                                                              ║
 * ║  Client HTTP centralisé pour communiquer avec le backend     ║
 * ║  Spring Boot.                                                ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Instance Axios configurée avec l'URL de base              ║
 * ║  - Intercepteur de requête : ajout automatique du JWT        ║
 * ║  - Intercepteur de réponse : gestion erreurs + refresh token ║
 * ║  - Retry automatique si token expiré                         ║
 * ║  - Gestion du mode offline (stockage local si pas réseau)    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, STORAGE_KEYS, ENDPOINTS } from "../utils/constants";

// ── Création de l'instance Axios ───────────────────────────────
/*
 * Une seule instance partagée dans toute l'application.
 * Timeout de 15 secondes pour les requêtes.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept:         "application/json",
  },
});

// ── Intercepteur de REQUÊTE ────────────────────────────────────
/*
 * Avant chaque requête, on récupère le JWT depuis le SecureStore
 * et on l'ajoute dans le header Authorization.
 * Format : "Bearer eyJhbGciOiJIUzI1NiJ9..."
 */
api.interceptors.request.use(
  async (config) => {
    try {
      // Récupérer le token JWT stocké localement
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

      if (token) {
        // Ajouter le token dans chaque requête
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Si erreur lecture token → continuer sans token
      console.warn("⚠ Erreur lecture token:", error.message);
    }
    return config;
  },
  (error) => {
    // Erreur de configuration de la requête
    return Promise.reject(error);
  }
);

// ── Intercepteur de RÉPONSE ────────────────────────────────────
/*
 * Après chaque réponse :
 * - 200-299 : succès → retourner les données
 * - 401     : token expiré → tenter un refresh
 * - 403     : accès refusé → déconnecter
 * - 500     : erreur serveur → message générique
 */
api.interceptors.response.use(
  (response) => {
    // Succès : retourner directement les données
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ─ Erreur 401 : Token expiré ───────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Récupérer le refresh token
        const refreshToken = await SecureStore.getItemAsync(
          STORAGE_KEYS.REFRESH_TOKEN
        );

        if (refreshToken) {
          // Demander un nouveau JWT au backend
          const response = await axios.post(
            `${API_BASE_URL}${ENDPOINTS.REFRESH_TOKEN}`,
            { refreshToken }
          );

          const nouveauToken = response.data.token;

          // Sauvegarder le nouveau token
          await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, nouveauToken);

          // Relancer la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${nouveauToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh échoué → déconnecter l'utilisateur
        await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        console.error("❌ Refresh token expiré, déconnexion");
      }
    }

    // ─ Erreur 403 : Accès refusé ───────────────────────────────
    if (error.response?.status === 403) {
      console.error("❌ Accès refusé :", error.response.data?.message);
    }

    // ─ Erreur réseau : pas de connexion ───────────────────────
    if (!error.response) {
      console.warn("⚠ Pas de connexion réseau");
      return Promise.reject({
        message: "Pas de connexion internet. Données sauvegardées localement.",
        offline: true,
      });
    }

    // ─ Autres erreurs ──────────────────────────────────────────
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Une erreur est survenue";

    return Promise.reject({ message, status: error.response?.status });
  }
);

// ══════════════════════════════════════════════════════════════
//  MÉTHODES HTTP GÉNÉRIQUES
// ══════════════════════════════════════════════════════════════

/**
 * Requête GET.
 *
 * @param {string} endpoint - Ex: "/produits"
 * @param {Object} params   - Paramètres query string
 * @returns {Promise<any>}  - Données de la réponse
 */
export const get = async (endpoint, params = {}) => {
  const response = await api.get(endpoint, { params });
  return response.data;
};

/**
 * Requête POST.
 *
 * @param {string} endpoint - Ex: "/ventes"
 * @param {Object} data     - Corps de la requête
 * @returns {Promise<any>}
 */
export const post = async (endpoint, data = {}) => {
  const response = await api.post(endpoint, data);
  return response.data;
};

/**
 * Requête PUT (mise à jour complète).
 *
 * @param {string} endpoint
 * @param {Object} data
 * @returns {Promise<any>}
 */
export const put = async (endpoint, data = {}) => {
  const response = await api.put(endpoint, data);
  return response.data;
};

/**
 * Requête PATCH (mise à jour partielle).
 *
 * @param {string} endpoint
 * @param {Object} data
 * @returns {Promise<any>}
 */
export const patch = async (endpoint, data = {}) => {
  const response = await api.patch(endpoint, data);
  return response.data;
};

/**
 * Requête DELETE.
 *
 * @param {string} endpoint
 * @returns {Promise<any>}
 */
export const del = async (endpoint) => {
  const response = await api.delete(endpoint);
  return response.data;
};

// ══════════════════════════════════════════════════════════════
//  SERVICES API PAR MODULE
// ══════════════════════════════════════════════════════════════

// ── Produits ───────────────────────────────────────────────────
export const ProduitAPI = {

  /**
   * Récupère tous les produits d'un groupe depuis le serveur.
   *
   * @param {number} groupeId
   * @returns {Promise<Array>}
   */
  getByGroupe: (groupeId) =>
    get(`/produits`, { groupeId }),

  /**
   * Crée un nouveau produit sur le serveur.
   *
   * @param {Object} produit
   * @returns {Promise<Object>}
   */
  creer: (produit) => post("/produits", produit),

  /**
   * Met à jour un produit.
   *
   * @param {number} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  mettreAJour: (id, updates) => put(`/produits/${id}`, updates),

  /**
   * Désactive un produit (soft delete).
   *
   * @param {number} id
   * @returns {Promise<Object>}
   */
  desactiver: (id) => patch(`/produits/${id}/desactiver`),
};

// ── Ventes ─────────────────────────────────────────────────────
export const VenteAPI = {

  /**
   * Enregistre une vente sur le serveur.
   *
   * @param {Object} vente
   * @returns {Promise<Object>}
   */
  creer: (vente) => post("/ventes", vente),

  /**
   * Récupère les ventes d'un groupe avec pagination.
   *
   * @param {number} groupeId
   * @param {number} page
   * @returns {Promise<Object>}
   */
  getByGroupe: (groupeId, page = 0) =>
    get(`/ventes/groupe/${groupeId}`, { page, size: 20 }),

  /**
   * Récupère les statistiques de ventes pour le dashboard.
   *
   * @param {number} groupeId
   * @param {string} periode - "jour" | "semaine" | "mois" | "annee"
   * @returns {Promise<Object>}
   */
  getStats: (groupeId, periode = "semaine") =>
    get(`/ventes/stats`, { groupeId, periode }),
};

// ── Clients ────────────────────────────────────────────────────
export const ClientAPI = {

  getByGroupe:  (groupeId) => get(`/clients`, { groupeId }),
  creer:        (client)   => post("/clients", client),
  mettreAJour:  (id, data) => put(`/clients/${id}`, data),
  updateScore:  (id, score)=> patch(`/clients/${id}/score`, { score }),
  desactiver:   (id)       => patch(`/clients/${id}/desactiver`),
};

// ── Dettes ─────────────────────────────────────────────────────
export const DetteAPI = {

  getByGroupe:          (groupeId) => get(`/dettes`, { groupeId }),
  creer:                (dette)    => post("/dettes", dette),
  rembourser:           (id, montant) =>
    patch(`/dettes/${id}/rembourser`, { montant }),
  solder:               (id)       => patch(`/dettes/${id}/solder`),
};

// ── Fournisseurs ───────────────────────────────────────────────
export const FournisseurAPI = {

  getByGroupe:  (groupeId) => get(`/fournisseurs`, { groupeId }),
  creer:        (f)        => post("/fournisseurs", f),
  mettreAJour:  (id, data) => put(`/fournisseurs/${id}`, data),
  desactiver:   (id)       => patch(`/fournisseurs/${id}/desactiver`),
};

// ── Dettes Fournisseurs ────────────────────────────────────────
export const DetteFournisseurAPI = {

  getByGroupe:  (groupeId) => get(`/dettes-fournisseurs`, { groupeId }),
  creer:        (dette)    => post("/dettes-fournisseurs", dette),
  rembourser:   (id, montant) =>
    patch(`/dettes-fournisseurs/${id}/rembourser`, { montant }),
  solder:       (id)       => patch(`/dettes-fournisseurs/${id}/solder`),
};

// ── Mouvements Stock ───────────────────────────────────────────
export const MouvementAPI = {

  getByGroupe:  (groupeId) => get(`/mouvements-stock`, { groupeId }),
  creer:        (mvt)      => post("/mouvements-stock", mvt),
};

// ── Groupes ────────────────────────────────────────────────────
export const GroupeAPI = {

  getByProprietaire: (userId) =>
    get(`/groupes`, { proprietaireId: userId }),

  creer: (groupe) => post("/groupes", groupe),

  getMembres: (groupeId) =>
    get(`/groupes/${groupeId}/membres`),

  getDemandes: (groupeId) =>
    get(`/groupes/${groupeId}/demandes`),

  accepterDemande: (groupeId, demandeId, role, bailHeure) =>
    post(`/groupes/${groupeId}/demandes/${demandeId}/accepter`, {
      role,
      bailHeure,
    }),

  rejeterDemande: (groupeId, demandeId) =>
    post(`/groupes/${groupeId}/demandes/${demandeId}/rejeter`),

  rejoindre: (codeQR, nom, telephone) =>
    post("/groupes/rejoindre", { codeQR, nom, telephone }),

  mettreAJourMembre: (groupeId, membreId, updates) =>
    patch(`/groupes/${groupeId}/membres/${membreId}`, updates),

  genererLien: (groupeId) =>
    post(`/groupes/${groupeId}/lien-invitation`),
};

// ── Utilisateurs ───────────────────────────────────────────────
export const UtilisateurAPI = {

  getProfil:    ()       => get("/utilisateurs/profil"),
  mettreAJour:  (data)   => put("/utilisateurs/profil", data),
  getStats:     (userId) => get(`/utilisateurs/${userId}/stats`),
};

export default api;
