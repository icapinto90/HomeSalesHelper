import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function buildHeaders(includeAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  includeAuth = true,
): Promise<T> {
  const headers = await buildHeaders(includeAuth);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),

  /** Upload multipart form data (photos, etc.) */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, `HTTP ${res.status}`, body);
    }
    return res.json() as Promise<T>;
  },
};
