const SERVER_URL = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : 'http://localhost:8080');
const API_BASE = `${SERVER_URL}/api/auth`;

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  message: string;
}

export interface AuthError {
  message: string;
}

const TOKEN_KEY = 'expense-tracker-token';
const USER_KEY = 'expense-tracker-user';

export interface StoredUser {
  email: string;
  fullName: string;
}

async function parseResponseBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { message: `Request failed with status ${res.status}` };
  }
}

/** Sign up a new user. */
export async function signup(
  fullName: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  });

  const data = await parseResponseBody(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Signup failed');
  }

  const authData = data as unknown as AuthResponse;
  saveAuth(authData);
  return authData;
}

/** Log in an existing user. */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseResponseBody(res);
  if (!res.ok) {
    throw new Error((data.message as string) || 'Login failed');
  }

  const authData = data as unknown as AuthResponse;
  saveAuth(authData);
  return authData;
}

/** Persist token + user info to localStorage. */
function saveAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({ email: data.email, fullName: data.fullName })
  );
}

/** Get the stored JWT token (or null). */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Get the stored user info (or null). */
export function getUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Check if a user is currently logged in. */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/** Log out — clear stored credentials. */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
