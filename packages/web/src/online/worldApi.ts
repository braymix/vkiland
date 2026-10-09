/** API REST di «Vikings Around the World»: override delle mappe (lettura pubblica, scrittura admin). */
import type { MapOverride } from '@vikiland/engine-world';
import type { OnlineSession } from './connection';

export async function apiGetMapOverride(serverUrl: string, mapId: string, timeoutMs = 2500): Promise<MapOverride | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/maps/${encodeURIComponent(mapId)}`, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { override?: MapOverride | null };
    return data.override ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiSaveMapOverride(
  session: OnlineSession,
  mapId: string,
  body: { names: Record<string, string>; removed: string[] } | { reset: true }
): Promise<MapOverride | null> {
  const res = await fetch(`${session.serverUrl}/api/admin/maps/${encodeURIComponent(mapId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { override?: MapOverride | null; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Errore ${res.status}`);
  return data.override ?? null;
}
