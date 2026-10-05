import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './guards/auth.guard.js';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ada@example.com',
};

describe('POST /auth/login throttle', () => {
  let app: INestApplication;
  const login = vi.fn().mockResolvedValue(USER);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'login', ttl: seconds(60), limit: 5 },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login },
        },
      ],
    })
      // GET /auth/me registers AuthGuard; override it so bootstrap does not construct Prisma.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 429 on the 6th login from the same IP', async () => {
    const body = { email: 'ada@example.com', password: 'secret' };
    const server = app.getHttpServer();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(server).post('/auth/login').send(body);
      expect(response.status, `attempt ${attempt}`).toBe(200);
    }

    const blocked = await request(server).post('/auth/login').send(body);
    expect(blocked.status).toBe(429);
    expect(login).toHaveBeenCalledTimes(5);
  });
});
