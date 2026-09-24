import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

// bcrypt tronque en silence au-delà de 72 octets. On refuse avant.
const BCRYPT_MAX_BYTES = 72;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    this.assertPassword(plain);
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verify(plain: string, passwordHash: string): Promise<boolean> {
    if (plain.trim() === '' || passwordHash.trim() === '') {
      return false;
    }
    try {
      return await bcrypt.compare(plain, passwordHash);
    } catch {
      return false;
    }
  }

  private assertPassword(plain: string): void {
    if (plain.trim() === '') {
      throw new BadRequestException('Password is required', {
        cause: new Error('Password is required'),
      });
    }
    if (Buffer.byteLength(plain, 'utf8') > BCRYPT_MAX_BYTES) {
      throw new BadRequestException('Password exceeds 72 bytes', {
        cause: new Error('Password exceeds 72 bytes'),
      });
    }
  }
}
