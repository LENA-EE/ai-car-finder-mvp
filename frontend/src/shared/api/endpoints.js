import { API_URL } from "@/shared/config";

export const endpoints = {
  // Public
  parse: `${API_URL}/api/v1/parse`,
  car: (id) => `${API_URL}/api/v1/cars/${id}`,
  // Auth
  login: `${API_URL}/api/v1/admin/auth/login`,

  // Admin
  analytics: `${API_URL}/api/v1/admin/analytics`,
  prompts: `${API_URL}/api/v1/admin/prompts`,

  // Catalog
  catalogUpload: `${API_URL}/api/v1/admin/catalog/upload`,
  catalog: `${API_URL}/api/v1/admin/catalog`,

  // Errors
  errors: (resolved = false) => `${API_URL}/api/v1/admin/errors?resolved=${resolved}`,
  errorResolve: (id) => `${API_URL}/api/v1/admin/errors/${id}/resolve`,
  errorDelete: (id) => `${API_URL}/api/v1/admin/errors/${id}`,
};
