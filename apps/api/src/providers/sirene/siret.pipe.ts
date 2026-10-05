import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const siretPattern = /^[0-9]{14}$/;

@Injectable()
export class SiretPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !siretPattern.test(value)) {
      throw new BadRequestException('SIRET invalide : 14 chiffres attendus');
    }
    return value;
  }
}
