/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  USESTORE.JS                                                 ║
 * ║                                                              ║
 * ║  Store global de l'application avec Zustand.                 ║
 * ║  Zustand est plus simple que Redux pour React Native.        ║
 * ║                                                              ║
 * ║  Contient l'état global :                                    ║
 * ║  - Utilisateur connecté                                      ║
 * ║  - Groupe actif                                              ║
 * ║  - Token JWT                                                 ║
 * ║  - Mode sombre                                               ║
 * ║  - Panier de vente en cours                                  ║
 * ║  - Indicateur de connexion réseau                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { create } from "zustand";

const useStore = create((set, get) => ({

  // ══════════════════════════════════════════════════════════
  //  AUTHENTIFICATION
  // ══════════════════════════════════════════════════════════

  // Utilisateur connecté (null si non connecté)
  utilisateur: null,

  // Token JWT pour les appels API
  token: null,

  // Refresh token pour renouveler le JWT
  refreshToken: null,

  // true si l'utilisateur est connecté
  estConnecte: false,

  /**
   * Sauvegarde la session après connexion réussie.
   *
   * @param {Object} utilisateur - Données de l'utilisateur
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token
   */
  setSession: (utilisateur, token, refreshToken) => set({
    utilisateur,
    token,
    refreshToken,
    estConnecte: true,
  }),

  /**
   * Déconnecte l'utilisateur et réinitialise la session.
   */
  logout: () => set({
    utilisateur:  null,
    token:        null,
    refreshToken: null,
    estConnecte:  false,
    groupeActif:  null,
    panier:       [],
  }),

  /**
   * Met à jour les infos de l'utilisateur connecté.
   * Utilisé après modification du profil.
   *
   * @param {Object} updates - Champs à mettre à jour
   */
  updateUtilisateur: (updates) => set((state) => ({
    utilisateur: { ...state.utilisateur, ...updates },
  })),

  // ══════════════════════════════════════════════════════════
  //  GROUPE ACTIF
  // ══════════════════════════════════════════════════════════

  // Groupe / point de vente actuellement sélectionné
  groupeActif: null,

  /**
   * Sélectionne un groupe comme actif.
   * Vide aussi le panier pour éviter les conflits.
   *
   * @param {Object} groupe - Données du groupe
   */
  setGroupeActif: (groupe) => set({
    groupeActif: groupe,
    panier: [],
  }),

  // ══════════════════════════════════════════════════════════
  //  PANIER DE VENTE
  // ══════════════════════════════════════════════════════════

  /*
   * Le panier est une liste de lignes de vente.
   * Chaque ligne = { produit, quantite, sousTotal }
   * Un tap sur un produit ajoute une quantité.
   * Plusieurs taps sur le même produit incrémentent la quantité.
   */
  panier: [],

  /**
   * Ajoute un produit au panier ou incrémente sa quantité.
   * Si le produit est déjà dans le panier, on ajoute +1.
   * Sinon, on crée une nouvelle ligne.
   *
   * @param {Object} produit - Le produit à ajouter
   */
  ajouterAuPanier: (produit) => set((state) => {
    // Chercher si le produit est déjà dans le panier
    const ligneExistante = state.panier.find(
      (l) => l.produit.id === produit.id
    );

    if (ligneExistante) {
      // Incrémenter la quantité de la ligne existante
      return {
        panier: state.panier.map((l) =>
          l.produit.id === produit.id
            ? {
                ...l,
                quantite:  l.quantite + 1,
                sousTotal: (l.quantite + 1) * l.produit.prixVente,
              }
            : l
        ),
      };
    }

    // Nouvelle ligne dans le panier
    return {
      panier: [
        ...state.panier,
        {
          produit,
          quantite:  1,
          sousTotal: produit.prixVente,
        },
      ],
    };
  }),

  /**
   * Décrémente la quantité d'un produit dans le panier.
   * Si quantité = 1, retire le produit du panier.
   *
   * @param {number} produitId
   */
  retirerDuPanier: (produitId) => set((state) => {
    const ligne = state.panier.find((l) => l.produit.id === produitId);
    if (!ligne) return state;

    if (ligne.quantite === 1) {
      // Retirer complètement
      return { panier: state.panier.filter((l) => l.produit.id !== produitId) };
    }

    // Décrémenter
    return {
      panier: state.panier.map((l) =>
        l.produit.id === produitId
          ? {
              ...l,
              quantite:  l.quantite - 1,
              sousTotal: (l.quantite - 1) * l.produit.prixVente,
            }
          : l
      ),
    };
  }),

  /**
   * Vide complètement le panier.
   * Appelé après une vente confirmée.
   */
  viderPanier: () => set({ panier: [] }),

  /**
   * Calcule le total du panier.
   *
   * @returns {number} Total en FCFA
   */
  getTotalPanier: () => {
    const { panier } = get();
    return panier.reduce((total, ligne) => total + ligne.sousTotal, 0);
  },

  /**
   * Calcule le nombre total d'articles dans le panier.
   *
   * @returns {number} Nombre d'articles
   */
  getNbArticles: () => {
    const { panier } = get();
    return panier.reduce((total, ligne) => total + ligne.quantite, 0);
  },

  // ══════════════════════════════════════════════════════════
  //  THÈME
  // ══════════════════════════════════════════════════════════

  // true = mode sombre, false = mode clair
  darkMode: false,

  /**
   * Bascule entre mode sombre et mode clair.
   */
  toggleDarkMode: () => set((state) => ({
    darkMode: !state.darkMode,
  })),

  /**
   * Définit le mode sombre.
   *
   * @param {boolean} dark
   */
  setDarkMode: (dark) => set({ darkMode: dark }),

  // ══════════════════════════════════════════════════════════
  //  RÉSEAU
  // ══════════════════════════════════════════════════════════

  // true si connecté à internet
  estEnLigne: true,

  /**
   * Met à jour l'état de connexion réseau.
   *
   * @param {boolean} enLigne
   */
  setEstEnLigne: (enLigne) => set({ estEnLigne: enLigne }),

  // ══════════════════════════════════════════════════════════
  //  CHARGEMENT GLOBAL
  // ══════════════════════════════════════════════════════════

  // true pendant les opérations longues (sync, etc.)
  chargementGlobal: false,

  setChargementGlobal: (loading) => set({ chargementGlobal: loading }),

  // ══════════════════════════════════════════════════════════
  //  NOTIFICATIONS LOCALES
  // ══════════════════════════════════════════════════════════

  /*
   * File d'attente des notifications à afficher.
   * Chaque notification = { id, type, message, timestamp }
   */
  notifications: [],

  /**
   * Ajoute une notification à afficher.
   *
   * @param {string} type - "success" | "error" | "warning" | "info"
   * @param {string} message
   */
  ajouterNotification: (type, message) => set((state) => ({
    notifications: [
      ...state.notifications,
      {
        id:        Date.now().toString(),
        type,
        message,
        timestamp: Date.now(),
      },
    ],
  })),

  /**
   * Retire une notification de la file.
   *
   * @param {string} id
   */
  retirerNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
}));

export default useStore;
