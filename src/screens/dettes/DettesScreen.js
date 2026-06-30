/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DETTESSCREEN.JS                                             ║
 * ║                                                              ║
 * ║  Écran de gestion des dettes clients.                        ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Statistiques : total dettes, retards, score moyen         ║
 * ║  - Liste clients débiteurs avec score coloré                 ║
 * ║  - Bordure gauche colorée selon score                        ║
 * ║  - Remboursement partiel ou total                            ║
 * ║  - Solde complet de dette                                    ║
 * ║  - Tri par score / montant / date                            ║
 * ║  - Recherche client en temps réel                            ║
 * ║  - Ajout client manuel                                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import useStore  from "../../store/useStore";
import { COLORS } from "../../utils/constants";
import {
  formatFCFA,
  formatDate,
  getCouleurScore,
  getStatutScore,
  estEnRetard,
  getJoursRetard,
} from "../../utils/helpers";
import { DetteDB, ClientDB } from "../../services/database";
import Button from "../../components/common/Button";
import Input  from "../../components/common/Input";

const DettesScreen = () => {
  // ── Store ──────────────────────────────────────────────────
  const utilisateur = useStore((s) => s.utilisateur);
  const groupeActif = useStore((s) => s.groupeActif);
  const darkMode    = useStore((s) => s.darkMode);
  const groupeId    = groupeActif?.id || 0;

  // ── État local ─────────────────────────────────────────────
  const [dettes,         setDettes]         = useState([]);
  const [recherche,      setRecherche]       = useState("");
  const [chargement,     setChargement]      = useState(false);
  const [totalDettes,    setTotalDettes]     = useState(0);
  const [nbRetards,      setNbRetards]       = useState(0);
  const [scoreMoyen,     setScoreMoyen]      = useState(100);
  const [triActuel,      setTriActuel]       = useState("score");
  const [modalDetail,    setModalDetail]     = useState(false);
  const [modalAjoutCli,  setModalAjoutCli]   = useState(false);
  const [detteSelectionnee, setDetteSelectionnee] = useState(null);
  const [montantRembours,   setMontantRembours]   = useState("");

  // ── Nouveau client ─────────────────────────────────────────
  const [nomNvCli,  setNomNvCli]  = useState("");
  const [telNvCli,  setTelNvCli]  = useState("");

  // ── Charger données au focus ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      chargerDonnees();
    }, [groupeId])
  );

  // ── Charger toutes les données ────────────────────────────
  const chargerDonnees = async () => {
    try {
      setChargement(true);

      // Charger les dettes actives avec infos client
      const listeDettes = await DetteDB.getDettesActives(groupeId);

      // Calculer les statistiques
      let total    = 0;
      let retards  = 0;

      listeDettes.forEach((d) => {
        total  += (d.montantTotal - d.montantRembourse);
        if (estEnRetard(d.dateRemboursement) && d.statut !== "soldee") {
          retards++;
        }
      });

      setTotalDettes(total);
      setNbRetards(retards);

      // Score moyen des clients
      const moyenne = await ClientDB.getScoreMoyen(groupeId);
      setScoreMoyen(Math.round(moyenne));

      // Appliquer le tri et la recherche
      const filtrées = filtrerEtTrier(listeDettes, recherche, triActuel);
      setDettes(filtrées);

    } catch (error) {
      console.error("Erreur chargement dettes:", error);
    } finally {
      setChargement(false);
    }
  };

  // ── Filtrer et trier les dettes ────────────────────────────
  const filtrerEtTrier = (liste, rech, tri) => {
    // Filtrer par recherche
    let filtrées = liste;
    if (rech.trim()) {
      filtrées = liste.filter((d) =>
        d.nomClient?.toLowerCase().includes(rech.toLowerCase()) ||
        d.numeroClient?.toLowerCase().includes(rech.toLowerCase())
      );
    }

    // Trier
    switch (tri) {
      case "score":
        // Du plus mauvais score au meilleur (urgents en premier)
        filtrées.sort((a, b) => (a.score || 100) - (b.score || 100));
        break;
      case "montant":
        // Du montant le plus élevé au plus bas
        filtrées.sort((a, b) =>
          (b.montantTotal - b.montantRembourse) -
          (a.montantTotal - a.montantRembourse)
        );
        break;
      case "date":
        // De la date d'échéance la plus proche
        filtrées.sort((a, b) =>
          a.dateRemboursement - b.dateRemboursement
        );
        break;
    }

    return filtrées;
  };

  // ── Recherche en temps réel ────────────────────────────────
  const handleRecherche = (texte) => {
    setRecherche(texte);
    const filtrées = filtrerEtTrier(dettes, texte, triActuel);
    setDettes(filtrées);
  };

  // ── Dialog de tri ──────────────────────────────────────────
  const afficherDialogTri = () => {
    Alert.alert(
      "Trier par",
      "",
      [
        {
          text: "Score (urgent en premier)",
          onPress: () => {
            setTriActuel("score");
            const triées = filtrerEtTrier(dettes, recherche, "score");
            setDettes(triées);
          },
        },
        {
          text: "Montant (élevé en premier)",
          onPress: () => {
            setTriActuel("montant");
            const triées = filtrerEtTrier(dettes, recherche, "montant");
            setDettes(triées);
          },
        },
        {
          text: "Date d'échéance",
          onPress: () => {
            setTriActuel("date");
            const triées = filtrerEtTrier(dettes, recherche, "date");
            setDettes(triées);
          },
        },
        { text: "Annuler", style: "cancel" },
      ]
    );
  };

  // ── Ouvrir le détail d'une dette ───────────────────────────
  const ouvrirDetail = (dette) => {
    setDetteSelectionnee(dette);
    setMontantRembours("");
    setModalDetail(true);
  };

  // ── Enregistrer un remboursement ───────────────────────────
  const enregistrerRemboursement = async () => {
    if (!detteSelectionnee) return;

    const montant = parseFloat(montantRembours);
    const montantRestant = detteSelectionnee.montantTotal -
                           detteSelectionnee.montantRembourse;

    if (isNaN(montant) || montant <= 0) {
      Alert.alert("Erreur", "Entrez un montant valide");
      return;
    }
    if (montant > montantRestant) {
      Alert.alert(
        "Erreur",
        `Le montant ne peut pas dépasser ${formatFCFA(montantRestant)}`
      );
      return;
    }

    try {
      // Enregistrer le remboursement
      await DetteDB.enregistrerRemboursement(detteSelectionnee.id, montant);

      // Augmenter le score du client (+5 pour remboursement)
      if (detteSelectionnee.clientId) {
        await ClientDB.incrementerScore(detteSelectionnee.clientId, 5);
      }

      setModalDetail(false);
      await chargerDonnees();

      Alert.alert(
        "✅ Remboursement enregistré !",
        `${formatFCFA(montant)} reçu de ${detteSelectionnee.nomClient}`
      );

    } catch (error) {
      Alert.alert("Erreur", error.message || "Erreur remboursement");
    }
  };

  // ── Solder une dette complètement ─────────────────────────
  const solderDette = async () => {
    if (!detteSelectionnee) return;

    const montantRestant = detteSelectionnee.montantTotal -
                           detteSelectionnee.montantRembourse;

    Alert.alert(
      "Solder la dette",
      `Confirmer le solde de ${formatFCFA(montantRestant)} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Solder",
          onPress: async () => {
            try {
              await DetteDB.solderDette(detteSelectionnee.id);

              // Bonus score client +10 pour solde complet
              if (detteSelectionnee.clientId) {
                await ClientDB.incrementerScore(
                  detteSelectionnee.clientId, 10
                );
              }

              setModalDetail(false);
              await chargerDonnees();
              Alert.alert("✅ Dette soldée !", "Score client amélioré.");

            } catch (error) {
              Alert.alert("Erreur", error.message);
            }
          },
        },
      ]
    );
  };

  // ── Ajouter un nouveau client ──────────────────────────────
  const ajouterClient = async () => {
    if (!nomNvCli.trim() || !telNvCli.trim()) {
      Alert.alert("Erreur", "Nom et téléphone obligatoires");
      return;
    }

    try {
      // Vérifier si existe déjà
      const existant = await ClientDB.getByTelephone(
        telNvCli.trim(), groupeId
      );

      if (existant) {
        Alert.alert("Info", "Ce client existe déjà");
        return;
      }

      await ClientDB.inserer({
        nomClient:    nomNvCli.trim(),
        numeroClient: telNvCli.trim(),
        groupeId,
        utilisateurId: utilisateur?.id || null,
      });

      setNomNvCli("");
      setTelNvCli("");
      setModalAjoutCli(false);
      Alert.alert("✅ Client ajouté !");

    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  // ── Couleurs thème ─────────────────────────────────────────
  const bgCouleur   = darkMode ? COLORS.BG_DARK   : COLORS.BG_LIGHT;
  const textCouleur = darkMode
    ? COLORS.TEXT_PRIMARY_DARK
    : COLORS.TEXT_PRIMARY_LIGHT;
  const cardCouleur = darkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT;

  // ── Rendu d'une dette ──────────────────────────────────────
  const renderDette = ({ item }) => {
    const montantRestant = item.montantTotal - item.montantRembourse;
    const score          = item.score || 100;
    const couleur        = getCouleurScore(score);
    const statut         = getStatutScore(score);
    const enRetard       = estEnRetard(item.dateRemboursement);
    const joursRetard    = getJoursRetard(item.dateRemboursement);

    return (
      <TouchableOpacity
        onPress={() => ouvrirDetail(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.detteCard, { backgroundColor: cardCouleur }]}>

          {/* Bordure gauche colorée selon score */}
          <View style={[styles.bordureGauche, { backgroundColor: couleur }]}/>

          {/* Contenu */}
          <View style={styles.detteContenu}>

            {/* Ligne 1 : Nom + badge statut */}
            <View style={styles.detteHeader}>
              <Text
                style={[styles.detteNom, { color: textCouleur }]}
                numberOfLines={1}
              >
                {item.nomClient}
              </Text>

              {/* Badge statut */}
              <View style={[
                styles.badgeStatut,
                {
                  backgroundColor:
                    statut === "URGENT" ? "#3DEF4444" :
                    statut === "STABLE" ? "#3D22C55E" :
                    "#3DF59E0B",
                }
              ]}>
                <Text style={[
                  styles.badgeStatutTexte,
                  {
                    color:
                      statut === "URGENT" ? COLORS.SCORE_ROUGE :
                      statut === "STABLE" ? COLORS.SCORE_VERT  :
                      COLORS.WARNING,
                  }
                ]}>
                  {statut}
                </Text>
              </View>
            </View>

            {/* Ligne 2 : Date + retard */}
            <Text style={styles.detteDate}>
              {enRetard
                ? `⚠ En retard de ${joursRetard} jour(s)`
                : `Échéance : ${formatDate(item.dateRemboursement)}`
              }
            </Text>

            {/* Ligne 3 : Montant restant */}
            <Text style={[
              styles.detteMontant,
              { color: enRetard ? COLORS.SCORE_ROUGE : COLORS.ORANGE }
            ]}>
              {formatFCFA(montantRestant)}
            </Text>
          </View>

          {/* Score cercle à droite */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabelTexte}>SÉRIEUX</Text>
            <View style={[
              styles.scoreCercle,
              { borderColor: couleur }
            ]}>
              <Text style={[styles.scoreTexte, { color: couleur }]}>
                {score}
              </Text>
            </View>
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  // ── Rendu principal ────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgCouleur }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={bgCouleur}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitre, { color: textCouleur }]}>
          Dettes
        </Text>
        <TouchableOpacity
          style={styles.btnAjouterCli}
          onPress={() => setModalAjoutCli(true)}
        >
          <Text style={styles.btnAjouterCliTexte}>+ Client</Text>
        </TouchableOpacity>
      </View>

      {/* ── Cards statistiques ───────────────────────────────── */}
      <View style={styles.statsRow}>

        {/* Total dettes */}
        <View style={[styles.statCard, { backgroundColor: cardCouleur }]}>
          <Text style={styles.statLabel}>TOTAL DETTES</Text>
          <Text style={[styles.statValeur, { color: COLORS.SCORE_ROUGE }]}>
            {formatFCFA(totalDettes)}
          </Text>
          <Text style={styles.statSub}>
            {nbRetards > 0 ? `${nbRetards} retard(s)` : "Aucun retard"}
          </Text>
        </View>

        {/* Score moyen */}
        <View style={[styles.statCard, { backgroundColor: cardCouleur }]}>
          <Text style={styles.statLabel}>SÉRIEUX MOYEN</Text>
          <Text style={[
            styles.statValeur,
            { color: getCouleurScore(scoreMoyen) }
          ]}>
            {scoreMoyen}%
          </Text>
          <Text style={styles.statSub}>Score clients</Text>
        </View>

      </View>

      {/* ── Barre recherche + tri ────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={[
          styles.searchBar,
          { backgroundColor: darkMode
              ? COLORS.SURFACE_DARK
              : COLORS.BG_CARD_LIGHT }
        ]}>
          <Text style={styles.searchIcone}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: textCouleur }]}
            placeholder="Rechercher un client..."
            placeholderTextColor={
              darkMode
                ? COLORS.TEXT_SECONDARY_DARK
                : COLORS.TEXT_SECONDARY_LIGHT
            }
            value={recherche}
            onChangeText={handleRecherche}
          />
        </View>

        {/* Bouton tri */}
        <TouchableOpacity
          style={[
            styles.btnTri,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.BG_CARD_LIGHT }
          ]}
          onPress={afficherDialogTri}
        >
          <Text style={{ color: textCouleur, fontSize: 13 }}>≡ Trier</Text>
        </TouchableOpacity>
      </View>

      {/* ── Titre section ────────────────────────────────────── */}
      <View style={styles.titreSectionRow}>
        <Text style={[styles.titreSection, { color: textCouleur }]}>
          Clients Débiteurs
        </Text>
        <Text style={styles.nombreDettes}>
          ({dettes.length})
        </Text>
      </View>

      {/* ── Liste dettes ─────────────────────────────────────── */}
      <FlatList
        data={dettes}
        renderItem={renderDette}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.liste}
        refreshControl={
          <RefreshControl
            refreshing={chargement}
            onRefresh={chargerDonnees}
            colors={[COLORS.ORANGE]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vide}>
            <Text style={styles.videIcone}>📋</Text>
            <Text style={[styles.videTexte, { color: textCouleur }]}>
              Aucune dette active
            </Text>
            <Text style={styles.videSubTexte}>
              Les ventes à crédit apparaîtront ici
            </Text>
          </View>
        }
      />

      {/* ── Modal détail dette ───────────────────────────────── */}
      <Modal
        visible={modalDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.SURFACE_LIGHT }
          ]}>
            {detteSelectionnee && (
              <>
                {/* Titre */}
                <Text style={[styles.modalTitre, { color: textCouleur }]}>
                  {detteSelectionnee.nomClient}
                </Text>

                {/* Infos client */}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Téléphone :</Text>
                  <Text style={[styles.modalInfoValeur, { color: textCouleur }]}>
                    {detteSelectionnee.numeroClient}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Montant total :</Text>
                  <Text style={[styles.modalInfoValeur, { color: textCouleur }]}>
                    {formatFCFA(detteSelectionnee.montantTotal)}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Déjà remboursé :</Text>
                  <Text style={[styles.modalInfoValeur, { color: COLORS.SCORE_VERT }]}>
                    {formatFCFA(detteSelectionnee.montantRembourse)}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Reste à payer :</Text>
                  <Text style={[styles.modalInfoValeur, { color: COLORS.SCORE_ROUGE }]}>
                    {formatFCFA(
                      detteSelectionnee.montantTotal -
                      detteSelectionnee.montantRembourse
                    )}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Échéance :</Text>
                  <Text style={[
                    styles.modalInfoValeur,
                    {
                      color: estEnRetard(detteSelectionnee.dateRemboursement)
                        ? COLORS.SCORE_ROUGE
                        : textCouleur
                    }
                  ]}>
                    {formatDate(detteSelectionnee.dateRemboursement)}
                    {estEnRetard(detteSelectionnee.dateRemboursement) &&
                      ` (${getJoursRetard(detteSelectionnee.dateRemboursement)} j de retard)`
                    }
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Score :</Text>
                  <Text style={[
                    styles.modalInfoValeur,
                    { color: getCouleurScore(detteSelectionnee.score || 100) }
                  ]}>
                    {detteSelectionnee.score || 100}/100
                  </Text>
                </View>

                {/* Champ remboursement */}
                <Input
                  label="Montant reçu (FCFA)"
                  placeholder="Ex: 5000"
                  valeur={montantRembours}
                  onChange={setMontantRembours}
                  typeClavier="numeric"
                  dark={darkMode}
                  style={{ marginTop: 16 }}
                />

                {/* Boutons */}
                <Button
                  titre="Enregistrer remboursement"
                  onPress={enregistrerRemboursement}
                  style={{ marginBottom: 10 }}
                />

                <Button
                  titre="Solder la dette (100%)"
                  variante="secondary"
                  onPress={solderDette}
                  style={{ marginBottom: 10 }}
                />

                <Button
                  titre="Fermer"
                  variante="dark"
                  onPress={() => setModalDetail(false)}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal ajouter client ─────────────────────────────── */}
      <Modal
        visible={modalAjoutCli}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalAjoutCli(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.SURFACE_LIGHT }
          ]}>
            <Text style={[styles.modalTitre, { color: textCouleur }]}>
              Nouveau client
            </Text>

            <Input
              label="Nom du client"
              placeholder="Ex: Moussa Diallo"
              valeur={nomNvCli}
              onChange={setNomNvCli}
              dark={darkMode}
            />

            <Input
              label="Téléphone"
              placeholder="+237 6XX XXX XXX"
              valeur={telNvCli}
              onChange={setTelNvCli}
              typeClavier="phone-pad"
              dark={darkMode}
              autoCapitalize="none"
            />

            <Button
              titre="Ajouter le client"
              onPress={ajouterClient}
              style={{ marginBottom: 10 }}
            />
            <Button
              titre="Annuler"
              variante="secondary"
              onPress={() => setModalAjoutCli(false)}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },

  headerTitre: {
    fontSize:   20,
    fontWeight: "800",
  },

  btnAjouterCli: {
    backgroundColor: COLORS.ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius:    10,
  },

  btnAjouterCliTexte: {
    color:      COLORS.WHITE,
    fontSize:   13,
    fontWeight: "700",
  },

  // ── Stats ─────────────────────────────────────────────────
  statsRow: {
    flexDirection:   "row",
    paddingHorizontal: 16,
    gap:             12,
    marginBottom:    12,
  },

  statCard: {
    flex:         1,
    borderRadius: 14,
    padding:      14,
    shadowColor:  "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation:    2,
  },

  statLabel: {
    fontSize:     10,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  statValeur: {
    fontSize:   20,
    fontWeight: "800",
    marginBottom: 2,
  },

  statSub: {
    fontSize: 11,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  // ── Recherche ──────────────────────────────────────────────
  searchRow: {
    flexDirection:   "row",
    paddingHorizontal: 16,
    marginBottom:    8,
    gap:             8,
  },

  searchBar: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   12,
    paddingHorizontal: 12,
    height:         44,
  },

  searchIcone: {
    fontSize:    14,
    marginRight: 8,
  },

  searchInput: {
    flex:     1,
    fontSize: 14,
    height:   "100%",
  },

  btnTri: {
    height:         44,
    paddingHorizontal: 14,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },

  // ── Titre section ─────────────────────────────────────────
  titreSectionRow: {
    flexDirection: "row",
    alignItems:    "center",
    paddingHorizontal: 16,
    marginBottom:  8,
    gap:           6,
  },

  titreSection: {
    fontSize:   18,
    fontWeight: "800",
  },

  nombreDettes: {
    fontSize: 14,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  // ── Liste ─────────────────────────────────────────────────
  liste: {
    paddingHorizontal: 16,
    paddingBottom:     100,
  },

  // ── Carte dette ───────────────────────────────────────────
  detteCard: {
    flexDirection: "row",
    borderRadius:  14,
    marginBottom:  10,
    overflow:      "hidden",
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  // Bordure colorée gauche
  bordureGauche: {
    width: 4,
  },

  // Contenu de la carte
  detteContenu: {
    flex:    1,
    padding: 14,
  },

  detteHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   4,
  },

  detteNom: {
    flex:       1,
    fontSize:   16,
    fontWeight: "700",
    marginRight: 8,
  },

  badgeStatut: {
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      20,
  },

  badgeStatutTexte: {
    fontSize:   11,
    fontWeight: "700",
  },

  detteDate: {
    fontSize:    12,
    color:       COLORS.TEXT_SECONDARY_LIGHT,
    marginBottom: 4,
  },

  detteMontant: {
    fontSize:   18,
    fontWeight: "800",
  },

  // Score cercle
  scoreContainer: {
    alignItems:     "center",
    justifyContent: "center",
    paddingRight:   14,
    paddingTop:     14,
  },

  scoreLabelTexte: {
    fontSize:     9,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  scoreCercle: {
    width:          48,
    height:         48,
    borderRadius:   24,
    borderWidth:    2,
    alignItems:     "center",
    justifyContent: "center",
  },

  scoreTexte: {
    fontSize:   16,
    fontWeight: "800",
  },

  // ── Vide ──────────────────────────────────────────────────
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

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent:  "flex-end",
  },

  modalContainer: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:              24,
    maxHeight:            "85%",
  },

  modalTitre: {
    fontSize:     18,
    fontWeight:   "800",
    marginBottom: 16,
  },

  modalInfoRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },

  modalInfoLabel: {
    fontSize: 13,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  modalInfoValeur: {
    fontSize:   13,
    fontWeight: "600",
  },
});

export default DettesScreen;