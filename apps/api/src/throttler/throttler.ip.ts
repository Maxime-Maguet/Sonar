import { isIP } from 'node:net';

/** Un visiteur IPv6 contrôle tout son /64 : on compte par sous-réseau. */
export const DEFAULT_IPV6_SUBNET_PREFIX = 64;

function toHextets(address: string): number[] | null {
  let head = address;
  const lastColon = head.lastIndexOf(':');
  const tail = head.slice(lastColon + 1);
  if (tail.includes('.')) {
    const octets = tail.split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)
    ) {
      return null;
    }
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    head = `${head.slice(0, lastColon + 1)}${high}:${low}`;
  }
  const sides = head.split('::');
  if (sides.length > 2) return null;
  const left = sides[0] ? sides[0].split(':') : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(':') : [];
  const fill = sides.length === 2 ? 8 - left.length - right.length : 0;
  if (fill < 0 || left.length + fill + right.length !== 8) return null;
  const groups = [
    ...left,
    ...Array.from({ length: fill }, () => '0'),
    ...right,
  ];
  const hextets = groups.map((group) => parseInt(group, 16));
  if (hextets.some((h) => !Number.isInteger(h) || h < 0 || h > 0xffff)) {
    return null;
  }
  return hextets;
}

function maskHextets(hextets: number[], prefix: number): number[] {
  return hextets.map((hextet, index) => {
    const bitsBefore = index * 16;
    if (prefix >= bitsBefore + 16) return hextet;
    if (prefix <= bitsBefore) return 0;
    const keep = prefix - bitsBefore;
    return hextet & ((0xffff << (16 - keep)) & 0xffff);
  });
}

function formatIpv6(hextets: number[]): string {
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;
  for (let index = 0; index < hextets.length; index++) {
    if (hextets[index] !== 0) {
      runStart = -1;
      runLength = 0;
      continue;
    }
    if (runStart === -1) runStart = index;
    runLength++;
    if (runLength > bestLength) {
      bestStart = runStart;
      bestLength = runLength;
    }
  }
  const groups = hextets.map((h) => h.toString(16));
  if (bestLength < 2) return groups.join(':');
  return `${groups.slice(0, bestStart).join(':')}::${groups
    .slice(bestStart + bestLength)
    .join(':')}`;
}

/**
 * Normalise l'adresse du visiteur pour la clé de comptage : IPv4 telle quelle,
 * IPv4 mappée en IPv6 ramenée en IPv4, IPv6 réduite à son sous-réseau /64.
 */
export function normalizeIp(
  ip: string | undefined,
  ipv6SubnetPrefix: number = DEFAULT_IPV6_SUBNET_PREFIX,
): string | undefined {
  if (typeof ip !== 'string' || ip.length === 0) return ip;
  const zoneIndex = ip.indexOf('%');
  const bare = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);
  const version = isIP(bare);
  if (version === 4) return bare;
  if (version !== 6) return ip;
  const hextets = toHextets(bare.toLowerCase());
  if (!hextets) return ip;
  const isLoopback =
    hextets[7] === 1 && hextets.slice(0, 7).every((h) => h === 0);
  if (isLoopback) return '::1';
  const isIpv4Mapped =
    hextets.slice(0, 5).every((h) => h === 0) && hextets[5] === 0xffff;
  if (isIpv4Mapped) {
    return [
      hextets[6] >> 8,
      hextets[6] & 0xff,
      hextets[7] >> 8,
      hextets[7] & 0xff,
    ].join('.');
  }
  const prefix = Number.isFinite(ipv6SubnetPrefix)
    ? Math.min(Math.max(Math.trunc(ipv6SubnetPrefix), 0), 128)
    : DEFAULT_IPV6_SUBNET_PREFIX;
  return `${formatIpv6(maskHextets(hextets, prefix))}/${prefix}`;
}
