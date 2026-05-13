/**
 * Fetch a firmware binary URL as a Blob. Tries the no-cache path first
 * and falls back to the default cache mode if CORS is fussy — matches
 * the legacy FirmwareSelector behaviour.
 */
export async function fetchBinary(url: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
  } catch {
    res = await fetch(url);
  }
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}
