/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BUTTON.JS                                                   ║
 * ║                                                              ║
 * ║  Composant bouton réutilisable avec plusieurs variantes :    ║
 * ║  - primary   : fond orange (action principale)               ║
 * ║  - secondary : contour orange (action secondaire)            ║
 * ║  - dark      : fond sombre (pour thème dark)                 ║
 * ║  - danger    : fond rouge (action destructive)               ║
 * ║                                                              ║
 * ║  Props :                                                     ║
 * ║  - titre      : texte du bouton                              ║
 * ║  - onPress    : fonction appelée au clic                     ║
 * ║  - variante   : "primary" | "secondary" | "dark" | "danger" ║
 * ║  - chargement : affiche un spinner si true                   ║
 * ║  - desactive  : désactive le bouton                          ║
 * ║  - style      : styles supplémentaires                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { COLORS } from "../../utils/constants";

const Button = ({
  titre,
  onPress,
  variante   = "primary",
  chargement = false,
  desactive  = false,
  style      = {},
  textStyle  = {},
  icone      = null,
}) => {
  // ── Styles selon la variante ───────────────────────────────
  const getStyles = () => {
    switch (variante) {
      case "secondary":
        return {
          btn:   styles.btnSecondary,
          texte: styles.texteSecondary,
        };
      case "dark":
        return {
          btn:   styles.btnDark,
          texte: styles.texteDark,
        };
      case "danger":
        return {
          btn:   styles.btnDanger,
          texte: styles.textePrimary,
        };
      default: // primary
        return {
          btn:   styles.btnPrimary,
          texte: styles.textePrimary,
        };
    }
  };

  const { btn, texte } = getStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={chargement || desactive}
      activeOpacity={0.8}
      style={[
        styles.base,
        btn,
        // Opacité réduite si désactivé
        (chargement || desactive) && styles.desactive,
        style,
      ]}
    >
      {chargement ? (
        // Spinner pendant le chargement
        <ActivityIndicator
          size="small"
          color={variante === "secondary" ? COLORS.ORANGE : COLORS.WHITE}
        />
      ) : (
        <View style={styles.contenu}>
          {/* Icône optionnelle à gauche */}
          {icone && <Text style={styles.icone}>{icone}</Text>}
          {/* Texte du bouton */}
          <Text style={[styles.texteBase, texte, textStyle]}>
            {titre}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Style de base commun à tous les boutons
  base: {
    height:         54,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // Variante primary : fond orange
  btnPrimary: {
    backgroundColor: COLORS.ORANGE,
    shadowColor:     COLORS.ORANGE,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       4,
  },

  // Variante secondary : contour orange, fond transparent
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth:     2,
    borderColor:     COLORS.ORANGE,
  },

  // Variante dark : fond sombre
  btnDark: {
    backgroundColor: COLORS.SURFACE_DARK,
  },

  // Variante danger : fond rouge
  btnDanger: {
    backgroundColor: COLORS.ERROR,
  },

  // Texte blanc (primary, dark, danger)
  texteBase: {
    fontSize:   16,
    fontWeight: "700",
  },

  textePrimary: {
    color: COLORS.WHITE,
  },

  // Texte orange (secondary)
  texteSecondary: {
    color: COLORS.ORANGE,
  },

  texteDark: {
    color: COLORS.WHITE,
  },

  // État désactivé
  desactive: {
    opacity: 0.5,
  },

  // Conteneur icône + texte
  contenu: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },

  // Icône
  icone: {
    fontSize: 18,
  },
});

export default Button;