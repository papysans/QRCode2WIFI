import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encryptSecret } from '../src/common/crypto.util';

const prisma = new PrismaClient();

async function main() {
  // 后台管理员 admin / admin123
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
    },
    update: {},
  });

  // 默认 eCPM
  await prisma.setting.upsert({
    where: { key: 'ecpm' },
    create: { key: 'ecpm', value: '30' },
    update: {},
  });

  // 演示店铺
  const openid = 'mock-demo-owner';
  await prisma.user.upsert({
    where: { openid },
    create: { openid },
    update: {},
  });
  await prisma.shop.upsert({
    where: { sid: 'Ab8K29' },
    create: {
      sid: 'Ab8K29',
      ownerOpenid: openid,
      name: 'XX咖啡',
      wifiSsid: 'XX_Coffee_Free',
      wifiPassword: encryptSecret('coffee2024'),
      reviewLink: 'https://example.com/review',
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log('seed done: admin/admin123, shop sid=Ab8K29');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
