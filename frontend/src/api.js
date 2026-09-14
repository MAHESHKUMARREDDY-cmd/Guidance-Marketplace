import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "http://localhost:4000");

export const api = axios.create({ baseURL: `${API_URL}/api` });

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }
}

const savedToken = localStorage.getItem("token");
if (savedToken) setAuthToken(savedToken);

export { API_URL };
