import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

const WS_KEY = "mom.workspaceId";

export function setAuthToken(token) {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
}

export function setWorkspaceId(workspaceId) {
  if (workspaceId) {
    localStorage.setItem(WS_KEY, String(workspaceId));
  } else {
    localStorage.removeItem(WS_KEY);
  }
}

API.interceptors.request.use((config) => {
  const wsId = localStorage.getItem(WS_KEY);
  if (wsId) {
    // eslint-disable-next-line no-param-reassign
    config.headers["x-workspace-id"] = wsId;
  }
  return config;
});

export default API;