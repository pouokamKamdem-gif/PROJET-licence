/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  INPUT.JS                                                    ║
 * ║                                                              ║
 * ║  Composant champ de saisie réutilisable.                     ║
 * ║                                                              ║
 * ║  Props :                                                     ║
 * ║  - label       : libellé au-dessus du champ                  ║
 * ║  - placeholder : texte indicatif                             ║
 * ║  - valeur      : valeur actuelle                             ║
 * ║  - onChange    : fonction appelée à chaque frappe            ║
 * ║  - secureText  : masquer le texte (mot de passe)             ║
 * ║  - typeClavier : type de clavier (phone, email, numeric...)  ║
 * ║  - icone       : emoji ou caractère affiché à gauche         ║
 * ║  - erreur      : message d'erreur affiché en rouge           ║
 * ║  - dark        : utiliser le style sombre                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { COLORS } from "../../utils/constants";

const Input = ({
  label,
  placeholder,
  valeur,
  onChange,
  secureText   = false,
  typeClavier  = "default",
  icone        = null,
  erreur       = null,
  dark         = false,
  style        = {},
  inputStyle   = {},
  multiline    = false,
  nombreLignes = 1,
  autoCapitalize = "sentences",
  editable     = true,
}) => {
  // État local pour toggle visibilité mot de passe
  const [mdpVisible, setMdpVisible] = useState(false);
  // État focus pour bordure colorée
  const [focused, setFocused]       = useState(false);

  // Couleurs selon le thème
  const couleurFond    = dark ? COLORS.SURFACE_DARK  : COLORS.BG_CARD_LIGHT;
  const couleurTexte   = dark ? COLORS.TEXT_PRIMARY_DARK  : COLORS.TEXT_PRIMARY_LIGHT;
  const couleurHint    = dark ? COLORS.TEXT_SECONDARY_DARK : COLORS.TEXT_SECONDARY_LIGHT;
  const couleurLabel   = dark ? COLORS.TEXT_SECONDARY_DARK : COLORS.TEXT_PRIMARY_LIGHT;
  const couleurBordure = focused ? COLORS.ORANGE : "transparent";

  return (
    <View style={[styles.container, style]}>
      {/* Label au-dessus du champ */}
      {label && (
        <Text style={[styles.label, { color: couleurLabel }]}>
          {label}
        </Text>
      )}

      {/* Conteneur du champ avec icône */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: couleurFond,
            borderColor:     couleurBordure,
            borderWidth:     focused ? 1.5 : 0,
            // Hauteur adaptée si multiline
            height: multiline ? nombreLignes * 40 : 54,
          },
          erreur && styles.inputErreur,
          !editable && styles.inputDesactive,
        ]}
      >
        {/* Icône à gauche (optionnel) */}
        {icone && (
          <Text style={styles.icone}>{icone}</Text>
        )}

        {/* Champ de saisie */}
        <TextInput
          style={[
            styles.input,
            { color: couleurTexte },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={couleurHint}
          value={valeur}
          onChangeText={onChange}
          secureTextEntry={secureText && !mdpVisible}
          keyboardType={typeClavier}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? nombreLignes : 1}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />

        {/* Bouton toggle mot de passe */}
        {secureText && (
          <TouchableOpacity
            onPress={() => setMdpVisible(!mdpVisible)}
            style={styles.toggleMdp}
          >
            <Text style={[styles.toggleTexte, { color: couleurHint }]}>
              {mdpVisible ? "Cacher" : "Voir"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message d'erreur */}
      {erreur && (
        <Text style={styles.messageErreur}>{erreur}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },

  // Label
  label: {
    fontSize:     13,
    fontWeight:   "600",
    marginBottom: 6,
  },

  // Conteneur champ + icône
  inputContainer: {
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   12,
    paddingHorizontal: 14,
    overflow:       "hidden",
  },

  // Icône à gauche
  icone: {
    fontSize:    18,
    marginRight: 10,
  },

  // Champ de saisie
  input: {
    flex:        1,
    fontSize:    15,
    height:      "100%",
    paddingVertical: 0,
  },

  // Bouton voir/cacher mot de passe
  toggleMdp: {
    paddingLeft: 8,
  },

  toggleTexte: {
    fontSize:   13,
    fontWeight: "500",
  },

  // Bordure rouge si erreur
  inputErreur: {
    borderWidth: 1.5,
    borderColor: COLORS.ERROR,
  },

  // Champ désactivé
  inputDesactive: {
    opacity: 0.6,
  },

  // Message d'erreur
  messageErreur: {
    fontSize:   12,
    color:      COLORS.ERROR,
    marginTop:  4,
    marginLeft: 4,
  },
});

export default Input;