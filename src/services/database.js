/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DATABASE.JS                                                 ║
 * ║                                                              ║
 * ║  Service de base de données locale SQLite avec Expo SQLite.  ║
 * ║                                                              ║
 * ║  Stratégie offline-first :                                   ║
 * ║  1. Toutes les opérations écrivent d'abord en local          ║
 * ║  2. Un flag syncEnAttente marque les données à synchroniser  ║
 * ║  3. Dès que le réseau est disponible, sync vers le backend   ║
 * ║                                                              ║
 * ║  Tables créées :                                             ║
 * ║  - utilisateurs, produits, ventes, clients, dettes           ║
 * ║  - fournisseurs, dettes_fournisseurs, mouvements_stock       ║
 * ║  - groupes, membres_groupe                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import * as SQLite from "expo-sqlite";

// ── Instance de la base de données ────────────────────────────
// Une seule instance partagée dans toute l'application
let db = null;

/**
 * Ouvre (ou crée) la base de données SQLite locale.
 * Utilise l'API async de expo-sqlite v14+.
 *
 * @returns {Promise<SQLite.SQLiteDatabase>}
 */
export const ouvrirDatabase = async () => {
  if (db) return db;

  // Ouvrir la base de données (créée si inexistante)
  db = await SQLite.openDatabaseAsync("hardoize.db");

  // Activer les clés étrangères pour l'intégrité référentielle
  await db.execAsync("PRAGMA foreign_keys = ON;");

  // Créer toutes les tables si elles n'existent pas
  await creerTables();

  return db;
};

/**
 * Crée toutes les tables de la base de données locale.
 * Utilise IF NOT EXISTS pour ne pas écraser les données existantes.
 */
const creerTables = async () => {
  // ── Table utilisateurs ────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId      TEXT,
      nom           TEXT NOT NULL,
      telephone     TEXT NOT NULL UNIQUE,
      email         TEXT,
      motDePasse    TEXT NOT NULL,
      role          TEXT DEFAULT 'vendeur',
      photoUri      TEXT,
      evaluation    REAL DEFAULT 5.0,
      estActif      INTEGER DEFAULT 1,
      syncEnAttente INTEGER DEFAULT 1,
      createdAt     INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // ── Table produits ────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS produits (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId      TEXT,
      nom           TEXT NOT NULL,
      prixAchat     REAL DEFAULT 0,
      prixVente     REAL NOT NULL,
      quantiteStock INTEGER DEFAULT 0,
      stockMinimum  INTEGER DEFAULT 5,
      categorie     TEXT,
      photoUri      TEXT,
      groupeId      INTEGER DEFAULT 0,
      estActif      INTEGER DEFAULT 1,
      syncEnAttente INTEGER DEFAULT 1,
      createdAt     INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // ── Table clients ─────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clients (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId        TEXT,
      nomClient       TEXT NOT NULL,
      numeroClient    TEXT NOT NULL,
      email           TEXT,
      photoUri        TEXT,
      score           INTEGER DEFAULT 100,
      groupeId        INTEGER DEFAULT 0,
      utilisateurId   INTEGER,
      estActif        INTEGER DEFAULT 1,
      syncEnAttente   INTEGER DEFAULT 1,
      createdAt       INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // ── Table ventes ──────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ventes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId        TEXT,
      produitId       INTEGER NOT NULL,
      nomProduit      TEXT,
      quantite        INTEGER NOT NULL,
      prixUnitaire    REAL NOT NULL,
      montantTotal    REAL NOT NULL,
      typePaiement    TEXT NOT NULL,
      clientId        INTEGER,
      utilisateurId   INTEGER,
      groupeId        INTEGER DEFAULT 0,
      syncEnAttente   INTEGER DEFAULT 1,
      createdAt       INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (produitId) REFERENCES produits(id),
      FOREIGN KEY (clientId)  REFERENCES clients(id)
    );
  `);

  // ── Table dettes ──────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dettes (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId            TEXT,
      clientId            INTEGER NOT NULL,
      venteId             INTEGER,
      montantTotal        REAL NOT NULL,
      montantRembourse    REAL DEFAULT 0,
      dateRemboursement   INTEGER NOT NULL,
      statut              TEXT DEFAULT 'en_attente',
      utilisateurId       INTEGER,
      groupeId            INTEGER DEFAULT 0,
      syncEnAttente       INTEGER DEFAULT 1,
      createdAt           INTEGER DEFAULT (strftime('%s','now') * 1000),
      updatedAt           INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );
  `);

  // ── Table fournisseurs ────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId      TEXT,
      nom           TEXT NOT NULL,
      telephone     TEXT,
      email         TEXT,
      adresse       TEXT,
      photoUri      TEXT,
      groupeId      INTEGER DEFAULT 0,
      estActif      INTEGER DEFAULT 1,
      syncEnAttente INTEGER DEFAULT 1,
      createdAt     INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // ── Table dettes fournisseurs ─────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dettes_fournisseurs (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId            TEXT,
      fournisseurId       INTEGER NOT NULL,
      nomFournisseur      TEXT,
      montantTotal        REAL NOT NULL,
      montantRembourse    REAL DEFAULT 0,
      dateRemboursement   INTEGER NOT NULL,
      motif               TEXT,
      statut              TEXT DEFAULT 'en_attente',
      groupeId            INTEGER DEFAULT 0,
      syncEnAttente       INTEGER DEFAULT 1,
      createdAt           INTEGER DEFAULT (strftime('%s','now') * 1000),
      updatedAt           INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (fournisseurId) REFERENCES fournisseurs(id)
    );
  `);

  // ── Table mouvements stock ────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS mouvements_stock (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId        TEXT,
      produitId       INTEGER NOT NULL,
      nomProduit      TEXT,
      type            TEXT NOT NULL,
      motif           TEXT,
      quantite        INTEGER NOT NULL,
      prixUnitaire    REAL DEFAULT 0,
      montantTotal    REAL DEFAULT 0,
      fournisseurId   INTEGER,
      utilisateurId   INTEGER,
      groupeId        INTEGER DEFAULT 0,
      syncEnAttente   INTEGER DEFAULT 1,
      createdAt       INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (produitId) REFERENCES produits(id)
    );
  `);

  // ── Table groupes ─────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS groupes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId        TEXT,
      nom             TEXT NOT NULL,
      description     TEXT,
      proprietaireId  INTEGER,
      codeQR          TEXT UNIQUE,
      photoUri        TEXT,
      heureFermeture  TEXT DEFAULT '18:00',
      estActif        INTEGER DEFAULT 1,
      syncEnAttente   INTEGER DEFAULT 1,
      createdAt       INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // ── Table membres groupe ──────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS membres_groupe (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      serverId            TEXT,
      groupeId            INTEGER NOT NULL,
      utilisateurId       INTEGER,
      nomAffiche          TEXT,
      telephone           TEXT,
      role                TEXT DEFAULT 'vendeur',
      bailHeure           TEXT DEFAULT '18:00',
      estConnecte         INTEGER DEFAULT 0,
      estActif            INTEGER DEFAULT 1,
      connexionPermanente INTEGER DEFAULT 0,
      syncEnAttente       INTEGER DEFAULT 1,
      createdAt           INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (groupeId) REFERENCES groupes(id)
    );
  `);

  console.log("✅ Tables SQLite créées avec succès");
};

// ══════════════════════════════════════════════════════════════
//  OPÉRATIONS GÉNÉRIQUES
// ══════════════════════════════════════════════════════════════

/**
 * Exécute une requête SELECT et retourne tous les résultats.
 *
 * @param {string} sql - Requête SQL
 * @param {Array} params - Paramètres de la requête
 * @returns {Promise<Array>} Liste des résultats
 */
export const query = async (sql, params = []) => {
  const database = await ouvrirDatabase();
  return await database.getAllAsync(sql, params);
};

/**
 * Exécute une requête SELECT et retourne le premier résultat.
 *
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Object|null>}
 */
export const queryOne = async (sql, params = []) => {
  const database = await ouvrirDatabase();
  return await database.getFirstAsync(sql, params);
};

/**
 * Exécute une requête INSERT/UPDATE/DELETE.
 *
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<SQLite.SQLiteRunResult>} { lastInsertRowId, changes }
 */
export const execute = async (sql, params = []) => {
  const database = await ouvrirDatabase();
  return await database.runAsync(sql, params);
};

// ══════════════════════════════════════════════════════════════
//  PRODUITS
// ══════════════════════════════════════════════════════════════

export const ProduitDB = {

  /**
   * Insère un nouveau produit en base locale.
   *
   * @param {Object} produit
   * @returns {Promise<number>} ID du produit créé
   */
  inserer: async (produit) => {
    const result = await execute(
      `INSERT INTO produits
        (nom, prixAchat, prixVente, quantiteStock, stockMinimum,
         categorie, photoUri, groupeId, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        produit.nom,
        produit.prixAchat || 0,
        produit.prixVente,
        produit.quantiteStock || 0,
        produit.stockMinimum || 5,
        produit.categorie || null,
        produit.photoUri || null,
        produit.groupeId || 0,
      ]
    );
    return result.lastInsertRowId;
  },

  /**
   * Récupère tous les produits actifs d'un groupe.
   * Triés par nom alphabétique.
   *
   * @param {number} groupeId
   * @returns {Promise<Array>}
   */
  getByGroupe: async (groupeId) => {
    return await query(
      `SELECT * FROM produits
       WHERE groupeId = ? AND estActif = 1
       ORDER BY nom ASC`,
      [groupeId]
    );
  },

  /**
   * Recherche des produits par nom.
   *
   * @param {number} groupeId
   * @param {string} recherche
   * @returns {Promise<Array>}
   */
  rechercher: async (groupeId, recherche) => {
    return await query(
      `SELECT * FROM produits
       WHERE groupeId = ? AND estActif = 1
       AND nom LIKE ?
       ORDER BY nom ASC`,
      [groupeId, `%${recherche}%`]
    );
  },

  /**
   * Met à jour un produit.
   *
   * @param {number} id
   * @param {Object} updates
   */
  mettreAJour: async (id, updates) => {
    await execute(
      `UPDATE produits
       SET nom = ?, prixAchat = ?, prixVente = ?,
           quantiteStock = ?, stockMinimum = ?,
           categorie = ?, photoUri = ?, syncEnAttente = 1
       WHERE id = ?`,
      [
        updates.nom,
        updates.prixAchat,
        updates.prixVente,
        updates.quantiteStock,
        updates.stockMinimum,
        updates.categorie,
        updates.photoUri,
        id,
      ]
    );
  },

  /**
   * Décrémente le stock d'un produit après une vente.
   *
   * @param {number} id
   * @param {number} quantite
   */
  decrementerStock: async (id, quantite) => {
    await execute(
      `UPDATE produits
       SET quantiteStock = MAX(0, quantiteStock - ?),
           syncEnAttente = 1
       WHERE id = ?`,
      [quantite, id]
    );
  },

  /**
   * Incrémente le stock d'un produit (entrée).
   *
   * @param {number} id
   * @param {number} quantite
   */
  incrementerStock: async (id, quantite) => {
    await execute(
      `UPDATE produits
       SET quantiteStock = quantiteStock + ?,
           syncEnAttente = 1
       WHERE id = ?`,
      [quantite, id]
    );
  },

  /**
   * Retourne les produits avec stock faible ou épuisé.
   *
   * @param {number} groupeId
   * @returns {Promise<Array>}
   */
  getStockFaible: async (groupeId) => {
    return await query(
      `SELECT * FROM produits
       WHERE groupeId = ? AND estActif = 1
       AND quantiteStock <= stockMinimum
       ORDER BY quantiteStock ASC`,
      [groupeId]
    );
  },

  /**
   * Désactive un produit (soft delete).
   *
   * @param {number} id
   * @param {boolean} actif
   */
  setActif: async (id, actif) => {
    await execute(
      `UPDATE produits SET estActif = ?, syncEnAttente = 1 WHERE id = ?`,
      [actif ? 1 : 0, id]
    );
  },

  /**
   * Retourne les produits non synchronisés.
   * Utilisé par le SyncManager.
   *
   * @returns {Promise<Array>}
   */
  getASync: async () => {
    return await query(
      `SELECT * FROM produits WHERE syncEnAttente = 1`
    );
  },
};

// ══════════════════════════════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════════════════════════════

export const ClientDB = {

  inserer: async (client) => {
    const result = await execute(
      `INSERT INTO clients
        (nomClient, numeroClient, email, photoUri,
         score, groupeId, utilisateurId, syncEnAttente)
       VALUES (?, ?, ?, ?, 100, ?, ?, 1)`,
      [
        client.nomClient,
        client.numeroClient,
        client.email || null,
        client.photoUri || null,
        client.groupeId || 0,
        client.utilisateurId || null,
      ]
    );
    return result.lastInsertRowId;
  },

  getByGroupe: async (groupeId) => {
    return await query(
      `SELECT * FROM clients
       WHERE groupeId = ? AND estActif = 1
       ORDER BY nomClient ASC`,
      [groupeId]
    );
  },

  getById: async (id) => {
    return await queryOne(
      `SELECT * FROM clients WHERE id = ?`, [id]
    );
  },

  getByTelephone: async (telephone, groupeId) => {
    return await queryOne(
      `SELECT * FROM clients
       WHERE numeroClient = ? AND groupeId = ? LIMIT 1`,
      [telephone, groupeId]
    );
  },

  rechercher: async (groupeId, recherche) => {
    return await query(
      `SELECT * FROM clients
       WHERE groupeId = ? AND estActif = 1
       AND (nomClient LIKE ? OR numeroClient LIKE ?)
       ORDER BY score ASC`,
      [groupeId, `%${recherche}%`, `%${recherche}%`]
    );
  },

  decrementerScore: async (id, points) => {
    await execute(
      `UPDATE clients
       SET score = MAX(0, score - ?), syncEnAttente = 1
       WHERE id = ?`,
      [points, id]
    );
  },

  incrementerScore: async (id, points) => {
    await execute(
      `UPDATE clients
       SET score = MIN(100, score + ?), syncEnAttente = 1
       WHERE id = ?`,
      [points, id]
    );
  },

  getScoreMoyen: async (groupeId) => {
    const result = await queryOne(
      `SELECT AVG(score) as moyenne FROM clients
       WHERE groupeId = ? AND estActif = 1`,
      [groupeId]
    );
    return result?.moyenne || 100;
  },

  getASync: async () => {
    return await query(`SELECT * FROM clients WHERE syncEnAttente = 1`);
  },
};

// ══════════════════════════════════════════════════════════════
//  VENTES
// ══════════════════════════════════════════════════════════════

export const VenteDB = {

  inserer: async (vente) => {
    const result = await execute(
      `INSERT INTO ventes
        (produitId, nomProduit, quantite, prixUnitaire,
         montantTotal, typePaiement, clientId,
         utilisateurId, groupeId, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        vente.produitId,
        vente.nomProduit,
        vente.quantite,
        vente.prixUnitaire,
        vente.montantTotal,
        vente.typePaiement,
        vente.clientId || null,
        vente.utilisateurId || null,
        vente.groupeId || 0,
      ]
    );
    return result.lastInsertRowId;
  },

  getByGroupe: async (groupeId) => {
    return await query(
      `SELECT v.*, c.nomClient FROM ventes v
       LEFT JOIN clients c ON v.clientId = c.id
       WHERE v.groupeId = ?
       ORDER BY v.createdAt DESC`,
      [groupeId]
    );
  },

  getTotalJour: async (groupeId) => {
    const debutAujourdhui = new Date();
    debutAujourdhui.setHours(0, 0, 0, 0);

    const result = await queryOne(
      `SELECT SUM(montantTotal) as total FROM ventes
       WHERE groupeId = ? AND createdAt >= ?`,
      [groupeId, debutAujourdhui.getTime()]
    );
    return result?.total || 0;
  },

  getTotalPeriode: async (groupeId, debut, fin) => {
    const result = await queryOne(
      `SELECT
         SUM(montantTotal) as total,
         SUM(CASE WHEN typePaiement='especes' THEN montantTotal ELSE 0 END) as totalEspeces,
         SUM(CASE WHEN typePaiement='credit'  THEN montantTotal ELSE 0 END) as totalCredit,
         COUNT(*) as nbVentes
       FROM ventes
       WHERE groupeId = ? AND createdAt >= ? AND createdAt <= ?`,
      [groupeId, debut, fin]
    );
    return result || { total: 0, totalEspeces: 0, totalCredit: 0, nbVentes: 0 };
  },

  getASync: async () => {
    return await query(`SELECT * FROM ventes WHERE syncEnAttente = 1`);
  },
};

// ══════════════════════════════════════════════════════════════
//  DETTES
// ══════════════════════════════════════════════════════════════

export const DetteDB = {

  inserer: async (dette) => {
    const result = await execute(
      `INSERT INTO dettes
        (clientId, venteId, montantTotal, dateRemboursement,
         utilisateurId, groupeId, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        dette.clientId,
        dette.venteId || null,
        dette.montantTotal,
        dette.dateRemboursement,
        dette.utilisateurId || null,
        dette.groupeId || 0,
      ]
    );
    return result.lastInsertRowId;
  },

  getDettesActives: async (groupeId) => {
    return await query(
      `SELECT d.*, c.nomClient, c.numeroClient, c.score, c.photoUri
       FROM dettes d
       INNER JOIN clients c ON d.clientId = c.id
       WHERE d.groupeId = ? AND d.statut != 'soldee'
       ORDER BY c.score ASC`,
      [groupeId]
    );
  },

  getTotalActif: async (groupeId) => {
    const result = await queryOne(
      `SELECT SUM(montantTotal - montantRembourse) as total
       FROM dettes
       WHERE groupeId = ? AND statut != 'soldee'`,
      [groupeId]
    );
    return result?.total || 0;
  },

  enregistrerRemboursement: async (id, montant) => {
    await execute(
      `UPDATE dettes
       SET montantRembourse = montantRembourse + ?,
           updatedAt = ?,
           syncEnAttente = 1
       WHERE id = ?`,
      [montant, Date.now(), id]
    );

    // Vérifier si soldée
    const dette = await queryOne(`SELECT * FROM dettes WHERE id = ?`, [id]);
    if (dette && dette.montantRembourse >= dette.montantTotal) {
      await execute(
        `UPDATE dettes SET statut = 'soldee', syncEnAttente = 1 WHERE id = ?`,
        [id]
      );
    }
  },

  solderDette: async (id) => {
    await execute(
      `UPDATE dettes
       SET statut = 'soldee', updatedAt = ?, syncEnAttente = 1
       WHERE id = ?`,
      [Date.now(), id]
    );
  },

  getDettesEnRetard: async () => {
    return await query(
      `SELECT * FROM dettes
       WHERE statut != 'soldee'
       AND dateRemboursement < ?`,
      [Date.now()]
    );
  },

  getASync: async () => {
    return await query(`SELECT * FROM dettes WHERE syncEnAttente = 1`);
  },
};

// ══════════════════════════════════════════════════════════════
//  MOUVEMENTS STOCK
// ══════════════════════════════════════════════════════════════

export const MouvementDB = {

  inserer: async (mouvement) => {
    const result = await execute(
      `INSERT INTO mouvements_stock
        (produitId, nomProduit, type, motif, quantite,
         prixUnitaire, montantTotal, fournisseurId,
         utilisateurId, groupeId, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        mouvement.produitId,
        mouvement.nomProduit,
        mouvement.type,
        mouvement.motif || null,
        mouvement.quantite,
        mouvement.prixUnitaire || 0,
        mouvement.montantTotal || 0,
        mouvement.fournisseurId || null,
        mouvement.utilisateurId || null,
        mouvement.groupeId || 0,
      ]
    );
    return result.lastInsertRowId;
  },

  getByGroupe: async (groupeId) => {
    return await query(
      `SELECT * FROM mouvements_stock
       WHERE groupeId = ?
       ORDER BY createdAt DESC`,
      [groupeId]
    );
  },

  getASync: async () => {
    return await query(
      `SELECT * FROM mouvements_stock WHERE syncEnAttente = 1`
    );
  },
};

// ══════════════════════════════════════════════════════════════
//  GROUPES
// ══════════════════════════════════════════════════════════════

export const GroupeDB = {

  inserer: async (groupe) => {
    const result = await execute(
      `INSERT INTO groupes
        (nom, description, proprietaireId, codeQR,
         photoUri, heureFermeture, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        groupe.nom,
        groupe.description || null,
        groupe.proprietaireId,
        groupe.codeQR,
        groupe.photoUri || null,
        groupe.heureFermeture || "18:00",
      ]
    );
    return result.lastInsertRowId;
  },

  getByProprietaire: async (proprietaireId) => {
    return await query(
      `SELECT * FROM groupes
       WHERE proprietaireId = ? AND estActif = 1`,
      [proprietaireId]
    );
  },

  getByCodeQR: async (codeQR) => {
    return await queryOne(
      `SELECT * FROM groupes WHERE codeQR = ? LIMIT 1`,
      [codeQR]
    );
  },

  getById: async (id) => {
    return await queryOne(
      `SELECT * FROM groupes WHERE id = ?`, [id]
    );
  },

  getASync: async () => {
    return await query(`SELECT * FROM groupes WHERE syncEnAttente = 1`);
  },
};

// ══════════════════════════════════════════════════════════════
//  MEMBRES GROUPE
// ══════════════════════════════════════════════════════════════

export const MembreDB = {

  inserer: async (membre) => {
    const result = await execute(
      `INSERT INTO membres_groupe
        (groupeId, utilisateurId, nomAffiche, telephone,
         role, bailHeure, estConnecte, connexionPermanente, syncEnAttente)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)`,
      [
        membre.groupeId,
        membre.utilisateurId || null,
        membre.nomAffiche,
        membre.telephone,
        membre.role || "vendeur",
        membre.bailHeure || "18:00",
        membre.connexionPermanente ? 1 : 0,
      ]
    );
    return result.lastInsertRowId;
  },

  getMembresConnectes: async (groupeId) => {
    return await query(
      `SELECT * FROM membres_groupe
       WHERE groupeId = ? AND estConnecte = 1 AND estActif = 1`,
      [groupeId]
    );
  },

  getMembre: async (groupeId, utilisateurId) => {
    return await queryOne(
      `SELECT * FROM membres_groupe
       WHERE groupeId = ? AND utilisateurId = ? LIMIT 1`,
      [groupeId, utilisateurId]
    );
  },

  deconnecterTous: async (groupeId) => {
    await execute(
      `UPDATE membres_groupe
       SET estConnecte = 0
       WHERE groupeId = ? AND connexionPermanente = 0`,
      [groupeId]
    );
  },

  mettreAJour: async (id, updates) => {
    await execute(
      `UPDATE membres_groupe
       SET role = ?, bailHeure = ?, estConnecte = ?,
           estActif = ?, connexionPermanente = ?, syncEnAttente = 1
       WHERE id = ?`,
      [
        updates.role,
        updates.bailHeure,
        updates.estConnecte ? 1 : 0,
        updates.estActif ? 1 : 0,
        updates.connexionPermanente ? 1 : 0,
        id,
      ]
    );
  },

  getASync: async () => {
    return await query(
      `SELECT * FROM membres_groupe WHERE syncEnAttente = 1`
    );
  },
};

export default {
  ouvrirDatabase,
  ProduitDB,
  ClientDB,
  VenteDB,
  DetteDB,
  MouvementDB,
  GroupeDB,
  MembreDB,
};