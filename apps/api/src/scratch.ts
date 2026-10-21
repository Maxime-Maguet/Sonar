import { FranceTravailClient } from './la-bonne-boite/helpers/france-travail.client.js';
import { ConfigService } from '@nestjs/config';

const client = new FranceTravailClient(new ConfigService());

await client.search({
  rome: 'M1805',
  citycode: '31555',
  distance: 10,
  page: 1,
  page_size: 5,
});
