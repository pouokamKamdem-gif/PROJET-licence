/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  GROUPESSCREEN.JS                                            ║
 * ║                                                              ║
 * ║  Écran de gestion des groupes / points de vente.             ║
 * ║  Thème sombre (conforme aux maquettes).                      ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Créer un groupe (propriétaire)                            ║
 * ║  - Scanner QR code pour rejoindre                            ║
 * ║  - Afficher QR code du groupe                                ║
 * ║  - Générer lien WhatsApp (expire 5 min)                      ║
 * ║  - Voir membres connectés                                    ║
 * ║  - Gérer demandes d'accès                                    ║
 * ║  - Modifier rôles et bails                                   ║
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
  Modal,
  FlatList,
  StatusBar,
  RefreshControl,
  Linking,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";

import useStore  from "../../store/useStore";
import { COLORS, ROLES, LIEN_EXPIRATION_MS } from "../../utils/constants";
import {
  formatFCFA,
  bailEstExpire,
  minutesAvantBail,
  formatRole,
  genererToken,
  genererUUID,
} from "../../utils/helpers";
import { GroupeDB, MembreDB } from "../../services/database";
import Button from "../../components/common/Button";
import Input  from "../../components/common/Input";

const GroupesScreen = () => {
  // ── Store ──────────────────────────────────────────────────
  const utilisateur  = useStore((s) => s.utilisateur);
  const groupeActif  = useStore((s) => s.groupeActif);
  const setGroupeActif = useStore((s) => s.setGroupeActif);
  const darkMode     = useStore((s) => s.darkMode);

  // ── État local ─────────────────────────────────────────────
  const [groupes,         setGroupes]         = useState([]);
  const [membres,         setMembres]         = useState([]);
  const [chargement,      setChargement]      = useState(false);
  const [timerLien,       setTimerLien]       = useState(0);
  const [timerInterval,   setTimerInterval]   = useState(null);

  // ── Modals ────────────────────────────────────────────────
  const [modalCreerGroupe, setModalCreerGroupe] = useState(false);
  const [modalMembre,      setModalMembre]      = useState(false);
  const [membreSelectionne, setMembreSelectionne] = useState(null);

  // ── Formulaire créer groupe ────────────────────────────────
  const [nomGroupe,   setNomGroupe]   = useState("");
  const [descGroupe,  setDescGroupe]  = useState("");
  const [heureBail,   setHeureBail]   = useState("18:00");

  // ── Charger données au focus ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      chargerDonnees();
      return () => {
        // Nettoyer le timer à la perte de focus
        if (timerInterval) clearInterval(timerInterval);
      };
    }, [])
  );

  // ── Charger groupes et membres ─────────────────────────────
  const chargerDonnees = async () => {
    try {
      setChargement(true);
      const userId = utilisateur?.id;
      if (!userId) return;

      // Charger les groupes du propriétaire
      const listeGroupes = await GroupeDB.getByProprietaire(userId);
      setGroupes(listeGroupes);

      // Si un groupe est actif, charger ses membres
      if (groupeActif) {
        const listeMembres = await MembreDB.getMembresConnectes(groupeActif.id);
        setMembres(listeMembres);
      }

    } catch (error) {
      console.error("Erreur chargement groupes:", error);
    } finally {
      setChargement(false);
    }
  };

  // ── Créer un nouveau groupe ────────────────────────────────
  const creerGroupe = async () => {
    if (!nomGroupe.trim()) {
      Alert.alert("Erreur", "Le nom du groupe est obligatoire");
      return;
    }
    if (!heureBail.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Erreur", "Format d'heure invalide. Utilisez HH:MM (ex: 18:00)");
      return;
    }

    try {
      const codeQR = genererUUID();

      const groupeId = await GroupeDB.inserer({
        nom:            nomGroupe.trim(),
        description:    descGroupe.trim() || null,
        proprietaireId: utilisateur.id,
        codeQR,
        heureFermeture: heureBail,
      });

      // Ajouter le propriétaire comme membre permanent
      await MembreDB.inserer({
        groupeId,
        utilisateurId:      utilisateur.id,
        nomAffiche:         utilisateur.nom,
        telephone:          utilisateur.telephone,
        role:               ROLES.PROPRIETAIRE,
        bailHeure:          heureBail,
        estConnecte:        true,
        connexionPermanente: true,
      });

      const nouveauGroupe = { id: groupeId, nom: nomGroupe.trim(), codeQR };
      setGroupeActif(nouveauGroupe);
      setModalCreerGroupe(false);
      setNomGroupe("");
      setDescGroupe("");
      await chargerDonnees();

      Alert.alert(
        "✅ Groupe créé !",
        `"${nomGroupe}" est prêt. Partagez le QR code avec vos vendeurs.`
      );

    } catch (error) {
      Alert.alert("Erreur", error.message || "Erreur lors de la création");
    }
  };

  // ── Générer et partager lien WhatsApp ─────────────────────
  const genererLienWhatsApp = async () => {
    if (!groupeActif) return;

    const token    = genererToken();
    const lien     = `https://hardoize.app/rejoindre/${token}?groupe=${groupeActif.codeQR}`;
    const message  =
      `🛒 *Rejoignez mon point de vente sur Hardoize !*\n\n` +
      `Groupe : *${groupeActif.nom}*\n` +
      `Lien : ${lien}\n\n` +
      `⚠ Ce lien expire dans 5 minutes.\n` +
      `L'accès sera validé par l'administrateur.`;

    // Démarrer le compte à rebours de 5 minutes
    demarrerTimer();

    try {
      // Tenter d'ouvrir WhatsApp
      const urlWhatsApp = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const peutOuvrir  = await Linking.canOpenURL(urlWhatsApp);

      if (peutOuvrir) {
        await Linking.openURL(urlWhatsApp);
      } else {
        // WhatsApp non disponible → partage natif
        await Share.share({ message });
      }
    } catch (error) {
      // Fallback partage natif
      try {
        await Share.share({ message });
      } catch (e) {
        Alert.alert("Erreur", "Impossible de partager le lien");
      }
    }
  };

  // ── Timer compte à rebours lien ────────────────────────────
  const demarrerTimer = () => {
    // Annuler le timer précédent
    if (timerInterval) clearInterval(timerInterval);

    let secondesRestantes = 5 * 60; // 5 minutes
    setTimerLien(secondesRestantes);

    const interval = setInterval(() => {
      secondesRestantes -= 1;
      setTimerLien(secondesRestantes);

      if (secondesRestantes <= 0) {
        clearInterval(interval);
        setTimerLien(0);
      }
    }, 1000);

    setTimerInterval(interval);
  };

  // ── Formater le timer ──────────────────────────────────────
  const formatTimer = (secondes) => {
    const m = Math.floor(secondes / 60);
    const s = secondes % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Ouvrir options d'un membre ─────────────────────────────
  const ouvrirOptionsMembre = (membre) => {
    setMembreSelectionne(membre);
    setModalMembre(true);
  };

  // ── Modifier rôle d'un membre ──────────────────────────────
  const modifierRole = (membre) => {
    Alert.alert(
      "Modifier le rôle",
      `Rôle actuel : ${formatRole(membre.role)}`,
      [
        {
          text: "Vendeur",
          onPress: () => appliquerRole(membre, ROLES.VENDEUR),
        },
        {
          text: "Magasinier",
          onPress: () => appliquerRole(membre, ROLES.MAGASINIER),
        },
        {
          text: "Caissier",
          onPress: () => appliquerRole(membre, ROLES.CAISSIER),
        },
        {
          text: "Administrateur",
          onPress: () => appliquerRole(membre, ROLES.ADMIN),
        },
        { text: "Annuler", style: "cancel" },
      ]
    );
  };

  // ── Appliquer un nouveau rôle ──────────────────────────────
  const appliquerRole = async (membre, nouveauRole) => {
    try {
      await MembreDB.mettreAJour(membre.id, {
        ...membre,
        role:            nouveauRole,
        connexionPermanente:
          nouveauRole === ROLES.ADMIN ||
          nouveauRole === ROLES.PROPRIETAIRE,
      });
      setModalMembre(false);
      await chargerDonnees();
      Alert.alert("✅", `Rôle modifié : ${formatRole(nouveauRole)}`);
    } catch (error) {
      Alert.alert("Erreur", error.message);
    }
  };

  // ── Déconnecter un membre ──────────────────────────────────
  const deconnecterMembre = async (membre) => {
    Alert.alert(
      "Déconnecter",
      `Déconnecter ${membre.nomAffiche} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          onPress: async () => {
            try {
              await MembreDB.mettreAJour(membre.id, {
                ...membre,
                estConnecte: false,
              });
              setModalMembre(false);
              await chargerDonnees();
            } catch (error) {
              Alert.alert("Erreur", error.message);
            }
          },
        },
      ]
    );
  };

  // ── Sélectionner un groupe ─────────────────────────────────
  const selectionnerGroupe = async (groupe) => {
    setGroupeActif(groupe);
    const listeMembres = await MembreDB.getMembresConnectes(groupe.id);
    setMembres(listeMembres);
  };

  // ── Couleurs thème (SOMBRE pour les groupes) ───────────────
  const bgCouleur   = COLORS.BG_DARK;
  const textCouleur = COLORS.TEXT_PRIMARY_DARK;
  const cardCouleur = COLORS.SURFACE_DARK;

  // ── Rendu d'un membre ──────────────────────────────────────
  const renderMembre = ({ item }) => {
    const expireBail  = bailEstExpire(item.bailHeure);
    const minsRestant = minutesAvantBail(item.bailHeure);

    return (
      <TouchableOpacity
        style={[styles.membreCard, { backgroundColor: cardCouleur }]}
        onLongPress={() => {
          // Long press → options admin
          if (utilisateur?.role === ROLES.PROPRIETAIRE ||
              utilisateur?.role === ROLES.ADMIN) {
            ouvrirOptionsMembre(item);
          }
        }}
        activeOpacity={0.85}
      >
        {/* Avatar + indicateur connexion */}
        <View style={styles.membreAvatarContainer}>
          <View style={styles.membreAvatar}>
            <Text style={styles.membreAvatarTexte}>
              {item.nomAffiche?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          {/* Point indicateur connexion */}
          <View style={[
            styles.membreIndicateur,
            { backgroundColor: item.estConnecte
                ? COLORS.SCORE_VERT
                : COLORS.GRAY }
          ]}/>
        </View>

        {/* Infos membre */}
        <View style={styles.membreInfo}>
          <Text style={[styles.membreNom, { color: textCouleur }]}>
            {item.nomAffiche}
          </Text>
          <Text style={[
            styles.membreRole,
            {
              color: item.role === ROLES.PROPRIETAIRE ||
                     item.role === ROLES.ADMIN
                ? COLORS.ORANGE
                : COLORS.TEXT_SECONDARY_DARK,
            }
          ]}>
            {formatRole(item.role)}
          </Text>
          <Text style={[
            styles.membreBail,
            { color: expireBail ? COLORS.SCORE_ROUGE : COLORS.TEXT_SECONDARY_DARK }
          ]}>
            {expireBail
              ? "⏱ Bail expiré"
              : `⏱ Bail: ${item.bailHeure} (${minsRestant} min)`}
          </Text>
        </View>

        {/* Total ventes */}
        <Text style={[
          styles.membreTotal,
          { color: COLORS.SCORE_VERT }
        ]}>
          +0 FCFA
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Rendu d'un groupe dans la liste ───────────────────────
  const renderGroupe = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.groupeCard,
        { backgroundColor: cardCouleur },
        groupeActif?.id === item.id && styles.groupeCardActif,
      ]}
      onPress={() => selectionnerGroupe(item)}
      activeOpacity={0.85}
    >
      {/* Logo groupe */}
      <View style={styles.groupeLogo}>
        <Text style={styles.groupeLogoTexte}>
          {item.nom?.charAt(0).toUpperCase() || "G"}
        </Text>
      </View>

      {/* Infos */}
      <View style={styles.groupeInfo}>
        <Text style={[styles.groupeNom, { color: textCouleur }]}>
          {item.nom}
        </Text>
        <Text style={styles.groupeDesc}>
          {item.description || "Point de vente"}
        </Text>
        <Text style={styles.groupeHeure}>
          Fermeture : {item.heureFermeture}
        </Text>
      </View>

      {/* Flèche */}
      <Text style={{ color: COLORS.TEXT_SECONDARY_DARK, fontSize: 20 }}>
        {groupeActif?.id === item.id ? "✓" : "›"}
      </Text>
    </TouchableOpacity>
  );

  // ── Rendu principal ────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgCouleur }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgCouleur} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={chargement}
            onRefresh={chargerDonnees}
            colors={[COLORS.ORANGE]}
            tintColor={COLORS.ORANGE}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitre, { color: COLORS.ORANGE }]}>
              {groupeActif?.nom || "Mes Groupes"}
            </Text>
            <Text style={styles.headerSub}>
              {groupeActif
                ? "Point de vente actif"
                : "Créez ou rejoignez un groupe"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnCreer}
            onPress={() => setModalCreerGroupe(true)}
          >
            <Text style={styles.btnCreerTexte}>+ Créer</Text>
          </TouchableOpacity>
        </View>

        {/* ── Pas de groupe ────────────────────────────────── */}
        {groupes.length === 0 && (
          <View style={styles.vide}>
            <Text style={styles.videIcone}>👥</Text>
            <Text style={[styles.videTexte, { color: textCouleur }]}>
              Aucun point de vente
            </Text>
            <Text style={styles.videSubTexte}>
              Créez votre premier groupe pour commencer
            </Text>
            <Button
              titre="+ Créer un point de vente"
              onPress={() => setModalCreerGroupe(true)}
              style={{ marginTop: 24, width: "80%" }}
            />
          </View>
        )}

        {/* ── Liste groupes ─────────────────────────────────── */}
        {groupes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitre, { color: textCouleur }]}>
              Mes points de vente
            </Text>
            {groupes.map((groupe) => renderGroupe({ item: groupe }))}
          </View>
        )}

        {/* ── QR Code du groupe actif ───────────────────────── */}
        {groupeActif && (
          <View style={[styles.qrSection, { backgroundColor: cardCouleur }]}>
            {/* QR Code généré */}
            <View style={styles.qrContainer}>
              <QRCode
                value={`hardoize://groupe/${groupeActif.codeQR}`}
                size={200}
                color={COLORS.BG_DARK}
                backgroundColor={COLORS.WHITE}
              />
            </View>

            <Text style={[styles.qrTitre, { color: textCouleur }]}>
              Scanner pour rejoindre
            </Text>
            <Text style={styles.qrSub}>
              Partagez ce code avec vos vendeurs pour une connexion instantanée.
            </Text>
          </View>
        )}

        {/* ── Lien WhatsApp ─────────────────────────────────── */}
        {groupeActif && (
          <View style={[styles.whatsappSection, { backgroundColor: COLORS.ORANGE }]}>
            <Text style={styles.whatsappTitre}>🔗 Lien d'invitation</Text>
            <Text style={styles.whatsappSub}>
              Génère un lien sécurisé qui expire dans 5 minutes.
            </Text>

            <TouchableOpacity
              style={[
                styles.btnWhatsapp,
                timerLien > 0 && styles.btnWhatsappDisabled,
              ]}
              onPress={genererLienWhatsApp}
              disabled={timerLien > 0}
            >
              <Text style={styles.btnWhatsappTexte}>
                {timerLien > 0
                  ? `Lien actif : ${formatTimer(timerLien)}`
                  : "▷ Générer lien WhatsApp"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Vendeurs actifs ───────────────────────────────── */}
        {groupeActif && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitre, { color: textCouleur }]}>
                Vendeurs Actifs ({membres.length})
              </Text>
              <View style={styles.badgeEnDirect}>
                <Text style={styles.badgeEnDirectTexte}>En direct</Text>
              </View>
            </View>

            {membres.length === 0 ? (
              <Text style={styles.aucunMembre}>
                Aucun vendeur connecté pour l'instant
              </Text>
            ) : (
              membres.map((membre) => renderMembre({ item: membre }))
            )}
          </View>
        )}

        {/* Espace bas */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modal créer groupe ───────────────────────────────── */}
      <Modal
        visible={modalCreerGroupe}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalCreerGroupe(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: COLORS.SURFACE_DARK }
          ]}>
            <Text style={[styles.modalTitre, { color: textCouleur }]}>
              Nouveau point de vente
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Nom du groupe *"
                placeholder="Ex: Boutique Centrale"
                valeur={nomGroupe}
                onChange={setNomGroupe}
                dark={true}
              />

              <Input
                label="Description (optionnel)"
                placeholder="Décrivez votre point de vente..."
                valeur={descGroupe}
                onChange={setDescGroupe}
                dark={true}
                multiline={true}
                nombreLignes={3}
              />

              <Input
                label="Heure de fermeture automatique"
                placeholder="18:00"
                valeur={heureBail}
                onChange={setHeureBail}
                dark={true}
                autoCapitalize="none"
              />

              <Text style={styles.infoHeure}>
                ℹ Les vendeurs seront déconnectés automatiquement
                à cette heure chaque jour.
              </Text>

              <Button
                titre="Créer le groupe"
                onPress={creerGroupe}
                style={{ marginTop: 16, marginBottom: 10 }}
              />
              <Button
                titre="Annuler"
                variante="dark"
                onPress={() => setModalCreerGroupe(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal options membre ─────────────────────────────── */}
      <Modal
        visible={modalMembre}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalMembre(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            { backgroundColor: COLORS.SURFACE_DARK }
          ]}>
            {membreSelectionne && (
              <>
                <Text style={[styles.modalTitre, { color: textCouleur }]}>
                  {membreSelectionne.nomAffiche}
                </Text>
                <Text style={styles.membreRoleActuel}>
                  Rôle actuel : {formatRole(membreSelectionne.role)}
                </Text>

                <Button
                  titre="Modifier le rôle"
                  onPress={() => {
                    setModalMembre(false);
                    modifierRole(membreSelectionne);
                  }}
                  style={{ marginBottom: 10 }}
                />

                <Button
                  titre="Déconnecter maintenant"
                  variante="danger"
                  onPress={() => {
                    setModalMembre(false);
                    deconnecterMembre(membreSelectionne);
                  }}
                  style={{ marginBottom: 10 }}
                />

                <Button
                  titre="Fermer"
                  variante="dark"
                  onPress={() => setModalMembre(false)}
                />
              </>
            )}
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
    paddingVertical:   16,
  },

  headerTitre: {
    fontSize:   18,
    fontWeight: "800",
  },

  headerSub: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_DARK,
    marginTop: 2,
  },

  btnCreer: {
    backgroundColor:   COLORS.ORANGE,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      10,
  },

  btnCreerTexte: {
    color:      COLORS.WHITE,
    fontSize:   13,
    fontWeight: "700",
  },

  // ── Section ───────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom:      16,
  },

  sectionHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   10,
  },

  sectionTitre: {
    fontSize:     16,
    fontWeight:   "800",
    marginBottom: 10,
  },

  // ── Badge En Direct ───────────────────────────────────────
  badgeEnDirect: {
    backgroundColor:   COLORS.SURFACE_DARK,
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderRadius:      20,
  },

  badgeEnDirectTexte: {
    color:    COLORS.TEXT_SECONDARY_DARK,
    fontSize: 12,
  },

  // ── Carte groupe ──────────────────────────────────────────
  groupeCard: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    padding:       14,
    marginBottom:  8,
  },

  groupeCardActif: {
    borderWidth: 1.5,
    borderColor: COLORS.ORANGE,
  },

  groupeLogo: {
    width:           44,
    height:          44,
    borderRadius:    12,
    backgroundColor: COLORS.ORANGE,
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     14,
  },

  groupeLogoTexte: {
    fontSize:   20,
    fontWeight: "800",
    color:      COLORS.WHITE,
  },

  groupeInfo: { flex: 1 },

  groupeNom: {
    fontSize:   15,
    fontWeight: "700",
  },

  groupeDesc: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_DARK,
    marginTop: 2,
  },

  groupeHeure: {
    fontSize:  11,
    color:     COLORS.ORANGE,
    marginTop: 2,
  },

  // ── QR Code ───────────────────────────────────────────────
  qrSection: {
    marginHorizontal: 16,
    borderRadius:     16,
    padding:          20,
    alignItems:       "center",
    marginBottom:     12,
  },

  qrContainer: {
    backgroundColor: COLORS.WHITE,
    padding:         16,
    borderRadius:    12,
    marginBottom:    14,
  },

  qrTitre: {
    fontSize:   16,
    fontWeight: "700",
    marginBottom: 6,
  },

  qrSub: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_DARK,
    textAlign: "center",
  },

  // ── WhatsApp ──────────────────────────────────────────────
  whatsappSection: {
    marginHorizontal: 16,
    borderRadius:     16,
    padding:          20,
    marginBottom:     16,
  },

  whatsappTitre: {
    fontSize:   16,
    fontWeight: "800",
    color:      COLORS.WHITE,
    marginBottom: 6,
  },

  whatsappSub: {
    fontSize:     12,
    color:        "#CCFFFFFF",
    marginBottom: 14,
  },

  btnWhatsapp: {
    backgroundColor: COLORS.BG_DARK,
    height:          50,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },

  btnWhatsappDisabled: {
    opacity: 0.7,
  },

  btnWhatsappTexte: {
    color:      COLORS.WHITE,
    fontSize:   14,
    fontWeight: "700",
  },

  // ── Carte membre ──────────────────────────────────────────
  membreCard: {
    flexDirection: "row",
    alignItems:    "center",
    borderRadius:  14,
    padding:       14,
    marginBottom:  8,
  },

  membreAvatarContainer: {
    position:    "relative",
    marginRight: 14,
  },

  membreAvatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: COLORS.ORANGE,
    alignItems:      "center",
    justifyContent:  "center",
  },

  membreAvatarTexte: {
    fontSize:   18,
    fontWeight: "800",
    color:      COLORS.WHITE,
  },

  membreIndicateur: {
    position:    "absolute",
    bottom:      0,
    right:       0,
    width:       12,
    height:      12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.SURFACE_DARK,
  },

  membreInfo: { flex: 1 },

  membreNom: {
    fontSize:   15,
    fontWeight: "700",
  },

  membreRole: {
    fontSize:  12,
    marginTop: 2,
  },

  membreBail: {
    fontSize:  11,
    marginTop: 2,
  },

  membreTotal: {
    fontSize:   14,
    fontWeight: "700",
  },

  // ── Aucun membre ──────────────────────────────────────────
  aucunMembre: {
    textAlign:    "center",
    color:        COLORS.TEXT_SECONDARY_DARK,
    fontSize:     13,
    paddingVertical: 20,
  },

  // ── Vide ──────────────────────────────────────────────────
  vide: {
    alignItems:   "center",
    paddingTop:   60,
    paddingHorizontal: 32,
  },

  videIcone: {
    fontSize:     56,
    marginBottom: 16,
  },

  videTexte: {
    fontSize:   18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign:  "center",
  },

  videSubTexte: {
    fontSize:  14,
    color:     COLORS.TEXT_SECONDARY_DARK,
    textAlign: "center",
  },

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.6)",
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

  membreRoleActuel: {
    fontSize:     14,
    color:        COLORS.TEXT_SECONDARY_DARK,
    marginBottom: 20,
  },

  infoHeure: {
    fontSize:  12,
    color:     COLORS.TEXT_SECONDARY_DARK,
    marginTop: 8,
    lineHeight: 18,
  },
});

export default GroupesScreen;