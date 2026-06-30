/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CARD.JS                                                     ║
 * ║                                                              ║
 * ║  Composant carte réutilisable.                               ║
 * ║  Utilisé pour afficher les produits, dettes, membres...      ║
 * ║                                                              ║
 * ║  Props :                                                     ║
 * ║  - children   : contenu de la carte                          ║
 * ║  - onPress    : rendre la carte cliquable                    ║
 * ║  - dark       : style sombre                                 ║
 * ║  - style      : styles supplémentaires                       ║
 * ║  - bordureGauche : couleur de bordure colorée à gauche       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { COLORS } from "../../utils/constants";

const Card = ({
  children,
  onPress,
  onLongPress,
  dark          = false,
  style         = {},
  bordureGauche = null,
}) => {
  // Couleur de fond selon le thème
  const couleurFond = dark ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT;

  const contenu = (
    <View
      style={[
        styles.card,
        { backgroundColor: couleurFond },
        style,
      ]}
    >
      {/* Bordure colorée à gauche (pour les dettes/scores) */}
      {bordureGauche && (
        <View
          style={[
            styles.bordureGauche,
            { backgroundColor: bordureGauche },
          ]}
        />
      )}

      {/* Contenu de la carte */}
      <View style={[
        styles.contenu,
        bordureGauche && styles.contenuAvecBordure,
      ]}>
        {children}
      </View>
    </View>
  );

  // Si onPress → TouchableOpacity, sinon View simple
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.85}
      >
        {contenu}
      </TouchableOpacity>
    );
  }

  return contenu;
};

const styles = StyleSheet.create({
  card: {
    borderRadius:  16,
    marginBottom:  10,
    flexDirection: "row",
    overflow:      "hidden",
    // Ombre légère
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },

  // Bordure colorée à gauche
  bordureGauche: {
    width: 4,
  },

  // Contenu principal
  contenu: {
    flex:    1,
    padding: 14,
  },

  // Décalage si bordure gauche
  contenuAvecBordure: {
    paddingLeft: 12,
  },
});

export default Card;