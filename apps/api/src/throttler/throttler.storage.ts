import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { ThrottlerHitResult } from './throttler.interfaces.js';

/** Intervalle de purge des enregistrements inactifs (ms). */
export const SWEEP_INTERVAL_MS = 60_000;

interface HitRecord {
  /** Dates (ms) d'expiration des requêtes comptées, en ordre croissant. */
  hits: number[];
  /** Fin du blocage (ms) ; 0 si non bloqué. */
  blockedUntil: number;
  /** Plus grande fin de validité connue, pour la purge. */
  lastExpiry: number;
}

/**
 * Stockage en mémoire, propre à l'instance. Même algorithme que
 * @nestjs/throttler (blockDuration = ttl) : `limit` requêtes sont admises sur
 * une fenêtre glissante de `ttl` ms ; la requête suivante bloque la clé
 * pendant `ttl` ms, puis le compteur repart de zéro.
 *
 * Mémoire bornée : un enregistrement contient au plus `limit + 1` dates, et
 * les enregistrements expirés sont supprimés par une purge périodique
 * (timer `unref`, il ne retient pas le processus) lancée à la demande.
 */
@Injectable()
export class ThrottlerStorage implements OnApplicationShutdown {
  private readonly records = new Map<string, HitRecord>();
  private sweepTimer: NodeJS.Timeout | undefined;

  get size(): number {
    return this.records.size;
  }

  increment(key: string, ttl: number, limit: number): ThrottlerHitResult {
    this.ensureSweep();
    const now = Date.now();
    let record = this.records.get(key);
    if (!record) {
      record = { hits: [], blockedUntil: 0, lastExpiry: 0 };
      this.records.set(key, record);
    }

    if (record.blockedUntil > now) {
      return {
        totalHits: limit + 1,
        timeToExpire: this.secondsUntil(
          record.hits[0] ?? record.blockedUntil,
          now,
        ),
        isBlocked: true,
        timeToBlockExpire: this.secondsUntil(record.blockedUntil, now),
      };
    }
    if (record.blockedUntil > 0) {
      // Blocage terminé : le compteur repart de zéro.
      record.blockedUntil = 0;
      record.hits = [];
    }

    record.hits = record.hits.filter((expiresAt) => expiresAt > now);
    record.hits.push(now + ttl);
    record.lastExpiry = now + ttl;

    if (record.hits.length > limit) {
      record.blockedUntil = now + ttl;
      record.lastExpiry = Math.max(record.lastExpiry, record.blockedUntil);
      return {
        totalHits: record.hits.length,
        timeToExpire: this.secondsUntil(record.hits[0], now),
        isBlocked: true,
        timeToBlockExpire: this.secondsUntil(record.blockedUntil, now),
      };
    }

    return {
      totalHits: record.hits.length,
      timeToExpire: this.secondsUntil(record.hits[0], now),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /** Supprime les enregistrements dont plus rien n'est actif. */
  evictIdleRecords(now: number = Date.now()): void {
    for (const [key, record] of this.records) {
      if (record.lastExpiry <= now && record.blockedUntil <= now) {
        this.records.delete(key);
      }
    }
  }

  onApplicationShutdown(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = undefined;
    }
    this.records.clear();
  }

  private ensureSweep(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(
      () => this.evictIdleRecords(),
      SWEEP_INTERVAL_MS,
    );
    this.sweepTimer.unref();
  }

  private secondsUntil(target: number, now: number): number {
    return Math.max(0, Math.ceil((target - now) / 1000));
  }
}
