/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  APPNAVIGATOR.JS                                             ║
 * ║                                                              ║
 * ║  Navigateur principal de l'application (Bottom Tabs).        ║
 * ║  Accessible uniquement si l'utilisateur EST connecté.        ║
 * ║                                                              ║
 * ║  5 onglets :                                                 ║
 * ║  1. Ventes   → Liste produits + panier                       ║
 * ║  2. Dettes   → Clients débiteurs + scores                    ║
 * ║  3. Stock    → Produits, mouvements, alertes                 ║
 * ║  4. Groupes  → Points de vente + membres                     ║
 * ║  5. Profil   → Dashboard + statistiques                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import VentesScreen  from "../screens/ventes/VentesScreen";
import DettesScreen  from "../screens/dettes/DettesScreen";
import StockScreen   from "../screens/stock/StockScreen";
import GroupesScreen from "../screens/groupes/GroupesScreen";
import ProfilScreen  from "../screens/profil/ProfilScreen";

import useStore      from "../store/useStore";
import { COLORS }   from "../utils/constants";

// Création du navigateur Bottom Tabs
const Tab = createBottomTabNavigator();

// ── Icônes textuelles (on utilisera des emojis en attendant) ───
/*
 * Note : Dans la version finale, on pourrait utiliser
 * @expo/vector-icons ou react-native-vector-icons pour
 * des vraies icônes vectorielles.
 * Pour l'instant, on utilise des emojis pour la lisibilité.
 */
const ICONES = {
  Ventes:  "🏪",
  Dettes:  "📋",
  Stock:   "📦",
  Groupes: "👥",
  Profil:  "👤",
};

// ── Composant Tab Bar personnalisé ─────────────────────────────
/*
 * On crée notre propre tab bar pour respecter les maquettes.
 * Fond blanc (mode clair) ou sombre (mode nuit).
 * Icône + label avec couleur orange si sélectionné.
 */
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets   = useSafeAreaInsets();
  const darkMode = useStore((s) => s.darkMode);
  const panier   = useStore((s) => s.panier);

  // Nombre total d'articles dans le panier (badge)
  const nbArticlesPanier = panier.reduce((t, l) => t + l.quantite, 0);

  return (
    <View
      style={[
        styles.tabBar,
        {
          // Couleur de fond selon le thème
          backgroundColor: darkMode
            ? COLORS.SURFACE_DARK
            : COLORS.SURFACE_LIGHT,
          // Respecter la zone sécurisée en bas (iPhone notch)
          paddingBottom: insets.bottom || 8,
          // Bordure en haut
          borderTopColor: darkMode
            ? COLORS.BG_CARD_DARK
            : COLORS.GRAY_LIGHT,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options }  = descriptors[route.key];
        const isFocused    = state.index === index;
        const icone        = ICONES[route.name] || "●";

        const onPress = () => {
          const event = navigation.emit({
            type:   "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {/* Icône avec badge panier sur Ventes */}
            <View style={styles.iconeContainer}>
              <Text
                style={[
                  styles.icone,
                  // Taille légèrement plus grande si sélectionné
                  isFocused && styles.iconeFocused,
                ]}
              >
                {icone}
              </Text>

              {/* Badge nombre articles panier (uniquement sur Ventes) */}
              {route.name === "Ventes" && nbArticlesPanier > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {nbArticlesPanier > 99 ? "99+" : nbArticlesPanier}
                  </Text>
                </View>
              )}
            </View>

            {/* Label de l'onglet */}
            <Text
              style={[
                styles.label,
                {
                  // Orange si sélectionné, gris sinon
                  color: isFocused
                    ? COLORS.ORANGE
                    : darkMode
                    ? COLORS.TEXT_SECONDARY_DARK
                    : COLORS.TEXT_SECONDARY_LIGHT,
                  fontWeight: isFocused ? "700" : "400",
                },
              ]}
            >
              {route.name}
            </Text>

            {/* Indicateur ligne orange sous l'onglet actif */}
            {isFocused && (
              <View style={styles.indicateur} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ── Navigateur principal ───────────────────────────────────────
const AppNavigator = () => {
  return (
    <Tab.Navigator
      // Utiliser notre tab bar personnalisée
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        // Pas de header (on gère dans chaque screen)
        headerShown: false,
      }}
    >
      <Tab.Screen name="Ventes"  component={VentesScreen}  />
      <Tab.Screen name="Dettes"  component={DettesScreen}  />
      <Tab.Screen name="Stock"   component={StockScreen}   />
      <Tab.Screen name="Groupes" component={GroupesScreen} />
      <Tab.Screen name="Profil"  component={ProfilScreen}  />
    </Tab.Navigator>
  );
};

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Conteneur principal de la tab bar
  tabBar: {
    flexDirection:  "row",
    height:         68,
    borderTopWidth: 1,
    elevation:      8,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: -2 },
    shadowOpacity:  0.08,
    shadowRadius:   4,
  },

  // Chaque onglet
  tabItem: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingTop:     8,
    position:       "relative",
  },

  // Conteneur icône (pour badge)
  iconeContainer: {
    position: "relative",
  },

  // Icône emoji
  icone: {
    fontSize: 22,
  },

  // Icône légèrement plus grande si sélectionné
  iconeFocused: {
    fontSize: 24,
  },

  // Badge rouge avec nombre d'articles
  badge: {
    position:        "absolute",
    top:             -6,
    right:           -10,
    backgroundColor: COLORS.ERROR,
    borderRadius:    10,
    minWidth:        18,
    height:          18,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 4,
  },

  // Texte du badge
  badgeText: {
    color:      COLORS.WHITE,
    fontSize:   10,
    fontWeight: "700",
  },

  // Label texte
  label: {
    fontSize:   10,
    marginTop:  2,
  },

  // Ligne indicateur orange
  indicateur: {
    position:        "absolute",
    top:             0,
    width:           24,
    height:          3,
    backgroundColor: COLORS.ORANGE,
    borderRadius:    2,
  },
});

export default AppNavigator;