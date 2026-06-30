import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  utilisateur: null, token: null, refreshToken: null,
  estConnecte: false, groupeActif: null, drawerOuvert: false,
  darkMode: false, panier: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION': return { ...state, utilisateur: action.utilisateur, token: action.token, refreshToken: action.refreshToken, estConnecte: true };
    case 'LOGOUT': return { ...initialState };
    case 'SET_GROUPE_ACTIF': return { ...state, groupeActif: action.groupe, panier: [] };
    case 'SET_DRAWER': return { ...state, drawerOuvert: action.value };
    case 'SET_DARK_MODE': return { ...state, darkMode: action.value };
    case 'UPDATE_UTILISATEUR': return { ...state, utilisateur: { ...state.utilisateur, ...action.updates } };
    case 'SET_PANIER': return { ...state, panier: action.panier };
    default: return state;
  }
}

export const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const actions = {
    setSession: (u, t, r) => dispatch({ type: 'SET_SESSION', utilisateur: u, token: t, refreshToken: r }),
    logout: () => dispatch({ type: 'LOGOUT' }),
    setGroupeActif: (g) => dispatch({ type: 'SET_GROUPE_ACTIF', groupe: g }),
    setDrawerOuvert: (v) => dispatch({ type: 'SET_DRAWER', value: v }),
    setDarkMode: (v) => dispatch({ type: 'SET_DARK_MODE', value: v }),
    updateUtilisateur: (u) => dispatch({ type: 'UPDATE_UTILISATEUR', updates: u }),
    setPanier: (p) => dispatch({ type: 'SET_PANIER', panier: p }),
  };
  return <StoreContext.Provider value={{ ...state, ...actions }}>{children}</StoreContext.Provider>;
}
