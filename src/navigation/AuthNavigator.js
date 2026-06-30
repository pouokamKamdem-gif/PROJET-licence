/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AUTHNAVIGATOR.JS                                            ║
 * ║                                                              ║
 * ║  Navigateur pour les écrans d'authentification.              ║
 * ║  Accessible uniquement si l'utilisateur n'est PAS connecté.  ║
 * ║                                                              ║
 * ║  Écrans :                                                    ║
 * ║  - LoginScreen    → Connexion (écran par défaut)             ║
 * ║  - RegisterScreen → Inscription                              ║
 * ║  - ResetScreen    → Récupération mot de passe                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen    from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Création du navigateur Stack
const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      // Écran de départ : connexion
      initialRouteName="Login"
      screenOptions={{
        // Pas de header visible (on gère notre propre header)
        headerShown: false,
        // Animation de transition entre écrans
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange:  [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      {/* Écran de connexion */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Connexion" }}
      />

      {/* Écran d'inscription */}
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Inscription" }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;