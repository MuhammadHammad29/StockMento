import 'dotenv/config';
import { PrismaClient, AdminStatus } from '@prisma/client';
import { hash, compare } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const adminName = process.env.ADMIN_NAME ?? 'Administrator';

  if (!adminEmail) {
    throw new Error(
      'ADMIN_EMAIL must be set in the environment before seeding the admin account.',
    );
  }

  const existingAdmin = await prisma.adminIdentity.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    let passwordHash: string;

    if (adminPasswordHash) {
      passwordHash = adminPasswordHash;
    } else if (adminPassword) {
      passwordHash = await hash(adminPassword, 10);
    } else {
      throw new Error(
        'Provide ADMIN_PASSWORD or ADMIN_PASSWORD_HASH to seed the initial admin account.',
      );
    }

    await prisma.adminIdentity.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        status: AdminStatus.active,
      },
    });

    console.info(`Seeded admin account for ${adminEmail}.`);
    return;
  }

  const updates: {
    name?: string;
    passwordHash?: string;
    status?: AdminStatus;
    updatedAt?: Date;
  } = {};

  if (existingAdmin.name !== adminName) {
    updates.name = adminName;
  }

  if (existingAdmin.status !== AdminStatus.active) {
    updates.status = AdminStatus.active;
  }

  if (adminPasswordHash && existingAdmin.passwordHash !== adminPasswordHash) {
    updates.passwordHash = adminPasswordHash;
  } else if (!adminPasswordHash && adminPassword) {
    const passwordMatches = await compare(
      adminPassword,
      existingAdmin.passwordHash,
    );

    if (!passwordMatches) {
      updates.passwordHash = await hash(adminPassword, 10);
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await prisma.adminIdentity.update({
      where: { email: adminEmail },
      data: updates,
    });
    console.info(`Updated admin account for ${adminEmail}.`);
  } else {
    console.info(`Admin account for ${adminEmail} already up to date.`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed admin account:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
