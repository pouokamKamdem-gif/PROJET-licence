/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PROFILSCREEN.JS                                             ║
 * ║                                                              ║
 * ║  Écran Dashboard / Profil Hardoize.                          ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Chiffre d'affaires total                                  ║
 * ║  - Bénéfice net et dettes totales                            ║
 * ║  - Graphique performance hebdomadaire                        ║
 * ║  - Top produits par profit                                   ║
 * ║  - Informations du profil utilisateur                        ║
 * ║  - Toggle mode sombre                                        ║
 * ║  - Déconnexion                                               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  Switch,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";

import useStore  from "../../store/useStore";
import { COLORS } from "../../utils/constants";
import { formatFCFA, formatRole } from "../../utils/helpers";
import { VenteDB, DetteDB, ProduitDB } from "../../services/database";
import { deconnecter } from "../../services/authService";
import Button from "../../components/common/Button";

const { width } = Dimensions.get("window");

const ProfilScreen = () => {
  // ── Store ──────────────────────────────────────────────────
  const utilisateur  = useStore((s) => s.utilisateur);
  const groupeActif  = useStore((s) => s.groupeActif);
  const darkMode     = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const logout       = useStore((s) => s.logout);
  const groupeId     = groupeActif?.id || 0;

  // ── État local ─────────────────────────────────────────────
  const [chargement,    setChargement]    = useState(false);
  const [statsJour,     setStatsJour]     = useState({
    total: 0, especes: 0, credit: 0, nbVentes: 0,
  });
  const [statsSemaine,  setStatsSemaine]  = useState({
    total: 0, benefice: 0,
  });
  const [totalDettes,   setTotalDettes]   = useState(0);
  const [topProduits,   setTopProduits]   = useState([]);
  const [donneesGraph,  setDonneesGraph]  = useState([0, 0, 0, 0, 0, 0, 0]);

  // ── Charger stats au focus ─────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      chargerStats();
    }, [groupeId])
  );

  // ── Charger toutes les statistiques ───────────────────────
  const chargerStats = async () => {
    try {
      setChargement(true);

      const maintenant = Date.now();

      // Début du jour
      const debutJour = new Date();
      debutJour.setHours(0, 0, 0, 0);
      const tsDebutJour = debutJour.getTime();

      // Début de la semaine (lundi)
      const debutSemaine = new Date();
      debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay() + 1);
      debutSemaine.setHours(0, 0, 0, 0);
      const tsDebutSemaine = debutSemaine.getTime();

      // ─ Stats du jour ───────────────────────────────────────
      const statsJ = await VenteDB.getTotalPeriode(
        groupeId, tsDebutJour, maintenant
      );
      setStatsJour(statsJ);

      // ─ Stats de la semaine ─────────────────────────────────
      const statsS = await VenteDB.getTotalPeriode(
        groupeId, tsDebutSemaine, maintenant
      );
      setStatsSemaine({
        total:   statsS.total || 0,
        benefice: statsS.total || 0, // simplifié (sans coût achat)
      });

      // ─ Total dettes ────────────────────────────────────────
      const dettes = await DetteDB.getTotalActif(groupeId);
      setTotalDettes(dettes || 0);

      // ─ Graphique semaine (7 jours) ─────────────────────────
      const donnees = await chargerDonneesGraph(groupeId);
      setDonneesGraph(donnees);

      // ─ Top produits ────────────────────────────────────────
      const produits = await ProduitDB.getByGroupe(groupeId);
      // Trier par marge (prixVente - prixAchat) décroissant
      const sorted = produits
        .sort((a, b) =>
          (b.prixVente - b.prixAchat) - (a.prixVente - a.prixAchat)
        )
        .slice(0, 5);
      setTopProduits(sorted);

    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setChargement(false);
    }
  };

  // ── Charger données graphique semaine ─────────────────────
  const chargerDonneesGraph = async (gId) => {
    const donnees = [];
    for (let i = 6; i >= 0; i--) {
      const debut = new Date();
      debut.setDate(debut.getDate() - i);
      debut.setHours(0, 0, 0, 0);

      const fin = new Date(debut);
      fin.setHours(23, 59, 59, 999);

      const stats = await VenteDB.getTotalPeriode(
        gId, debut.getTime(), fin.getTime()
      );
      donnees.push(stats.total || 0);
    }
    return donnees;
  };

  // ── Déconnexion ───────────────────────────────────────────
  const handleDeconnexion = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              await deconnecter();
              logout(); // Réinitialiser le store
            } catch (error) {
              logout(); // Déconnecter quand même localement
            }
          },
        },
      ]
    );
  };

  // ── Couleurs thème ─────────────────────────────────────────
  const bgCouleur   = darkMode ? COLORS.BG_DARK   : COLORS.BG_LIGHT;
  const textCouleur = darkMode
    ? COLORS.TEXT_PRIMARY_DARK
    : COLORS.TEXT_PRIMARY_LIGHT;
  const cardCouleur = darkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT;

  // ── Config graphique ───────────────────────────────────────
  const chartConfig = {
    backgroundColor:      cardCouleur,
    backgroundGradientFrom: cardCouleur,
    backgroundGradientTo:   cardCouleur,
    decimalPlaces:        0,
    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
    labelColor: () => darkMode
      ? COLORS.TEXT_SECONDARY_DARK
      : COLORS.TEXT_SECONDARY_LIGHT,
    strokeWidth:   2,
    propsForDots: {
      r:           4,
      strokeWidth: 2,
      stroke:      COLORS.ORANGE,
    },
  };

  const labelsGraph = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // ── Rendu principal ────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgCouleur }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={bgCouleur}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={chargement}
            onRefresh={chargerStats}
            colors={[COLORS.ORANGE]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header profil ────────────────────────────────── */}
        <View style={styles.header}>
          {/* Avatar utilisateur */}
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>
              {utilisateur?.nom?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerNom, { color: textCouleur }]}>
              {utilisateur?.nom || "Utilisateur"}
            </Text>
            <Text style={styles.headerRole}>
              {formatRole(utilisateur?.role || "vendeur")}
            </Text>
            <Text style={styles.headerTel}>
              {utilisateur?.telephone}
            </Text>
          </View>

          {/* Toggle dark mode */}
          <View style={styles.darkModeToggle}>
            <Text style={{ fontSize: 16 }}>
              {darkMode ? "🌙" : "☀️"}
            </Text>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.ORANGE }}
              thumbColor={COLORS.WHITE}
            />
          </View>
        </View>

        {/* ── Card chiffre d'affaires total ─────────────────── */}
        <View style={[styles.caCard, { backgroundColor: cardCouleur }]}>
          <Text style={styles.caLabel}>CHIFFRE D'AFFAIRES TOTAL</Text>
          <Text style={styles.caValeur}>
            {formatFCFA(statsSemaine.total)}
          </Text>
          <Text style={styles.caSub}>
            {statsJour.total > 0
              ? `+${formatFCFA(statsJour.total)} aujourd'hui`
              : "Aucune vente aujourd'hui"}
          </Text>
        </View>

        {/* ── Cards bénéfice + dettes ───────────────────────── */}
        <View style={styles.statsRow}>
          {/* Bénéfice net */}
          <View style={[styles.statCard, { backgroundColor: cardCouleur }]}>
            <Text style={styles.statLabel}>BÉNÉFICE NET</Text>
            <Text style={[styles.statValeur, { color: COLORS.SCORE_VERT }]}>
              {formatFCFA(statsSemaine.benefice)}
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: "70%",
                  backgroundColor: COLORS.SCORE_VERT,
                }
              ]}/>
            </View>
          </View>

          {/* Dettes totales */}
          <View style={[
            styles.statCard,
            { backgroundColor: cardCouleur },
            totalDettes > 0 && styles.statCardDanger,
          ]}>
            <Text style={styles.statLabel}>DETTES TOTALES</Text>
            <Text style={[styles.statValeur, { color: COLORS.SCORE_ROUGE }]}>
              {formatFCFA(totalDettes)}
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: "30%",
                  backgroundColor: COLORS.SCORE_ROUGE,
                }
              ]}/>
            </View>
          </View>
        </View>

        {/* ── Graphique performance hebdomadaire ────────────── */}
        <View style={[styles.graphCard, { backgroundColor: cardCouleur }]}>
          <View style={styles.graphHeader}>
            <Text style={[styles.graphTitre, { color: textCouleur }]}>
              Performance Hebdomadaire
            </Text>
            <Text style={styles.graphDetails}>Détails ›</Text>
          </View>

          <LineChart
            data={{
              labels:   labelsGraph,
              datasets: [{ data: donneesGraph.length > 0 ? donneesGraph : [0] }],
            }}
            width={width - 64}
            height={160}
            chartConfig={chartConfig}
            bezier
            style={styles.graphStyle}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>

        {/* ── Top produits ──────────────────────────────────── */}
        {topProduits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitre, { color: textCouleur }]}>
                Top Produits
              </Text>
              <Text style={styles.sectionSub}>Profit / Stock</Text>
            </View>

            {topProduits.map((produit, index) => (
              <View
                key={produit.id}
                style={[styles.topProduitItem, { backgroundColor: cardCouleur }]}
              >
                {/* Rang */}
                <Text style={styles.topRang}>#{index + 1}</Text>

                {/* Icône */}
                <View style={styles.topIcone}>
                  <Text style={{ fontSize: 20 }}>🛒</Text>
                </View>

                {/* Infos */}
                <View style={styles.topInfo}>
                  <Text
                    style={[styles.topNom, { color: textCouleur }]}
                    numberOfLines={1}
                  >
                    {produit.nom}
                  </Text>
                  <Text style={styles.topMarge}>
                    +{formatFCFA(produit.prixVente - produit.prixAchat)} / unité
                  </Text>
                </View>

                {/* Stock */}
                <View style={styles.topDroite}>
                  <Text style={[styles.topStock, { color: textCouleur }]}>
                    {produit.quantiteStock} pcs
                  </Text>
                  <Text style={[
                    styles.topStockStatut,
                    {
                      color: produit.quantiteStock > produit.stockMinimum
                        ? COLORS.SCORE_VERT
                        : COLORS.SCORE_ROUGE,
                    }
                  ]}>
                    {produit.quantiteStock > produit.stockMinimum
                      ? "Stock Sain"
                      : "Réapprovisionner"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Stats du jour ─────────────────────────────────── */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitre, { color: textCouleur }]}>
            Aujourd'hui
          </Text>

          <View style={styles.statsJourRow}>
            <View style={[styles.statJourCard, { backgroundColor: cardCouleur }]}>
              <Text style={styles.statJourLabel}>Total</Text>
              <Text style={[styles.statJourValeur, { color: COLORS.ORANGE }]}>
                {formatFCFA(statsJour.total)}
              </Text>
            </View>

            <View style={[styles.statJourCard, { backgroundColor: cardCouleur }]}>
              <Text style={styles.statJourLabel}>Espèces</Text>
              <Text style={[styles.statJourValeur, { color: COLORS.SCORE_VERT }]}>
                {formatFCFA(statsJour.totalEspeces)}
              </Text>
            </View>

            <View style={[styles.statJourCard, { backgroundColor: cardCouleur }]}>
              <Text style={styles.statJourLabel}>Crédit</Text>
              <Text style={[styles.statJourValeur, { color: COLORS.SCORE_ROUGE }]}>
                {formatFCFA(statsJour.totalCredit)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Bouton déconnexion ───────────────────────────── */}
        <View style={styles.deconnexionSection}>
          <Button
            titre="Se déconnecter"
            variante="danger"
            onPress={handleDeconnexion}
          />
        </View>

        {/* Espace bas */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    paddingHorizontal: 16,
    paddingTop:        16,
  },

  // ── Header profil ─────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems:    "center",
    marginBottom:  20,
  },

  avatar: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: COLORS.ORANGE,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     14,
  },

  avatarTexte: {
    fontSize:   24,
    fontWeight: "900",
    color:      COLORS.WHITE,
  },

  headerInfo: { flex: 1 },

  headerNom: {
    fontSize:   17,
    fontWeight: "800",
  },

  headerRole: {
    fontSize:  13,
    color:     COLORS.ORANGE,
    marginTop: 2,
  },

  headerTel: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    marginTop: 2,
  },

  darkModeToggle: {
    alignItems: "center",
    gap:        4,
  },

  // ── Card CA ───────────────────────────────────────────────
  caCard: {
    borderRadius:  16,
    padding:       20,
    marginBottom:  12,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  caLabel: {
    fontSize:     10,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  caValeur: {
    fontSize:     32,
    fontWeight:   "900",
    color:        COLORS.ORANGE,
    marginBottom: 6,
  },

  caSub: {
    fontSize: 12,
    color:    COLORS.SCORE_VERT,
  },

  // ── Stats Row ─────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap:           12,
    marginBottom:  12,
  },

  statCard: {
    flex:          1,
    borderRadius:  14,
    padding:       14,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  statCardDanger: {
    borderWidth: 1.5,
    borderColor: COLORS.SCORE_ROUGE,
  },

  statLabel: {
    fontSize:     9,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  statValeur: {
    fontSize:     20,
    fontWeight:   "800",
    marginBottom: 8,
  },

  progressBar: {
    height:          4,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius:    2,
    overflow:        "hidden",
  },

  progressFill: {
    height:       4,
    borderRadius: 2,
  },

  // ── Graphique ─────────────────────────────────────────────
  graphCard: {
    borderRadius:  16,
    padding:       16,
    marginBottom:  16,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  graphHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   12,
  },

  graphTitre: {
    fontSize:   15,
    fontWeight: "700",
  },

  graphDetails: {
    fontSize: 13,
    color:    COLORS.ORANGE,
  },

  graphStyle: {
    borderRadius: 12,
    marginLeft:   -16,
  },

  // ── Section ───────────────────────────────────────────────
  section: {
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   10,
  },

  sectionTitre: {
    fontSize:     16,
    fontWeight:   "800",
    marginBottom: 10,
  },

  sectionSub: {
    fontSize: 13,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  // ── Top produits ──────────────────────────────────────────
  topProduitItem: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    padding:       12,
    marginBottom:  8,
  },

  topRang: {
    fontSize:   12,
    fontWeight: "700",
    color:      COLORS.ORANGE,
    width:      24,
  },

  topIcone: {
    width:           40,
    height:          40,
    borderRadius:    10,
    backgroundColor: COLORS.BG_CARD_LIGHT,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     12,
    overflow:        "hidden",
  },

  topInfo: { flex: 1 },

  topNom: {
    fontSize:   14,
    fontWeight: "700",
  },

  topMarge: {
    fontSize:  12,
    color:     COLORS.ORANGE,
    marginTop: 2,
  },

  topDroite: {
    alignItems: "flex-end",
  },

  topStock: {
    fontSize:   13,
    fontWeight: "700",
  },

  topStockStatut: {
    fontSize:  11,
    marginTop: 2,
  },

  // ── Stats jour ────────────────────────────────────────────
  statsJourRow: {
    flexDirection: "row",
    gap:           8,
  },

  statJourCard: {
    flex:          1,
    borderRadius:  12,
    padding:       12,
    alignItems:    "center",
  },

  statJourLabel: {
    fontSize:     10,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    marginBottom: 4,
  },

  statJourValeur: {
    fontSize:   13,
    fontWeight: "800",
  },

  // ── Déconnexion ───────────────────────────────────────────
  deconnexionSection: {
    marginTop:    8,
    marginBottom: 16,
  },
});

export default ProfilScreen;