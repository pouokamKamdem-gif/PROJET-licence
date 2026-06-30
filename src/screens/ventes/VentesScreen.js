/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  VENTESSCREEN.JS                                             ║
 * ║                                                              ║
 * ║  Écran principal de vente Hardoize.                          ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Liste produits en grille 2 colonnes                       ║
 * ║  - Tap sur produit = +1 quantité dans le panier              ║
 * ║  - Barre de recherche en temps réel                          ║
 * ║  - Panier en bas avec total                                  ║
 * ║  - Paiement espèces ou crédit                                ║
 * ║  - Création automatique client si crédit                     ║
 * ║  - Décrément stock automatique                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import useStore  from "../../store/useStore";
import { COLORS, PAIEMENT, MOTIF_MOUVEMENT, MOUVEMENT } from "../../utils/constants";
import { formatFCFA, formatDate }   from "../../utils/helpers";
import { ProduitDB, VenteDB, DetteDB, ClientDB, MouvementDB } from "../../services/database";
import Button from "../../components/common/Button";
import Input  from "../../components/common/Input";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 colonnes avec padding

const VentesScreen = () => {
  // ── Store global ───────────────────────────────────────────
  const utilisateur     = useStore((s) => s.utilisateur);
  const groupeActif     = useStore((s) => s.groupeActif);
  const panier          = useStore((s) => s.panier);
  const ajouterAuPanier = useStore((s) => s.ajouterAuPanier);
  const viderPanier     = useStore((s) => s.viderPanier);
  const getTotalPanier  = useStore((s) => s.getTotalPanier);
  const getNbArticles   = useStore((s) => s.getNbArticles);
  const darkMode        = useStore((s) => s.darkMode);

  // ── État local ─────────────────────────────────────────────
  const [produits,       setProduits]       = useState([]);
  const [recherche,      setRecherche]      = useState("");
  const [chargement,     setChargement]     = useState(false);
  const [totalJour,      setTotalJour]      = useState(0);
  const [modalCredit,    setModalCredit]    = useState(false);
  const [nomClient,      setNomClient]      = useState("");
  const [telClient,      setTelClient]      = useState("");
  const [dateRemb,       setDateRemb]       = useState("");
  const [clientsExist,   setClientsExist]   = useState([]);
  const [clientChoisi,   setClientChoisi]   = useState(null);
  const [modeNouveauCli, setModeNouveauCli] = useState(false);

  // ID du groupe actif (0 si mode solo)
  const groupeId = groupeActif?.id || 0;

  // ── Charger produits au focus de l'écran ──────────────────
  useFocusEffect(
    useCallback(() => {
      chargerProduits();
      chargerTotalJour();
    }, [recherche, groupeId])
  );

  // ── Charger produits ───────────────────────────────────────
  const chargerProduits = async () => {
    try {
      setChargement(true);
      let liste;
      if (recherche.trim()) {
        liste = await ProduitDB.rechercher(groupeId, recherche.trim());
      } else {
        liste = await ProduitDB.getByGroupe(groupeId);
      }
      setProduits(liste);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
    } finally {
      setChargement(false);
    }
  };

  // ── Charger total du jour ──────────────────────────────────
  const chargerTotalJour = async () => {
    try {
      const total = await VenteDB.getTotalJour(groupeId);
      setTotalJour(total || 0);
    } catch (error) {
      console.error("Erreur total jour:", error);
    }
  };

  // ── Tap sur un produit = ajouter au panier ─────────────────
  const handleTapProduit = (produit) => {
    // Vérifier stock disponible
    const ligneExistante = panier.find((l) => l.produit.id === produit.id);
    const qteActuelle    = ligneExistante?.quantite || 0;

    if (qteActuelle >= produit.quantiteStock) {
      Alert.alert(
        "Stock insuffisant",
        `Il ne reste que ${produit.quantiteStock} unité(s) de ${produit.nom}`
      );
      return;
    }

    // Ajouter au panier (store Zustand)
    ajouterAuPanier(produit);
  };

  // ── Paiement en espèces ────────────────────────────────────
  const payerEspeces = () => {
    Alert.alert(
      "Confirmer la vente",
      `Total : ${formatFCFA(getTotalPanier())}\nPaiement en espèces ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => enregistrerVentes(PAIEMENT.ESPECES, null),
        },
      ]
    );
  };

  // ── Paiement en crédit ─────────────────────────────────────
  const payerCredit = async () => {
    // Charger les clients existants
    try {
      const clients = await ClientDB.getByGroupe(groupeId);
      setClientsExist(clients);
      setModalCredit(true);
    } catch (error) {
      setModalCredit(true);
    }
  };

  // ── Confirmer vente à crédit ───────────────────────────────
  const confirmerCredit = async () => {
    // Validation
    if (!clientChoisi && !modeNouveauCli) {
      Alert.alert("Erreur", "Choisissez un client ou créez-en un nouveau");
      return;
    }
    if (modeNouveauCli && (!nomClient.trim() || !telClient.trim())) {
      Alert.alert("Erreur", "Nom et téléphone du client obligatoires");
      return;
    }
    if (!dateRemb.trim()) {
      Alert.alert("Erreur", "La date de remboursement est obligatoire\nFormat: JJ/MM/AAAA");
      return;
    }

    // Parser la date de remboursement
    const partiesDate = dateRemb.split("/");
    if (partiesDate.length !== 3) {
      Alert.alert("Erreur", "Format de date invalide. Utilisez JJ/MM/AAAA");
      return;
    }

    const dateTimestamp = new Date(
      parseInt(partiesDate[2]),
      parseInt(partiesDate[1]) - 1,
      parseInt(partiesDate[0]),
      23, 59, 59
    ).getTime();

    if (isNaN(dateTimestamp) || dateTimestamp < Date.now()) {
      Alert.alert("Erreur", "La date doit être dans le futur");
      return;
    }

    try {
      let clientId;

      if (modeNouveauCli) {
        // Créer nouveau client
        const existant = await ClientDB.getByTelephone(telClient.trim(), groupeId);
        if (existant) {
          clientId = existant.id;
        } else {
          clientId = await ClientDB.inserer({
            nomClient:     nomClient.trim(),
            numeroClient:  telClient.trim(),
            groupeId,
            utilisateurId: utilisateur?.id || null,
          });
        }
      } else {
        clientId = clientChoisi.id;
      }

      setModalCredit(false);
      await enregistrerVentes(PAIEMENT.CREDIT, clientId, dateTimestamp);

    } catch (error) {
      Alert.alert("Erreur", error.message || "Erreur lors de la vente à crédit");
    }
  };

  // ── Enregistrer les ventes ─────────────────────────────────
  const enregistrerVentes = async (typePaiement, clientId, dateRemboursement) => {
    if (panier.length === 0) return;

    try {
      setChargement(true);

      for (const ligne of panier) {
        const { produit, quantite } = ligne;
        const montant = produit.prixVente * quantite;

        // 1. Enregistrer la vente en SQLite
        const venteId = await VenteDB.inserer({
          produitId:    produit.id,
          nomProduit:   produit.nom,
          quantite,
          prixUnitaire: produit.prixVente,
          montantTotal: montant,
          typePaiement,
          clientId:     clientId || null,
          utilisateurId: utilisateur?.id || null,
          groupeId,
        });

        // 2. Décrémenter le stock
        await ProduitDB.decrementerStock(produit.id, quantite);

        // 3. Enregistrer le mouvement de stock (sortie)
        await MouvementDB.inserer({
          produitId:    produit.id,
          nomProduit:   produit.nom,
          type:         MOUVEMENT.SORTIE,
          motif:        MOTIF_MOUVEMENT.VENTE,
          quantite,
          prixUnitaire: produit.prixVente,
          montantTotal: montant,
          utilisateurId: utilisateur?.id || null,
          groupeId,
        });

        // 4. Si crédit → créer la dette
        if (typePaiement === PAIEMENT.CREDIT && clientId && dateRemboursement) {
          await DetteDB.inserer({
            clientId,
            venteId,
            montantTotal:       montant,
            dateRemboursement,
            utilisateurId:      utilisateur?.id || null,
            groupeId,
          });
        }
      }

      // Vider le panier après succès
      viderPanier();
      await chargerProduits();
      await chargerTotalJour();

      // Réinitialiser le formulaire crédit
      setNomClient("");
      setTelClient("");
      setDateRemb("");
      setClientChoisi(null);
      setModeNouveauCli(false);

      Alert.alert(
        "✅ Vente enregistrée !",
        typePaiement === PAIEMENT.CREDIT
          ? "La dette a été créée pour ce client."
          : "Paiement en espèces enregistré."
      );

    } catch (error) {
      Alert.alert("Erreur", error.message || "Erreur lors de l'enregistrement");
    } finally {
      setChargement(false);
    }
  };

  // ── Rendu d'un produit (carte grille) ─────────────────────
  const renderProduit = ({ item }) => {
    // Quantité de ce produit dans le panier
    const ligneExistante = panier.find((l) => l.produit.id === item.id);
    const qteSelectionnee = ligneExistante?.quantite || 0;

    // Couleur selon stock
    const couleurStock =
      item.quantiteStock <= 0           ? COLORS.SCORE_ROUGE  :
      item.quantiteStock <= item.stockMinimum ? COLORS.SCORE_ORANGE :
      COLORS.SCORE_VERT;

    return (
      <TouchableOpacity
        style={[
          styles.produitCard,
          {
            backgroundColor: darkMode
              ? COLORS.SURFACE_DARK
              : COLORS.SURFACE_LIGHT,
            // Bordure orange si dans le panier
            borderWidth: qteSelectionnee > 0 ? 2 : 0,
            borderColor: COLORS.ORANGE,
            opacity:     item.quantiteStock <= 0 ? 0.4 : 1,
          },
        ]}
        onPress={() => handleTapProduit(item)}
        activeOpacity={0.85}
        disabled={item.quantiteStock <= 0}
      >
        {/* Quantité sélectionnée (badge) */}
        {qteSelectionnee > 0 && (
          <View style={styles.badgeQte}>
            <Text style={styles.badgeQteTexte}>x{qteSelectionnee}</Text>
          </View>
        )}

        {/* Stock en haut à droite */}
        <Text style={[styles.produitStock, { color: couleurStock }]}>
          {item.quantiteStock}
        </Text>

        {/* Icône produit */}
        <View style={styles.produitIcone}>
          <Text style={styles.produitIconeTexte}>🛒</Text>
        </View>

        {/* Nom du produit */}
        <Text
          style={[
            styles.produitNom,
            { color: darkMode
                ? COLORS.TEXT_PRIMARY_DARK
                : COLORS.TEXT_PRIMARY_LIGHT },
          ]}
          numberOfLines={2}
        >
          {item.nom}
        </Text>

        {/* Prix */}
        <Text style={styles.produitPrix}>
          {formatFCFA(item.prixVente)}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Couleurs du thème ──────────────────────────────────────
  const bgCouleur   = darkMode ? COLORS.BG_DARK   : COLORS.BG_LIGHT;
  const textCouleur = darkMode
    ? COLORS.TEXT_PRIMARY_DARK
    : COLORS.TEXT_PRIMARY_LIGHT;

  // ── Rendu principal ────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgCouleur }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={bgCouleur}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerDate, { color: textCouleur }]}>
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric", month: "short"
            })}
          </Text>
          <Text style={styles.headerTotal}>
            {formatFCFA(totalJour, true)}
          </Text>
        </View>
        <TouchableOpacity style={styles.portefeuille}>
          <Text style={styles.portfeuilleIcone}>💰</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barre de recherche ──────────────────────────────── */}
      <View style={[
        styles.searchBar,
        { backgroundColor: darkMode
            ? COLORS.SURFACE_DARK
            : COLORS.BG_CARD_LIGHT }
      ]}>
        <Text style={styles.searchIcone}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: textCouleur }]}
          placeholder="Rechercher un produit..."
          placeholderTextColor={
            darkMode
              ? COLORS.TEXT_SECONDARY_DARK
              : COLORS.TEXT_SECONDARY_LIGHT
          }
          value={recherche}
          onChangeText={(text) => {
            setRecherche(text);
            // Recherche en temps réel
          }}
        />
        {recherche.length > 0 && (
          <TouchableOpacity onPress={() => setRecherche("")}>
            <Text style={{ color: COLORS.TEXT_SECONDARY_LIGHT }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Grille produits ─────────────────────────────────── */}
      <FlatList
        data={produits}
        renderItem={renderProduit}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grille}
        refreshControl={
          <RefreshControl
            refreshing={chargement}
            onRefresh={chargerProduits}
            colors={[COLORS.ORANGE]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videIcone}>🛒</Text>
            <Text style={[styles.videTexte, { color: textCouleur }]}>
              {recherche
                ? "Aucun produit trouvé"
                : "Aucun produit dans ce groupe"}
            </Text>
            <Text style={styles.videSubTexte}>
              Ajoutez des produits depuis l'onglet Stock
            </Text>
          </View>
        }
      />

      {/* ── Panier (visible si articles) ─────────────────────── */}
      {panier.length > 0 && (
        <View style={[
          styles.panier,
          { backgroundColor: darkMode
              ? COLORS.SURFACE_DARK
              : COLORS.SURFACE_LIGHT }
        ]}>
          {/* Résumé panier */}
          <View style={styles.panierResume}>
            {/* Badge nombre articles */}
            <View style={styles.panierBadge}>
              <Text style={styles.panierBadgeTexte}>
                {getNbArticles()}
              </Text>
            </View>

            {/* Nom premier produit */}
            <View style={styles.panierInfo}>
              <Text
                style={[styles.panierNom, { color: textCouleur }]}
                numberOfLines={1}
              >
                {panier[0].produit.nom}
                {panier.length > 1 ? ` +${panier.length - 1}` : ""}
              </Text>
              <Text style={styles.panierTotal}>
                {formatFCFA(getTotalPanier())}
              </Text>
            </View>

            {/* Bouton vider */}
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Vider le panier",
                  "Supprimer tous les articles ?",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Vider",   onPress: viderPanier },
                  ]
                );
              }}
              style={styles.panierVider}
            >
              <Text style={styles.panierViderTexte}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Boutons paiement */}
          <View style={styles.panierBoutons}>
            {/* Espèces */}
            <TouchableOpacity
              style={styles.btnEspeces}
              onPress={payerEspeces}
            >
              <Text style={styles.btnEspecesTexte}>💵 Espèces</Text>
            </TouchableOpacity>

            {/* Crédit */}
            <TouchableOpacity
              style={styles.btnCredit}
              onPress={payerCredit}
            >
              <Text style={styles.btnCreditTexte}>💳 Crédit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Modal paiement crédit ─────────────────────────── */}
      <Modal
        visible={modalCredit}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalCredit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.SURFACE_LIGHT }
          ]}>
            <Text style={[styles.modalTitre, { color: textCouleur }]}>
              Vente à crédit
            </Text>

            {/* Choix : client existant ou nouveau */}
            <View style={styles.modalTabs}>
              <TouchableOpacity
                style={[
                  styles.modalTab,
                  !modeNouveauCli && styles.modalTabActif,
                ]}
                onPress={() => {
                  setModeNouveauCli(false);
                  setClientChoisi(null);
                }}
              >
                <Text style={[
                  styles.modalTabTexte,
                  !modeNouveauCli && styles.modalTabTexteActif,
                ]}>
                  Client existant
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTab,
                  modeNouveauCli && styles.modalTabActif,
                ]}
                onPress={() => {
                  setModeNouveauCli(true);
                  setClientChoisi(null);
                }}
              >
                <Text style={[
                  styles.modalTabTexte,
                  modeNouveauCli && styles.modalTabTexteActif,
                ]}>
                  Nouveau client
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Mode client existant */}
              {!modeNouveauCli && (
                <View>
                  {clientsExist.length === 0 ? (
                    <Text style={[styles.aucunClient, { color: textCouleur }]}>
                      Aucun client enregistré.{"\n"}
                      Créez un nouveau client.
                    </Text>
                  ) : (
                    clientsExist.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={[
                          styles.clientItem,
                          clientChoisi?.id === client.id &&
                            styles.clientItemSelectionne,
                        ]}
                        onPress={() => setClientChoisi(client)}
                      >
                        <Text style={[
                          styles.clientNom,
                          { color: textCouleur }
                        ]}>
                          {client.nomClient}
                        </Text>
                        <Text style={styles.clientTel}>
                          {client.numeroClient}
                        </Text>
                        <View style={[
                          styles.clientScore,
                          { borderColor: client.score >= 60
                              ? COLORS.SCORE_VERT
                              : COLORS.SCORE_ROUGE }
                        ]}>
                          <Text style={{ color: client.score >= 60
                              ? COLORS.SCORE_VERT
                              : COLORS.SCORE_ROUGE,
                            fontSize: 11,
                            fontWeight: "700"
                          }}>
                            {client.score}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Mode nouveau client */}
              {modeNouveauCli && (
                <View>
                  <Input
                    label="Nom du client"
                    placeholder="Ex: Moussa Diallo"
                    valeur={nomClient}
                    onChange={setNomClient}
                    dark={darkMode}
                  />
                  <Input
                    label="Téléphone"
                    placeholder="+237 6XX XXX XXX"
                    valeur={telClient}
                    onChange={setTelClient}
                    typeClavier="phone-pad"
                    dark={darkMode}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Date de remboursement */}
              <Input
                label="Date de remboursement"
                placeholder="JJ/MM/AAAA"
                valeur={dateRemb}
                onChange={setDateRemb}
                typeClavier="numeric"
                dark={darkMode}
              />

              {/* Total */}
              <View style={styles.modalTotal}>
                <Text style={[styles.modalTotalLabel, { color: textCouleur }]}>
                  Montant total :
                </Text>
                <Text style={styles.modalTotalMontant}>
                  {formatFCFA(getTotalPanier())}
                </Text>
              </View>

              {/* Boutons */}
              <Button
                titre="Confirmer la vente à crédit"
                onPress={confirmerCredit}
                style={{ marginBottom: 12 }}
              />
              <Button
                titre="Annuler"
                variante="secondary"
                onPress={() => setModalCredit(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },

  headerDate: {
    fontSize:   16,
    fontWeight: "700",
  },

  headerTotal: {
    fontSize:   15,
    fontWeight: "700",
    color:      COLORS.ORANGE,
  },

  portefeuille: {
    padding: 8,
  },

  portfeuilleIcone: {
    fontSize: 24,
  },

  // ── Recherche ──────────────────────────────────────────────
  searchBar: {
    flexDirection:  "row",
    alignItems:     "center",
    marginHorizontal: 16,
    marginBottom:   12,
    borderRadius:   12,
    paddingHorizontal: 14,
    height:         46,
  },

  searchIcone: {
    fontSize:    16,
    marginRight: 8,
  },

  searchInput: {
    flex:     1,
    fontSize: 14,
    height:   "100%",
  },

  // ── Grille produits ───────────────────────────────────────
  grille: {
    paddingHorizontal: 12,
    paddingBottom:     200,
  },

  // ── Carte produit ─────────────────────────────────────────
  produitCard: {
    width:        CARD_WIDTH,
    height:       130,
    borderRadius: 14,
    margin:       6,
    padding:      14,
    position:     "relative",
    shadowColor:  "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation:    2,
  },

  // Badge quantité sélectionnée
  badgeQte: {
    position:        "absolute",
    top:             8,
    left:            8,
    backgroundColor: COLORS.ORANGE,
    borderRadius:    12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex:          1,
  },

  badgeQteTexte: {
    color:      COLORS.WHITE,
    fontSize:   11,
    fontWeight: "700",
  },

  // Stock haut droite
  produitStock: {
    position:   "absolute",
    top:        10,
    right:      12,
    fontSize:   16,
    fontWeight: "700",
  },

  // Icône produit
  produitIcone: {
    marginTop: 8,
  },

  produitIconeTexte: {
    fontSize: 24,
  },

  // Nom produit
  produitNom: {
    fontSize:   14,
    fontWeight: "700",
    marginTop:  4,
  },

  // Prix produit
  produitPrix: {
    fontSize:  13,
    color:     COLORS.ORANGE,
    marginTop: 2,
  },

  // ── État vide ─────────────────────────────────────────────
  vide: {
    alignItems:   "center",
    paddingTop:   80,
  },

  videIcone: {
    fontSize:     48,
    marginBottom: 16,
  },

  videTexte: {
    fontSize:   16,
    fontWeight: "600",
    marginBottom: 8,
  },

  videSubTexte: {
    fontSize: 13,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  // ── Panier ────────────────────────────────────────────────
  panier: {
    position:       "absolute",
    bottom:         0,
    left:           0,
    right:          0,
    padding:        16,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: -4 },
    shadowOpacity:  0.1,
    shadowRadius:   12,
    elevation:      8,
  },

  panierResume: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   12,
  },

  panierBadge: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: COLORS.BG_DARK,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     12,
  },

  panierBadgeTexte: {
    color:      COLORS.WHITE,
    fontSize:   14,
    fontWeight: "700",
  },

  panierInfo: {
    flex: 1,
  },

  panierNom: {
    fontSize:   14,
    fontWeight: "700",
  },

  panierTotal: {
    fontSize: 13,
    color:    COLORS.ORANGE,
  },

  panierVider: {
    padding: 8,
  },

  panierViderTexte: {
    fontSize: 18,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  panierBoutons: {
    flexDirection: "row",
    gap:           12,
  },

  btnEspeces: {
    flex:            1,
    height:          52,
    backgroundColor: COLORS.BG_DARK,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
  },

  btnEspecesTexte: {
    color:      COLORS.WHITE,
    fontSize:   15,
    fontWeight: "700",
  },

  btnCredit: {
    flex:            1,
    height:          52,
    backgroundColor: COLORS.BG_CARD_LIGHT,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     COLORS.ORANGE,
  },

  btnCreditTexte: {
    color:      COLORS.ORANGE,
    fontSize:   15,
    fontWeight: "700",
  },

  // ── Modal crédit ──────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent:  "flex-end",
  },

  modalContainer: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:              24,
    maxHeight:            "80%",
  },

  modalTitre: {
    fontSize:     18,
    fontWeight:   "800",
    marginBottom: 16,
  },

  // Tabs client existant / nouveau
  modalTabs: {
    flexDirection:   "row",
    backgroundColor: COLORS.BG_CARD_LIGHT,
    borderRadius:    12,
    padding:         4,
    marginBottom:    16,
  },

  modalTab: {
    flex:           1,
    height:         40,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },

  modalTabActif: {
    backgroundColor: COLORS.ORANGE,
  },

  modalTabTexte: {
    fontSize:   13,
    color:      COLORS.TEXT_SECONDARY_LIGHT,
  },

  modalTabTexteActif: {
    color:      COLORS.WHITE,
    fontWeight: "700",
  },

  // Liste clients existants
  clientItem: {
    flexDirection:  "row",
    alignItems:     "center",
    padding:        12,
    borderRadius:   12,
    marginBottom:   8,
    backgroundColor: COLORS.BG_CARD_LIGHT,
  },

  clientItemSelectionne: {
    borderWidth: 2,
    borderColor: COLORS.ORANGE,
  },

  clientNom: {
    flex:       1,
    fontSize:   14,
    fontWeight: "600",
  },

  clientTel: {
    fontSize: 12,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
    marginRight: 8,
  },

  clientScore: {
    width:          36,
    height:         36,
    borderRadius:   18,
    borderWidth:    2,
    alignItems:     "center",
    justifyContent: "center",
  },

  aucunClient: {
    textAlign:    "center",
    fontSize:     14,
    paddingVertical: 20,
  },

  // Total modal
  modalTotal: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.GRAY_LIGHT,
    marginBottom:   16,
  },

  modalTotalLabel: {
    fontSize:   15,
    fontWeight: "600",
  },

  modalTotalMontant: {
    fontSize:   18,
    fontWeight: "800",
    color:      COLORS.ORANGE,
  },
});

export default VentesScreen;