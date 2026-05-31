import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.enableCors();
  // 本地 Logo 静态访问
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads' });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}/api`);
}
bootstrap();
