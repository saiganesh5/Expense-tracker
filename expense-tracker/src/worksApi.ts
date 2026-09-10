import { getToken, logout } from './authService';
import type { Work } from './types';

const SERVER_URL = (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : 'http://localhost:8080');
const API_BASE = `${SERVER_URL}/api/works`;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      window.location.reload();
    }
    const data = (await response.json().catch(() => null)) as { message?: string; detail?: string } | null;
    throw new Error(data?.message ?? data?.detail ?? `Request failed with status ${response.status}`);
  }
  return response;
}

export async function fetchWorks(): Promise<Work[]> {
  return (await request('')).json() as Promise<Work[]>;
}

export async function saveWork(work: Work): Promise<Work> {
  return (await request(`/${encodeURIComponent(work.id)}`, {
    method: 'PUT',
    body: JSON.stringify(work),
  })).json() as Promise<Work>;
}

export async function removeWork(id: string): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
