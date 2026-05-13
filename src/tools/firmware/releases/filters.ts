import type { Release } from './releases.types';

const stripV = (v: string) => v.replace(/^v/i, '');

export function isBeta(version: string): boolean {
  return /^\d+\.\d+\.\d+[a-z]/.test(stripV(version));
}

type Parts = { major: number; minor: number; patch: number };

function corePartsOrNull(version: string): Parts | null {
  const m = stripV(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

const V1_FLOOR: Parts = { major: 1, minor: 0, patch: 0 };

function cmpParts(a: Parts, b: Parts): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** Releases below v1.0.0 never appear — eisei launch baseline. */
export function aboveFloor(version: string): boolean {
  const parts = corePartsOrNull(version);
  if (!parts) return false;
  return cmpParts(parts, V1_FLOOR) >= 0;
}

export function filterReleases(
  releases: Release[],
  opts: { showBetas: boolean },
): Release[] {
  return releases.filter((r) => {
    if (!aboveFloor(r.version)) return false;
    if (!opts.showBetas && isBeta(r.version)) return false;
    return true;
  });
}

export function latestStable(releases: Release[]): Release | undefined {
  return releases.find((r) => aboveFloor(r.version) && !isBeta(r.version));
}
