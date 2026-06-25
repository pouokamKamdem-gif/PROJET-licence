/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CONSTANTS.JS                                                ║
 * ║                                                              ║
 * ║  Toutes les constantes globales de l'application Hardoize.  ║
 * ║  - URLs de l'API backend Spring Boot                         ║
 * ║  - Rôles utilisateurs                                        ║
 * ║  - Types de paiement                                         ║
 * ║  - Seuils du score de sérieux client                         ║
 * ║  - Clés de stockage local                                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── URL de base du backend Spring Boot ────────────────────────
// Remplace par l'IP de ta machine en développement local
// Ex: "http://192.168.1.XX:8080/api" (ton IP locale)
export const API_BASE_URL = "http://192.168.1.1:8080/api";

// ── Endpoints de l'API ─────────────────────────────────────────
export const ENDPOINTS = {
  // Auth
  LOGIN:           "/auth/login",
  REGISTER:        "/auth/register",
  REFRESH_TOKEN:   "/auth/refresh",
  RESET_PASSWORD:  "/auth/reset-password",

  // Utilisateurs
  PROFIL:          "/utilisateurs/profil",
  UPDATE_PROFIL:   "/utilisateurs/update",

  // Produits
  PRODUITS:        "/produits",
  PRODUIT_BY_ID:   "/produits/:id",

  // Ventes
  VENTES:          "/ventes",
  VENTES_BY_GROUPE:"/ventes/groupe/:id",
  STATS_VENTES:    "/ventes/stats",

  // Clients
  CLIENTS:         "/clients",
  CLIENT_BY_ID:    "/clients/:id",

  // Dettes
  DETTES:          "/dettes",
  DETTES_BY_CLIENT:"/dettes/client/:id",
  REMBOURSER:      "/dettes/:id/rembourser",

  // Fournisseurs
  FOURNISSEURS:    "/fournisseurs",
  DETTES_FOURN:    "/dettes-fournisseurs",

  // Stock
  MOUVEMENTS:      "/mouvements-stock",

  // Groupes
  GROUPES:         "/groupes",
  GROUPE_BY_ID:    "/groupes/:id",
  REJOINDRE:       "/groupes/rejoindre",
  MEMBRES:         "/groupes/:id/membres",
  DEMANDES:        "/groupes/:id/demandes",
};

// ── Rôles utilisateurs ─────────────────────────────────────────
export const ROLES = {
  PROPRIETAIRE:  "proprietaire",
  ADMIN:         "administrateur",
  VENDEUR:       "vendeur",
  MAGASINIER:    "magasinier",
  CAISSIER:      "caissier",
};

// ── Types de paiement ──────────────────────────────────────────
export const PAIEMENT = {
  ESPECES: "especes",
  CREDIT:  "credit",
};

// ── Statuts de dette ───────────────────────────────────────────
export const STATUT_DETTE = {
  EN_ATTENTE: "en_attente",
  SOLDEE:     "soldee",
  EN_RETARD:  "en_retard",
};

// ── Score de sérieux client ────────────────────────────────────
/*
 * Le score commence à 100 et diminue de 2 pts par jour de retard.
 * Il peut remonter selon les remboursements effectués.
 * Chaque tranche correspond à une couleur et un statut.
 */
export const SCORE = {
  SEUIL_VERT:   80,   // >= 80 → vert   → STABLE
  SEUIL_BLEU:   60,   // >= 60 → bleu   → BON
  SEUIL_JAUNE:  40,   // >= 40 → jaune  → MOYEN
  SEUIL_ORANGE: 20,   // >= 20 → orange → RISQUÉ
                      //  < 20 → rouge  → URGENT
  DECREMENT_PAR_JOUR: 2,
};

// ── Couleurs de l'application ──────────────────────────────────
export const COLORS = {
  // Palette principale
  ORANGE:           "#F97316",
  ORANGE_DARK:      "#C2580E",
  ORANGE_LIGHT:     "#FDBA74",

  // Backgrounds
  BG_DARK:          "#1C0F00",
  BG_CARD_DARK:     "#2D1A00",
  SURFACE_DARK:     "#3D2400",
  BG_LIGHT:         "#FAF7F4",
  BG_CARD_LIGHT:    "#F0EBE3",
  SURFACE_LIGHT:    "#FFFFFF",

  // Textes
  TEXT_PRIMARY_DARK:    "#FFFFFF",
  TEXT_SECONDARY_DARK:  "#D4A574",
  TEXT_PRIMARY_LIGHT:   "#1C0F00",
  TEXT_SECONDARY_LIGHT: "#7C5C3A",

  // Score / statuts
  SCORE_VERT:        "#22C55E",
  SCORE_BLEU:        "#3B82F6",
  SCORE_JAUNE:       "#EAB308",
  SCORE_ORANGE:      "#F97316",
  SCORE_ROUGE:       "#EF4444",

  // États
  SUCCESS:  "#22C55E",
  ERROR:    "#EF4444",
  WARNING:  "#F59E0B",
  INFO:     "#3B82F6",

  // Divers
  WHITE:    "#FFFFFF",
  BLACK:    "#000000",
  GRAY:     "#6B7280",
  GRAY_LIGHT: "#E5E7EB",
};

// ── Types de mouvement stock ───────────────────────────────────
export const MOUVEMENT = {
  ENTREE: "entree",
  SORTIE: "sortie",
};

export const MOTIF_MOUVEMENT = {
  VENTE:      "vente",
  ACHAT:      "achat",
  RETOUR:     "retour",
  PERTE:      "perte",
  INVENTAIRE: "inventaire",
};

// ── Clés de stockage local (SecureStore + SQLite) ──────────────
export const STORAGE_KEYS = {
  TOKEN:        "hardoize_token",
  REFRESH_TOKEN:"hardoize_refresh_token",
  USER:         "hardoize_user",
  DARK_MODE:    "hardoize_dark_mode",
  BIOMETRIE:    "hardoize_biometrie",
  GROUPE_ACTIF: "hardoize_groupe_actif",
};

// ── Durée d'expiration du lien WhatsApp (5 minutes) ───────────
export const LIEN_EXPIRATION_MS = 5 * 60 * 1000;

// ── Pagination ─────────────────────────────────────────────────
export const PAGE_SIZE = 20;