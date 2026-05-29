export type SemverParts = [number, number, number];

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)/;

export function parseSemver(raw: string): SemverParts | null {
  const trimmed = raw.trim();
  const m = trimmed.match(SEMVER_RE);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

export function isSemverLessThan(current: string, target: string): boolean {
  const cmp = compareSemver(current, target);
  return cmp === -1;
}
