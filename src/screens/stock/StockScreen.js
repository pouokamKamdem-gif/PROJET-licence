/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  STOCKSCREEN.JS                                              ║
 * ║                                                              ║
 * ║  Écran de gestion du stock.                                  ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - 3 onglets : Produits | Mouvements | Alertes               ║
 * ║  - Ajout produit avec photo depuis galerie                   ║
 * ║  - Modification et désactivation produit                     ║
 * ║  - Entrée de stock manuelle                                  ║
 * ║  - Historique mouvements entrées/sorties                     ║
 * ║  - Alertes stock faible ou épuisé                            ║
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
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import useStore  from "../../store/useStore";
import { COLORS, MOUVEMENT, MOTIF_MOUVEMENT } from "../../utils/constants";
import { formatFCFA, formatDateHeure } from "../../utils/helpers";
import { ProduitDB, MouvementDB } from "../../services/database";
import Button from "../../components/common/Button";
import Input  from "../../components/common/Input";

const { width } = Dimensions.get("window");

const StockScreen = () => {
  // ── Store ──────────────────────────────────────────────────
  const utilisateur = useStore((s) => s.utilisateur);
  const groupeActif = useStore((s) => s.groupeActif);
  const darkMode    = useStore((s) => s.darkMode);
  const groupeId    = groupeActif?.id || 0;

  // ── État local ─────────────────────────────────────────────
  const [ongletActif,    setOngletActif]    = useState("produits");
  const [produits,       setProduits]       = useState([]);
  const [mouvements,     setMouvements]     = useState([]);
  const [alertes,        setAlertes]        = useState([]);
  const [recherche,      setRecherche]      = useState("");
  const [chargement,     setChargement]     = useState(false);

  // ── Modal ajout/modification produit ──────────────────────
  const [modalProduit,   setModalProduit]   = useState(false);
  const [produitEdite,   setProduitEdite]   = useState(null);
  const [nomProduit,     setNomProduit]     = useState("");
  const [categorie,      setCategorie]      = useState("");
  const [prixAchat,      setPrixAchat]      = useState("");
  const [prixVente,      setPrixVente]      = useState("");
  const [quantite,       setQuantite]       = useState("");
  const [stockMin,       setStockMin]       = useState("5");
  const [photoUri,       setPhotoUri]       = useState(null);

  // ── Modal entrée stock ─────────────────────────────────────
  const [modalEntree,    setModalEntree]    = useState(false);
  const [produitEntree,  setProduitEntree]  = useState(null);
  const [qteEntree,      setQteEntree]      = useState("");
  const [prixEntree,     setPrixEntree]     = useState("");

  // ── Charger données au focus ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      chargerDonnees();
    }, [groupeId, ongletActif])
  );

  // ── Charger toutes les données ─────────────────────────────
  const chargerDonnees = async () => {
    try {
      setChargement(true);
      const [listeProduits, listeMouvements, listeAlertes] =
        await Promise.all([
          ProduitDB.getByGroupe(groupeId),
          MouvementDB.getByGroupe(groupeId),
          ProduitDB.getStockFaible(groupeId),
        ]);
      setProduits(listeProduits);
      setMouvements(listeMouvements);
      setAlertes(listeAlertes);
    } catch (error) {
      console.error("Erreur chargement stock:", error);
    } finally {
      setChargement(false);
    }
  };

  // ── Recherche produits ─────────────────────────────────────
  const handleRecherche = async (texte) => {
    setRecherche(texte);
    try {
      const liste = texte.trim()
        ? await ProduitDB.rechercher(groupeId, texte.trim())
        : await ProduitDB.getByGroupe(groupeId);
      setProduits(liste);
    } catch (error) {
      console.error("Erreur recherche:", error);
    }
  };

  // ── Ouvrir modal ajout produit ─────────────────────────────
  const ouvrirAjoutProduit = (produit = null) => {
    setProduitEdite(produit);
    if (produit) {
      // Mode modification : pré-remplir
      setNomProduit(produit.nom);
      setCategorie(produit.categorie || "");
      setPrixAchat(produit.prixAchat.toString());
      setPrixVente(produit.prixVente.toString());
      setQuantite(produit.quantiteStock.toString());
      setStockMin(produit.stockMinimum.toString());
      setPhotoUri(produit.photoUri || null);
    } else {
      // Mode création : reset
      setNomProduit("");
      setCategorie("");
      setPrixAchat("");
      setPrixVente("");
      setQuantite("");
      setStockMin("5");
      setPhotoUri(null);
    }
    setModalProduit(true);
  };

  // ── Choisir photo depuis galerie ───────────────────────────
  const choisirPhoto = async () => {
    try {
      // Demander permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Autorisez l'accès à la galerie dans les paramètres."
        );
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'accéder à la galerie");
    }
  };

  // ── Enregistrer un produit ─────────────────────────────────
  const enregistrerProduit = async () => {
    // Validation
    if (!nomProduit.trim()) {
      Alert.alert("Erreur", "Le nom du produit est obligatoire");
      return;
    }
    if (!prixVente || parseFloat(prixVente) <= 0) {
      Alert.alert("Erreur", "Le prix de vente est obligatoire");
      return;
    }
    if (!quantite || parseInt(quantite) < 0) {
      Alert.alert("Erreur", "La quantité est obligatoire");
      return;
    }

    try {
      const donnees = {
        nom:          nomProduit.trim(),
        categorie:    categorie.trim() || null,
        prixAchat:    parseFloat(prixAchat)  || 0,
        prixVente:    parseFloat(prixVente),
        quantiteStock: parseInt(quantite),
        stockMinimum: parseInt(stockMin) || 5,
        photoUri:     photoUri || null,
        groupeId,
      };

      if (produitEdite) {
        // Modification
        await ProduitDB.mettreAJour(produitEdite.id, donnees);
        Alert.alert("✅", "Produit modifié !");
      } else {
        // Création
        const produitId = await ProduitDB.inserer(donnees);

        // Enregistrer entrée stock initiale
        await MouvementDB.inserer({
          produitId,
          nomProduit:   nomProduit.trim(),
          type:         MOUVEMENT.ENTREE,
          motif:        MOTIF_MOUVEMENT.INVENTAIRE,
          quantite:     parseInt(quantite),
          prixUnitaire: parseFloat(prixAchat) || 0,
          montantTotal: (parseFloat(prixAchat) || 0) * parseInt(quantite),
          utilisateurId: utilisateur?.id || null,
          groupeId,
        });

        Alert.alert("✅", `${nomProduit} ajouté au stock !`);
      }

      setModalProduit(false);
      await chargerDonnees();

    } catch (error) {
      Alert.alert("Erreur", error.message || "Erreur lors de l'enregistrement");
    }
  };

  // ── Ouvrir modal entrée stock ──────────────────────────────
  const ouvrirEntreeStock = (produit) => {
    setProduitEntree(produit);
    setQteEntree("");
    setPrixEntree(produit.prixAchat.toString());
    setModalEntree(true);
  };

  // ── Enregistrer entrée stock ───────────────────────────────
  const enregistrerEntreeStock = async () => {
    const qte  = parseInt(qteEntree);
    const prix = parseFloat(prixEntree) || 0;

    if (isNaN(qte) || qte <= 0) {
      Alert.alert("Erreur", "Entrez une quantité valide");
      return;
    }

    try {
      // Incrémenter stock
      await ProduitDB.incrementerStock(produitEntree.id, qte);

      // Enregistrer mouvement entrée
      await MouvementDB.inserer({
        produitId:    produitEntree.id,
        nomProduit:   produitEntree.nom,
        type:         MOUVEMENT.ENTREE,
        motif:        MOTIF_MOUVEMENT.ACHAT,
        quantite:     qte,
        prixUnitaire: prix,
        montantTotal: prix * qte,
        utilisateurId: utilisateur?.id || null,
        groupeId,
      });

      setModalEntree(false);
      await chargerDonnees();

      Alert.alert(
        "✅ Stock mis à jour !",
        `${qte} unité(s) de ${produitEntree.nom} ajoutées.`
      );

    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  // ── Désactiver / réactiver un produit ─────────────────────
  const toggleActivation = (produit) => {
    Alert.alert(
      produit.estActif ? "Désactiver" : "Réactiver",
      `${produit.estActif ? "Désactiver" : "Réactiver"} ${produit.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            await ProduitDB.setActif(produit.id, !produit.estActif);
            await chargerDonnees();
            Alert.alert(
              "✅",
              `${produit.nom} ${produit.estActif ? "désactivé" : "réactivé"}`
            );
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

  // ── Rendu d'un produit ─────────────────────────────────────
  const renderProduit = ({ item }) => {
    const couleurStock =
      item.quantiteStock <= 0
        ? COLORS.SCORE_ROUGE
        : item.quantiteStock <= item.stockMinimum
        ? COLORS.SCORE_ORANGE
        : COLORS.SCORE_VERT;

    return (
      <TouchableOpacity
        style={[styles.produitItem, { backgroundColor: cardCouleur }]}
        onPress={() => {
          Alert.alert(
            item.nom,
            `Prix achat : ${formatFCFA(item.prixAchat)}\n` +
            `Prix vente : ${formatFCFA(item.prixVente)}\n` +
            `Stock : ${item.quantiteStock} pcs\n` +
            `Stock min : ${item.stockMinimum} pcs\n` +
            `Marge : ${formatFCFA(item.prixVente - item.prixAchat)}`,
            [
              { text: "Modifier",      onPress: () => ouvrirAjoutProduit(item) },
              { text: "Entrée stock",  onPress: () => ouvrirEntreeStock(item) },
              {
                text: item.estActif ? "Désactiver" : "Réactiver",
                onPress: () => toggleActivation(item),
              },
              { text: "Fermer", style: "cancel" },
            ]
          );
        }}
        activeOpacity={0.85}
      >
        {/* Photo ou icône par défaut */}
        <View style={styles.produitPhoto}>
          {item.photoUri ? (
            <Image
              source={{ uri: item.photoUri }}
              style={styles.produitImage}
            />
          ) : (
            <Text style={styles.produitIconeTexte}>🛒</Text>
          )}
        </View>

        {/* Infos produit */}
        <View style={styles.produitInfo}>
          <Text
            style={[styles.produitNom, { color: textCouleur }]}
            numberOfLines={1}
          >
            {item.nom}
          </Text>
          <Text style={styles.produitCategorie}>
            {item.categorie || "Sans catégorie"}
          </Text>
          <View style={styles.produitPrixRow}>
            <Text style={styles.produitPrixAchat}>
              {formatFCFA(item.prixAchat)}
            </Text>
            <Text style={styles.produitPrixFleche}> → </Text>
            <Text style={styles.produitPrixVente}>
              {formatFCFA(item.prixVente)}
            </Text>
          </View>
        </View>

        {/* Quantité stock */}
        <View style={styles.produitStockContainer}>
          <Text style={[styles.produitStockQte, { color: couleurStock }]}>
            {item.quantiteStock}
          </Text>
          <Text style={styles.produitStockLabel}>pcs</Text>
          {item.quantiteStock <= item.stockMinimum && (
            <View style={styles.badgeFaible}>
              <Text style={styles.badgeFaibleTexte}>
                {item.quantiteStock <= 0 ? "Épuisé" : "Faible"}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Rendu d'un mouvement stock ─────────────────────────────
  const renderMouvement = ({ item }) => {
    const estEntree = item.type === MOUVEMENT.ENTREE;

    return (
      <View style={[styles.mouvementItem, { backgroundColor: cardCouleur }]}>
        {/* Icône direction */}
        <View style={[
          styles.mouvementIcone,
          { backgroundColor: estEntree
              ? "#3D22C55E"
              : "#3DEF4444" }
        ]}>
          <Text style={styles.mouvementFleche}>
            {estEntree ? "↑" : "↓"}
          </Text>
        </View>

        {/* Infos mouvement */}
        <View style={styles.mouvementInfo}>
          <Text
            style={[styles.mouvementNom, { color: textCouleur }]}
            numberOfLines={1}
          >
            {item.nomProduit}
          </Text>
          <Text style={styles.mouvementMotif}>
            {item.motif || item.type}
          </Text>
          <Text style={styles.mouvementDate}>
            {formatDateHeure(item.createdAt)}
          </Text>
        </View>

        {/* Quantité + montant */}
        <View style={styles.mouvementDroite}>
          <Text style={[
            styles.mouvementQte,
            { color: estEntree ? COLORS.SCORE_VERT : COLORS.SCORE_ROUGE }
          ]}>
            {estEntree ? "+" : "-"}{item.quantite}
          </Text>
          <Text style={styles.mouvementMontant}>
            {formatFCFA(item.montantTotal)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Rendu d'une alerte stock ───────────────────────────────
  const renderAlerte = ({ item }) => {
    const epuise = item.quantiteStock <= 0;
    return (
      <TouchableOpacity
        style={[styles.alerteItem, { backgroundColor: cardCouleur }]}
        onPress={() => ouvrirEntreeStock(item)}
        activeOpacity={0.85}
      >
        <View style={[
          styles.alerteIndicateur,
          { backgroundColor: epuise ? COLORS.SCORE_ROUGE : COLORS.SCORE_ORANGE }
        ]}/>
        <View style={styles.alerteInfo}>
          <Text style={[styles.alerteNom, { color: textCouleur }]}>
            {item.nom}
          </Text>
          <Text style={styles.alerteSub}>
            {epuise
              ? "Stock épuisé !"
              : `Stock faible : ${item.quantiteStock}/${item.stockMinimum} pcs`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.alerteBtnEntree}
          onPress={() => ouvrirEntreeStock(item)}
        >
          <Text style={styles.alerteBtnTexte}>+ Stock</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Données selon l'onglet actif ───────────────────────────
  const donneesOnglet = () => {
    switch (ongletActif) {
      case "mouvements": return mouvements;
      case "alertes":    return alertes;
      default:           return produits;
    }
  };

  const renderOnglet = ({ item }) => {
    switch (ongletActif) {
      case "mouvements": return renderMouvement({ item });
      case "alertes":    return renderAlerte({ item });
      default:           return renderProduit({ item });
    }
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
          Stock
        </Text>
        {/* FAB ajouter produit */}
        <TouchableOpacity
          style={styles.fabAjouter}
          onPress={() => ouvrirAjoutProduit()}
        >
          <Text style={styles.fabAjouterTexte}>+ Produit</Text>
        </TouchableOpacity>
      </View>

      {/* ── Onglets ──────────────────────────────────────────── */}
      <View style={styles.onglets}>
        {[
          { id: "produits",    label: "Produits"   },
          { id: "mouvements",  label: "Mouvements" },
          { id: "alertes",     label: `Alertes (${alertes.length})` },
        ].map((onglet) => (
          <TouchableOpacity
            key={onglet.id}
            style={[
              styles.onglet,
              ongletActif === onglet.id && styles.ongletActif,
              {
                backgroundColor: ongletActif === onglet.id
                  ? COLORS.ORANGE
                  : darkMode
                  ? COLORS.SURFACE_DARK
                  : COLORS.BG_CARD_LIGHT,
              },
            ]}
            onPress={() => setOngletActif(onglet.id)}
          >
            <Text style={[
              styles.ongletTexte,
              {
                color: ongletActif === onglet.id
                  ? COLORS.WHITE
                  : darkMode
                  ? COLORS.TEXT_SECONDARY_DARK
                  : COLORS.TEXT_SECONDARY_LIGHT,
                fontWeight: ongletActif === onglet.id ? "700" : "400",
              }
            ]}>
              {onglet.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Recherche (uniquement onglet Produits) ───────────── */}
      {ongletActif === "produits" && (
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
            onChangeText={handleRecherche}
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => handleRecherche("")}>
              <Text style={{ color: COLORS.TEXT_SECONDARY_LIGHT }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Liste selon onglet ───────────────────────────────── */}
      <FlatList
        data={donneesOnglet()}
        renderItem={renderOnglet}
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
            <Text style={styles.videIcone}>
              {ongletActif === "produits"   ? "📦" :
               ongletActif === "mouvements" ? "📊" : "✅"}
            </Text>
            <Text style={[styles.videTexte, { color: textCouleur }]}>
              {ongletActif === "produits"
                ? "Aucun produit"
                : ongletActif === "mouvements"
                ? "Aucun mouvement"
                : "Aucune alerte stock"}
            </Text>
          </View>
        }
      />

      {/* ── Modal ajout/modification produit ─────────────────── */}
      <Modal
        visible={modalProduit}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalProduit(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.SURFACE_LIGHT }
          ]}>
            <Text style={[styles.modalTitre, { color: textCouleur }]}>
              {produitEdite ? `Modifier ${produitEdite.nom}` : "Nouveau produit"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Photo */}
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={choisirPhoto}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoIcone}>📷</Text>
                    <Text style={styles.photoTexte}>Choisir une photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Input
                label="Nom du produit *"
                placeholder="Ex: Café Arabica"
                valeur={nomProduit}
                onChange={setNomProduit}
                dark={darkMode}
              />

              <Input
                label="Catégorie"
                placeholder="Ex: Alimentation"
                valeur={categorie}
                onChange={setCategorie}
                dark={darkMode}
              />

              {/* Prix côte à côte */}
              <View style={styles.prixRow}>
                <View style={styles.prixItem}>
                  <Input
                    label="Prix achat (FCFA)"
                    placeholder="0"
                    valeur={prixAchat}
                    onChange={setPrixAchat}
                    typeClavier="numeric"
                    dark={darkMode}
                  />
                </View>
                <View style={styles.prixItem}>
                  <Input
                    label="Prix vente (FCFA) *"
                    placeholder="0"
                    valeur={prixVente}
                    onChange={setPrixVente}
                    typeClavier="numeric"
                    dark={darkMode}
                  />
                </View>
              </View>

              {/* Quantité + stock min côte à côte */}
              <View style={styles.prixRow}>
                <View style={styles.prixItem}>
                  <Input
                    label="Quantité *"
                    placeholder="0"
                    valeur={quantite}
                    onChange={setQuantite}
                    typeClavier="numeric"
                    dark={darkMode}
                  />
                </View>
                <View style={styles.prixItem}>
                  <Input
                    label="Stock minimum"
                    placeholder="5"
                    valeur={stockMin}
                    onChange={setStockMin}
                    typeClavier="numeric"
                    dark={darkMode}
                  />
                </View>
              </View>

              <Button
                titre="Enregistrer"
                onPress={enregistrerProduit}
                style={{ marginBottom: 10 }}
              />
              <Button
                titre="Annuler"
                variante="secondary"
                onPress={() => setModalProduit(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal entrée stock ───────────────────────────────── */}
      <Modal
        visible={modalEntree}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEntree(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: darkMode
                ? COLORS.SURFACE_DARK
                : COLORS.SURFACE_LIGHT }
          ]}>
            <Text style={[styles.modalTitre, { color: textCouleur }]}>
              Entrée stock : {produitEntree?.nom}
            </Text>

            <Text style={styles.stockActuel}>
              Stock actuel : {produitEntree?.quantiteStock} pcs
            </Text>

            <Input
              label="Quantité reçue *"
              placeholder="Ex: 50"
              valeur={qteEntree}
              onChange={setQteEntree}
              typeClavier="numeric"
              dark={darkMode}
            />

            <Input
              label="Prix d'achat unitaire (FCFA)"
              placeholder="0"
              valeur={prixEntree}
              onChange={setPrixEntree}
              typeClavier="numeric"
              dark={darkMode}
            />

            <Button
              titre="Confirmer l'entrée"
              onPress={enregistrerEntreeStock}
              style={{ marginBottom: 10 }}
            />
            <Button
              titre="Annuler"
              variante="secondary"
              onPress={() => setModalEntree(false)}
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
    flexDirection:     "row",
    justifyContent:    "space-between",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },

  headerTitre: {
    fontSize:   20,
    fontWeight: "800",
  },

  fabAjouter: {
    backgroundColor:   COLORS.ORANGE,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      10,
  },

  fabAjouterTexte: {
    color:      COLORS.WHITE,
    fontSize:   13,
    fontWeight: "700",
  },

  // ── Onglets ───────────────────────────────────────────────
  onglets: {
    flexDirection:     "row",
    paddingHorizontal: 16,
    gap:               8,
    marginBottom:      12,
  },

  onglet: {
    flex:           1,
    height:         38,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },

  ongletActif: {},

  ongletTexte: {
    fontSize: 12,
  },

  // ── Recherche ─────────────────────────────────────────────
  searchBar: {
    flexDirection:     "row",
    alignItems:        "center",
    marginHorizontal:  16,
    marginBottom:      12,
    borderRadius:      12,
    paddingHorizontal: 14,
    height:            44,
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

  // ── Liste ─────────────────────────────────────────────────
  liste: {
    paddingHorizontal: 16,
    paddingBottom:     100,
  },

  // ── Item produit ──────────────────────────────────────────
  produitItem: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    marginBottom:  10,
    padding:       14,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  produitPhoto: {
    width:          52,
    height:         52,
    borderRadius:   12,
    backgroundColor: COLORS.ORANGE,
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    14,
    overflow:       "hidden",
  },

  produitImage: {
    width:  52,
    height: 52,
  },

  produitIconeTexte: {
    fontSize: 24,
  },

  produitInfo: {
    flex: 1,
  },

  produitNom: {
    fontSize:   15,
    fontWeight: "700",
    marginBottom: 2,
  },

  produitCategorie: {
    fontSize:     12,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    marginBottom: 4,
  },

  produitPrixRow: {
    flexDirection: "row",
    alignItems:    "center",
  },

  produitPrixAchat: {
    fontSize: 12,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  produitPrixFleche: {
    fontSize: 12,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  produitPrixVente: {
    fontSize:   13,
    fontWeight: "700",
    color:      COLORS.ORANGE,
  },

  produitStockContainer: {
    alignItems: "center",
  },

  produitStockQte: {
    fontSize:   22,
    fontWeight: "800",
  },

  produitStockLabel: {
    fontSize: 11,
    color:    COLORS.TEXT_SECONDARY_LIGHT,
  },

  badgeFaible: {
    marginTop:         4,
    backgroundColor:   COLORS.ORANGE,
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      8,
  },

  badgeFaibleTexte: {
    color:    COLORS.WHITE,
    fontSize: 9,
    fontWeight: "700",
  },

  // ── Item mouvement ────────────────────────────────────────
  mouvementItem: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    marginBottom:  8,
    padding:       14,
  },

  mouvementIcone: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    marginRight:    14,
  },

  mouvementFleche: {
    fontSize:   18,
    fontWeight: "800",
    color:      COLORS.WHITE,
  },

  mouvementInfo: {
    flex: 1,
  },

  mouvementNom: {
    fontSize:   14,
    fontWeight: "700",
  },

  mouvementMotif: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    marginTop: 2,
  },

  mouvementDate: {
    fontSize:  11,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    marginTop: 2,
  },

  mouvementDroite: {
    alignItems: "flex-end",
  },

  mouvementQte: {
    fontSize:   16,
    fontWeight: "800",
  },

  mouvementMontant: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    marginTop: 2,
  },

  // ── Item alerte ───────────────────────────────────────────
  alerteItem: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    marginBottom:  8,
    overflow:      "hidden",
  },

  alerteIndicateur: {
    width:  4,
    height: "100%",
  },

  alerteInfo: {
    flex:    1,
    padding: 14,
  },

  alerteNom: {
    fontSize:   15,
    fontWeight: "700",
  },

  alerteSub: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    marginTop: 2,
  },

  alerteBtnEntree: {
    backgroundColor:   COLORS.ORANGE,
    paddingHorizontal: 14,
    paddingVertical:   8,
    marginRight:       14,
    borderRadius:      10,
  },

  alerteBtnTexte: {
    color:      COLORS.WHITE,
    fontSize:   13,
    fontWeight: "700",
  },

  // ── Vide ──────────────────────────────────────────────────
  vide: {
    alignItems: "center",
    paddingTop: 80,
  },

  videIcone: {
    fontSize:     48,
    marginBottom: 16,
  },

  videTexte: {
    fontSize:   16,
    fontWeight: "600",
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
    maxHeight:            "90%",
  },

  modalTitre: {
    fontSize:     18,
    fontWeight:   "800",
    marginBottom: 16,
  },

  // ── Photo produit ─────────────────────────────────────────
  photoContainer: {
    alignSelf:    "center",
    marginBottom: 16,
  },

  photoPreview: {
    width:        80,
    height:       80,
    borderRadius: 16,
  },

  photoPlaceholder: {
    width:           80,
    height:          80,
    borderRadius:    16,
    backgroundColor: COLORS.BG_CARD_LIGHT,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     2,
    borderColor:     COLORS.ORANGE,
    borderStyle:     "dashed",
  },

  photoIcone: {
    fontSize: 24,
  },

  photoTexte: {
    fontSize:  10,
    color:     COLORS.ORANGE,
    marginTop: 4,
    textAlign: "center",
  },

  // Prix row
  prixRow: {
    flexDirection: "row",
    gap:           12,
  },

  prixItem: {
    flex: 1,
  },

  // Stock actuel info
  stockActuel: {
    fontSize:     14,
    color:        COLORS.TEXT_SECONDARY_LIGHT,
    marginBottom: 16,
  },
});

export default StockScreen;