/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  REGISTERSCREEN.JS                                           ║
 * ║                                                              ║
 * ║  Écran d'inscription Hardoize.                               ║
 * ║  Thème clair (conforme aux maquettes).                       ║
 * ║                                                              ║
 * ║  Fonctionnalités :                                           ║
 * ║  - Sélection du rôle (Vendeur / Patron)                      ║
 * ║  - Formulaire : nom, téléphone, email, mot de passe          ║
 * ║  - Validation des champs                                     ║
 * ║  - Création de compte en ligne ou offline                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState } from "react";
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

import Button   from "../../components/common/Button";
import Input    from "../../components/common/Input";
import useStore from "../../store/useStore";
import { inscrire } from "../../services/authService";
import { COLORS, ROLES } from "../../utils/constants";
import { validerTelephone, validerEmail } from "../../utils/helpers";

const RegisterScreen = ({ navigation }) => {
  // ── État local du formulaire ───────────────────────────────
  const [nom,        setNom]        = useState("");
  const [telephone,  setTelephone]  = useState("");
  const [email,      setEmail]      = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role,       setRole]       = useState(ROLES.VENDEUR);
  const [chargement, setChargement] = useState(false);
  const [erreurs,    setErreurs]    = useState({});

  // ── Store ──────────────────────────────────────────────────
  const setSession = useStore((s) => s.setSession);

  // ── Validation ─────────────────────────────────────────────
  const valider = () => {
    const errs = {};

    if (!nom.trim() || nom.trim().length < 2) {
      errs.nom = "Le nom doit faire au moins 2 caractères";
    }
    if (!telephone.trim()) {
      errs.telephone = "Le numéro de téléphone est obligatoire";
    } else if (!validerTelephone(telephone)) {
      errs.telephone = "Format invalide (ex: 699 123 456)";
    }
    if (email && !validerEmail(email)) {
      errs.email = "Email invalide";
    }
    if (!motDePasse || motDePasse.length < 6) {
      errs.motDePasse = "Minimum 6 caractères";
    }

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Inscription ────────────────────────────────────────────
  const handleInscription = async () => {
    if (!valider()) return;

    setChargement(true);
    try {
      const session = await inscrire({
        nom:       nom.trim(),
        telephone: telephone.trim(),
        email:     email.trim() || null,
        motDePasse,
        role,
      });

      // Sauvegarder la session
      setSession(
        session.utilisateur,
        session.token,
        session.refreshToken || null
      );

    } catch (error) {
      Alert.alert(
        "Erreur d'inscription",
        error.message || "Une erreur est survenue",
        [{ text: "OK" }]
      );
    } finally {
      setChargement(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BG_LIGHT} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card principale ──────────────────────────────── */}
          <View style={styles.card}>

            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoCercle}>
                <Text style={styles.logoLettre}>H</Text>
              </View>
              <Text style={styles.logoNom}>Hardoize</Text>
              <Text style={styles.logoTagline}>
                Créez votre compte pour commencer à vendre.
              </Text>
            </View>

            {/* Sélecteur de rôle */}
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleBouton,
                  role === ROLES.VENDEUR && styles.roleBoutonActif,
                ]}
                onPress={() => setRole(ROLES.VENDEUR)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleTexte,
                    role === ROLES.VENDEUR && styles.roleTexteActif,
                  ]}
                >
                  Je suis un vendeur
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleBouton,
                  role === ROLES.PROPRIETAIRE && styles.roleBoutonActif,
                ]}
                onPress={() => setRole(ROLES.PROPRIETAIRE)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleTexte,
                    role === ROLES.PROPRIETAIRE && styles.roleTexteActif,
                  ]}
                >
                  Je suis un patron
                </Text>
              </TouchableOpacity>
            </View>

            {/* Champs du formulaire */}
            <Input
              label="Nom complet"
              placeholder="Ex: Jean Dupont"
              valeur={nom}
              onChange={setNom}
              icone="👤"
              erreur={erreurs.nom}
            />

            <Input
              label="Numéro de téléphone"
              placeholder="+237 6XX XXX XXX"
              valeur={telephone}
              onChange={setTelephone}
              typeClavier="phone-pad"
              icone="📞"
              erreur={erreurs.telephone}
              autoCapitalize="none"
            />

            <Input
              label="Email (optionnel)"
              placeholder="exemple@gmail.com"
              valeur={email}
              onChange={setEmail}
              typeClavier="email-address"
              icone="✉"
              erreur={erreurs.email}
              autoCapitalize="none"
            />

            <Input
              label="Mot de passe"
              placeholder="Minimum 6 caractères"
              valeur={motDePasse}
              onChange={setMotDePasse}
              secureText={true}
              icone="🔒"
              erreur={erreurs.motDePasse}
            />

            {/* Bouton créer compte */}
            <Button
              titre="Créer mon compte →"
              onPress={handleInscription}
              chargement={chargement}
              style={styles.btnCreer}
            />

            {/* Lien connexion */}
            <View style={styles.connexionLien}>
              <Text style={styles.connexionTexte}>
                Déjà un compte ?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.connexionLienTexte}>
                  Se connecter
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.BG_LIGHT,
  },

  flex: { flex: 1 },

  scroll: {
    paddingHorizontal: 24,
    paddingTop:        48,
    paddingBottom:     40,
  },

  // ── Card ──────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.SURFACE_LIGHT,
    borderRadius:    24,
    padding:         28,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.08,
    shadowRadius:    16,
    elevation:       4,
  },

  // ── Logo ──────────────────────────────────────────────────
  logoSection: {
    alignItems:   "center",
    marginBottom: 24,
  },

  logoCercle: {
    width:           64,
    height:          64,
    borderRadius:    16,
    backgroundColor: COLORS.ORANGE,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    12,
  },

  logoLettre: {
    fontSize:   28,
    fontWeight: "900",
    color:      COLORS.WHITE,
  },

  logoNom: {
    fontSize:   22,
    fontWeight: "800",
    color:      COLORS.TEXT_PRIMARY_LIGHT,
    marginBottom: 4,
  },

  logoTagline: {
    fontSize:  13,
    color:     COLORS.TEXT_SECONDARY_LIGHT,
    textAlign: "center",
  },

  // ── Sélecteur rôle ────────────────────────────────────────
  roleContainer: {
    flexDirection:   "row",
    backgroundColor: COLORS.BG_CARD_LIGHT,
    borderRadius:    12,
    padding:         4,
    marginBottom:    20,
  },

  roleBouton: {
    flex:           1,
    height:         44,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },

  roleBoutonActif: {
    backgroundColor: COLORS.ORANGE,
  },

  roleTexte: {
    fontSize:   13,
    fontWeight: "500",
    color:      COLORS.TEXT_SECONDARY_LIGHT,
  },

  roleTexteActif: {
    color:      COLORS.WHITE,
    fontWeight: "700",
  },

  // ── Bouton créer ──────────────────────────────────────────
  btnCreer: {
    marginTop: 8,
  },

  // ── Lien connexion ────────────────────────────────────────
  connexionLien: {
    flexDirection:  "row",
    justifyContent: "center",
    marginTop:      20,
  },

  connexionTexte: {
    color:    COLORS.TEXT_SECONDARY_LIGHT,
    fontSize: 14,
  },

  connexionLienTexte: {
    color:      COLORS.ORANGE,
    fontSize:   14,
    fontWeight: "700",
  },
});

export default RegisterScreen;