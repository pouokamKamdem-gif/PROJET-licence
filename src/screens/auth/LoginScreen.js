/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  LOGINSCREEN.JS                                              ║
 * ║                                                              ║
 * ║  Écran de connexion Hardoize.                                ║
 * ║  Thème sombre (conforme aux maquettes).                      ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Connexion téléphone + mot de passe                        ║
 * ║  - Connexion biométrique (si activée et disponible)          ║
 * ║  - Navigation vers l'inscription                             ║
 * ║  - Navigation vers récupération mot de passe                 ║
 * ║  - Gestion mode offline                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button  from "../../components/common/Button";
import Input   from "../../components/common/Input";
import useStore from "../../store/useStore";
import {
  connecter,
  connecterAvecBiometrie,
  biometrieDisponible,
} from "../../services/authService";
import { COLORS, STORAGE_KEYS } from "../../utils/constants";
import * as SecureStore from "expo-secure-store";

const LoginScreen = ({ navigation }) => {
  // ── État local ─────────────────────────────────────────────
  const [telephone,  setTelephone]  = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [biometrieOk, setBiometrieOk] = useState(false);
  const [erreurs, setErreurs]       = useState({});

  // ── Store ──────────────────────────────────────────────────
  const setSession = useStore((s) => s.setSession);

  // ── Vérifier la disponibilité de la biométrie ──────────────
  useEffect(() => {
    verifierBiometrie();
  }, []);

  const verifierBiometrie = async () => {
    const disponible = await biometrieDisponible();
    const activee    = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIE);
    setBiometrieOk(disponible && activee === "true");
  };

  // ── Validation du formulaire ───────────────────────────────
  const valider = () => {
    const errs = {};

    if (!telephone.trim()) {
      errs.telephone = "Le numéro de téléphone est obligatoire";
    }
    if (!motDePasse) {
      errs.motDePasse = "Le mot de passe est obligatoire";
    }

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Connexion normale ──────────────────────────────────────
  const handleConnexion = async () => {
    if (!valider()) return;

    setChargement(true);
    try {
      const session = await connecter(telephone.trim(), motDePasse);

      // Sauvegarder la session dans le store global
      setSession(
        session.utilisateur,
        session.token,
        session.refreshToken || null
      );

      // Activer la biométrie pour les prochaines connexions
      if (await biometrieDisponible()) {
        await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIE, "true");
      }

    } catch (error) {
      Alert.alert(
        "Erreur de connexion",
        error.message || "Vérifiez vos identifiants",
        [{ text: "OK" }]
      );
    } finally {
      setChargement(false);
    }
  };

  // ── Connexion biométrique ──────────────────────────────────
  const handleBiometrie = async () => {
    setChargement(true);
    try {
      const session = await connecterAvecBiometrie();
      setSession(
        session.utilisateur,
        session.token,
        session.refreshToken || null
      );
    } catch (error) {
      Alert.alert(
        "Authentification échouée",
        error.message,
        [{ text: "OK" }]
      );
    } finally {
      setChargement(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_DARK} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ────────────────────────────────────────── */}
          <View style={styles.logoSection}>
            <View style={styles.logoCercle}>
              <Text style={styles.logoLettre}>H</Text>
            </View>
            <Text style={styles.logoNom}>Hardoize</Text>
            <Text style={styles.logoTagline}>
              Gérez vos ventes et stocks en toute simplicité.
            </Text>
          </View>

          {/* ── Formulaire ──────────────────────────────────── */}
          <View style={styles.formulaire}>

            {/* Champ téléphone */}
            <Input
              label="UTILISATEUR / TÉLÉPHONE"
              placeholder="Numéro ou email"
              valeur={telephone}
              onChange={setTelephone}
              typeClavier="phone-pad"
              icone="@"
              erreur={erreurs.telephone}
              dark={true}
              autoCapitalize="none"
            />

            {/* Champ mot de passe */}
            <Input
              label="MOT DE PASSE"
              placeholder="••••••••"
              valeur={motDePasse}
              onChange={setMotDePasse}
              secureText={true}
              icone="#"
              erreur={erreurs.motDePasse}
              dark={true}
            />

            {/* Bouton connexion */}
            <Button
              titre="Connexion →"
              onPress={handleConnexion}
              chargement={chargement}
              style={styles.btnConnexion}
            />

            {/* Bouton biométrie (si disponible) */}
            {biometrieOk && (
              <Button
                titre="👆 Connexion biométrique"
                onPress={handleBiometrie}
                variante="dark"
                style={styles.btnBiometrie}
              />
            )}

            {/* Mot de passe oublié */}
            <TouchableOpacity style={styles.mdpOublie}>
              <Text style={styles.mdpOublieTexte}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Pied de page ────────────────────────────────── */}
          <View style={styles.pied}>
            <Text style={styles.piedTexte}>
              Pas encore de compte ?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.piedLien}>S'inscrire</Text>
            </TouchableOpacity>
          </View>

          {/* Séparateur */}
          <View style={styles.separateur}>
            <View style={styles.ligne} />
            <Text style={styles.separateurTexte}>OU CONTINUER AVEC</Text>
            <View style={styles.ligne} />
          </View>

          {/* Boutons sociaux */}
          <View style={styles.btnSociaux}>
            <TouchableOpacity style={styles.btnSocial}>
              <Text style={styles.btnSocialTexte}>⬛ Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSocial}>
              <Text style={styles.btnSocialTexte}>📞 WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Sécurité */}
          <Text style={styles.securite}>
            🛡 SÉCURISÉ PAR HARDOIZE LEDGER PRO
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.BG_DARK,
  },

  flex: { flex: 1 },

  scroll: {
    paddingHorizontal: 28,
    paddingTop:        60,
    paddingBottom:     40,
  },

  // ── Logo ──────────────────────────────────────────────────
  logoSection: {
    alignItems:   "center",
    marginBottom: 40,
  },

  logoCercle: {
    width:           72,
    height:          72,
    borderRadius:    18,
    backgroundColor: COLORS.ORANGE,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    14,
    shadowColor:     COLORS.ORANGE,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
    elevation:       6,
  },

  logoLettre: {
    fontSize:   32,
    fontWeight: "900",
    color:      COLORS.WHITE,
  },

  logoNom: {
    fontSize:   26,
    fontWeight: "800",
    color:      COLORS.WHITE,
    marginBottom: 6,
  },

  logoTagline: {
    fontSize:  13,
    color:     COLORS.TEXT_SECONDARY_DARK,
    textAlign: "center",
  },

  // ── Formulaire ────────────────────────────────────────────
  formulaire: {
    backgroundColor: COLORS.SURFACE_DARK,
    borderRadius:    20,
    padding:         24,
    marginBottom:    24,
  },

  btnConnexion: {
    marginTop: 8,
  },

  btnBiometrie: {
    marginTop: 12,
  },

  mdpOublie: {
    alignItems: "center",
    marginTop:  16,
  },

  mdpOublieTexte: {
    color:    COLORS.ORANGE,
    fontSize: 14,
  },

  // ── Pied ──────────────────────────────────────────────────
  pied: {
    flexDirection:  "row",
    justifyContent: "center",
    marginBottom:   24,
  },

  piedTexte: {
    color:    COLORS.WHITE,
    fontSize: 14,
  },

  piedLien: {
    color:      COLORS.SCORE_VERT,
    fontSize:   14,
    fontWeight: "700",
  },

  // ── Séparateur ────────────────────────────────────────────
  separateur: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   16,
  },

  ligne: {
    flex:            1,
    height:          1,
    backgroundColor: COLORS.SURFACE_DARK,
  },

  separateurTexte: {
    color:              COLORS.TEXT_SECONDARY_DARK,
    fontSize:           11,
    paddingHorizontal:  12,
    letterSpacing:      1,
  },

  // ── Boutons sociaux ───────────────────────────────────────
  btnSociaux: {
    flexDirection: "row",
    gap:           12,
    marginBottom:  32,
  },

  btnSocial: {
    flex:            1,
    height:          50,
    backgroundColor: COLORS.SURFACE_DARK,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },

  btnSocialTexte: {
    color:    COLORS.WHITE,
    fontSize: 14,
  },

  // ── Sécurité ──────────────────────────────────────────────
  securite: {
    color:      COLORS.TEXT_SECONDARY_DARK,
    fontSize:   10,
    textAlign:  "center",
    letterSpacing: 0.5,
  },
});

export default LoginScreen;