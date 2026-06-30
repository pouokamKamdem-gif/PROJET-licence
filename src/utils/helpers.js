/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HELPERS.JS                                                  ║
 * ║                                                              ║
 * ║  Fonctions utilitaires réutilisables dans toute l'app.       ║
 * ║  - Formatage monétaire FCFA                                  ║
 * ║  - Formatage dates                                           ║
 * ║  - Calcul couleur score client                               ║
 * ║  - Calcul jours de retard                                    ║
 * ║  - Hash mot de passe                                         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { COLORS, SCORE } from "./constants";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// ── Formatage monétaire ────────────────────────────────────────
/**
 * Formate un nombre en montant FCFA.
 * Ex: 12500 → "12 500 FCFA"
 * Ex: 1250000 → "1 250 000 FCFA"
 *
 * @param {number} montant - Le montant à formater
 * @param {boolean} avecSigne - Ajouter + si positif
 * @returns {string} Montant formaté
 */
export const formatFCFA = (montant, avecSigne = false) => {
  if (montant === null || montant === undefined) return "0 FCFA";

  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(montant));

  if (avecSigne && montant > 0) return `+${formatted} FCFA`;
  if (montant < 0) return `-${formatted} FCFA`;
  return `${formatted} FCFA`;
};

// ── Formatage dates ────────────────────────────────────────────
/**
 * Formate une date en format court.
 * Ex: "24 Oct 2025"
 *
 * @param {string|Date|number} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
};

/**
 * Formate une date avec heure.
 * Ex: "24 Oct 2025 à 14:30"
 *
 * @param {string|Date|number} date
 * @returns {string}
 */
export const formatDateHeure = (date) => {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return "—";
  }
};

/**
 * Retourne une date relative.
 * Ex: "il y a 3 jours", "dans 2 heures"
 *
 * @param {string|Date|number} date
 * @returns {string}
 */
export const formatDateRelative = (date) => {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), {
      locale: fr,
      addSuffix: true,
    });
  } catch {
    return "—";
  }
};

/**
 * Retourne le début du jour en timestamp.
 * Utile pour filtrer les ventes du jour.
 *
 * @returns {number} timestamp minuit
 */
export const debutJour = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

// ── Score client ───────────────────────────────────────────────
/**
 * Retourne la couleur hex correspondant au score d'un client.
 *
 * Score >= 80 → vert   (STABLE)
 * Score >= 60 → bleu   (BON)
 * Score >= 40 → jaune  (MOYEN)
 * Score >= 20 → orange (RISQUÉ)
 * Score  < 20 → rouge  (URGENT)
 *
 * @param {number} score - Score entre 0 et 100
 * @returns {string} Couleur hex
 */
export const getCouleurScore = (score) => {
  if (score >= SCORE.SEUIL_VERT)   return COLORS.SCORE_VERT;
  if (score >= SCORE.SEUIL_BLEU)   return COLORS.SCORE_BLEU;
  if (score >= SCORE.SEUIL_JAUNE)  return COLORS.SCORE_JAUNE;
  if (score >= SCORE.SEUIL_ORANGE) return COLORS.SCORE_ORANGE;
  return COLORS.SCORE_ROUGE;
};

/**
 * Retourne le statut texte du score.
 *
 * @param {number} score
 * @returns {string} "STABLE" | "BON" | "MOYEN" | "RISQUÉ" | "URGENT"
 */
export const getStatutScore = (score) => {
  if (score >= SCORE.SEUIL_VERT)   return "STABLE";
  if (score >= SCORE.SEUIL_BLEU)   return "BON";
  if (score >= SCORE.SEUIL_JAUNE)  return "MOYEN";
  if (score >= SCORE.SEUIL_ORANGE) return "RISQUÉ";
  return "URGENT";
};

// ── Dettes ─────────────────────────────────────────────────────
/**
 * Vérifie si une dette est en retard.
 *
 * @param {number} dateRemboursement - Timestamp de l'échéance
 * @returns {boolean}
 */
export const estEnRetard = (dateRemboursement) => {
  return isPast(new Date(dateRemboursement));
};

/**
 * Calcule le nombre de jours de retard.
 *
 * @param {number} dateRemboursement
 * @returns {number} Nombre de jours (0 si pas en retard)
 */
export const getJoursRetard = (dateRemboursement) => {
  if (!estEnRetard(dateRemboursement)) return 0;
  return differenceInDays(new Date(), new Date(dateRemboursement));
};

/**
 * Calcule le décrement de score dû au retard.
 * -2 points par jour de retard.
 *
 * @param {number} dateRemboursement
 * @returns {number} Points à décrémenter
 */
export const getDecrementScore = (dateRemboursement) => {
  return getJoursRetard(dateRemboursement) * SCORE.DECREMENT_PAR_JOUR;
};

// ── Bail (heure de déconnexion) ────────────────────────────────
/**
 * Vérifie si le bail d'un membre est expiré.
 *
 * @param {string} bailHeure - Format "HH:mm" ex: "18:00"
 * @returns {boolean}
 */
export const bailEstExpire = (bailHeure) => {
  if (!bailHeure || !bailHeure.includes(":")) return false;
  try {
    const [heures, minutes] = bailHeure.split(":").map(Number);
    const now  = new Date();
    const bail = new Date();
    bail.setHours(heures, minutes, 0, 0);
    return now > bail;
  } catch {
    return false;
  }
};

/**
 * Calcule les minutes restantes avant expiration du bail.
 *
 * @param {string} bailHeure - Format "HH:mm"
 * @returns {number} Minutes restantes (négatif si expiré)
 */
export const minutesAvantBail = (bailHeure) => {
  if (!bailHeure || !bailHeure.includes(":")) return 0;
  try {
    const [heures, minutes] = bailHeure.split(":").map(Number);
    const now  = new Date();
    const bail = new Date();
    bail.setHours(heures, minutes, 0, 0);
    return Math.floor((bail - now) / 60000);
  } catch {
    return 0;
  }
};

// ── Validation ─────────────────────────────────────────────────
/**
 * Valide un numéro de téléphone camerounais.
 * Formats acceptés : 6XXXXXXXX, +2376XXXXXXXX, 2376XXXXXXXX
 *
 * @param {string} telephone
 * @returns {boolean}
 */
export const validerTelephone = (telephone) => {
  const regex = /^(\+?237)?6[0-9]{8}$/;
  return regex.test(telephone.replace(/\s/g, ""));
};

/**
 * Valide une adresse email.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const validerEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Formate un numéro de téléphone pour l'affichage.
 * Ex: "699123456" → "+237 6 99 12 34 56"
 *
 * @param {string} telephone
 * @returns {string}
 */
export const formatTelephone = (telephone) => {
  if (!telephone) return "—";
  const clean = telephone.replace(/\D/g, "");
  if (clean.length === 9) {
    return `+237 ${clean[0]} ${clean.slice(1, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`;
  }
  return telephone;
};

// ── Texte ──────────────────────────────────────────────────────
/**
 * Tronque un texte à une longueur max.
 * Ex: "Café Arabica Premium" (max 10) → "Café Arab..."
 *
 * @param {string} texte
 * @param {number} maxLength
 * @returns {string}
 */
export const tronquer = (texte, maxLength = 20) => {
  if (!texte) return "";
  if (texte.length <= maxLength) return texte;
  return texte.substring(0, maxLength) + "...";
};

/**
 * Capitalise la première lettre d'une chaîne.
 * Ex: "vendeur" → "Vendeur"
 *
 * @param {string} str
 * @returns {string}
 */
export const capitaliser = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formate un rôle pour l'affichage.
 * Ex: "proprietaire" → "Propriétaire"
 *
 * @param {string} role
 * @returns {string}
 */
export const formatRole = (role) => {
  const roles = {
    proprietaire:  "Propriétaire",
    administrateur:"Administrateur",
    vendeur:       "Vendeur",
    magasinier:    "Magasinier",
    caissier:      "Caissier",
  };
  return roles[role] || capitaliser(role);
};

// ── Génération ─────────────────────────────────────────────────
/**
 * Génère un token aléatoire pour les liens d'invitation.
 * Format : 8 caractères alphanumériques en majuscules.
 * Ex: "A3F9K2MX"
 *
 * @returns {string}
 */
export const genererToken = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Génère un UUID simple pour les identifiants locaux.
 *
 * @returns {string}
 */
export const genererUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};