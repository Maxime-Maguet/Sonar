import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

// Limite technique de l'algorithme Bcrypt : au-delà de 72 octets (bytes),
// Bcrypt ignore et tronque la suite du mot de passe.
const BCRYPT_MAX_BYTES = 72;

// Nombre de "tours de hachage" (cost factor).
// 12 est le standard actuel recommandé : bon équilibre entre sécurité et temps de calcul serveur (~250ms).
const BCRYPT_ROUNDS = 12;

/**
 * Service dédié au hachage et à la vérification sécurisée des mots de passe.
 */
@Injectable()
export class PasswordService {
  /**
   * Valide puis hache un mot de passe en clair.
   *
   * @param plain - Le mot de passe en clair à hacher
   * @returns Le mot de passe haché (hash + sel inclus)
   */
  async hash(plain: string): Promise<string> {
    // 1. Vérification préliminaire du mot de passe
    this.assertPassword(plain);

    // 2. Génération du hash sécurisé via bcrypt
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /**
   * Compare un mot de passe en clair avec son équivalent haché stocké en BDD.
   *
   * @param plain - Le mot de passe en clair fourni par l'utilisateur lors du login
   * @param passwordHash - Le hash stocké en base de données
   * @returns `true` si le mot de passe correspond, `false` sinon
   */
  async verify(plain: string, passwordHash: string): Promise<boolean> {
    // Si l'un des deux champs est vide, on rejette immédiatement (évite les calculs inutiles)
    if (plain.trim() === '' || passwordHash.trim() === '') {
      return false;
    }

    try {
      // bcrypt.compare gère en interne la protection contre les attaques par analyse temporelle (timing attacks)
      return await bcrypt.compare(plain, passwordHash);
    } catch {
      // En cas d'erreur (ex: format du hash corrompu en BDD), on ne fait pas crasher l'app, on refuse l'accès
      return false;
    }
  }

  /**
   * Méthode privée de garde : vérifie que le mot de passe respecte les contraintes minimales et techniques.
   * Lève une exception NestJS (HTTP 400 Bad Request) si le mot de passe est invalide.
   *
   * @param plain - Le mot de passe en clair à vérifier
   */
  private assertPassword(plain: string): void {
    // Refuse les mots de passe vides ou remplis uniquement d'espaces
    if (plain.trim() === '') {
      throw new BadRequestException('Password is required', {
        cause: new Error('Password is required'),
      });
    }

    // Vérifie la taille réelle EN OCTETS (et non juste en nombre de caractères)
    // Car certains caractères/emojis prennent plusieurs octets en UTF-8 !
    if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_BYTES) {
      throw new BadRequestException('Password exceeds 72 bytes', {
        cause: new Error('Password exceeds 72 bytes'),
      });
    }
  }
}
