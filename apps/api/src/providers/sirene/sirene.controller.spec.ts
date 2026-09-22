import { Test, TestingModule } from '@nestjs/testing';
import { SireneController } from './sirene.controller';

describe('SireneController', () => {
  let controller: SireneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SireneController],
    }).compile();

    controller = module.get<SireneController>(SireneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
