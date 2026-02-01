import { getToken, removeToken, removeUser } from "@/shared/lib/storage/auth";

export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    removeToken();
    removeUser();
    window.location.reload();
  }
  return res;
};
