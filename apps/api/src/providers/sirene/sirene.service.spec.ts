import { Test, TestingModule } from '@nestjs/testing';
import { SireneService } from './sirene.service';

describe('SireneService', () => {
  let service: SireneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SireneService],
    }).compile();

    service = module.get<SireneService>(SireneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
