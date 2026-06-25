import axios from "axios"

const API_URL = "http://localhost:8083/api/produits";

export const createProduit = (data) => {
    return axios.post(API_URL, data);
};

export const getProduitByBoutique = (id) => {
    return axios.get(`${API_URL}/boutique/${id}`);
};