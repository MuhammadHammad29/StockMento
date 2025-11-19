"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcrypt_1 = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    const adminName = process.env.ADMIN_NAME ?? 'Administrator';
    const adminAvatarUrl = process.env.ADMIN_AVATAR_URL ?? '/avatars/avatar_admin.png';
    if (!adminEmail) {
        throw new Error('ADMIN_EMAIL must be set in the environment before seeding the admin account.');
    }
    const existingAdmin = await prisma.adminIdentity.findUnique({
        where: { email: adminEmail },
    });
    if (!existingAdmin) {
        let passwordHash;
        if (adminPasswordHash) {
            passwordHash = adminPasswordHash;
        }
        else if (adminPassword) {
            passwordHash = await (0, bcrypt_1.hash)(adminPassword, 10);
        }
        else {
            throw new Error('Provide ADMIN_PASSWORD or ADMIN_PASSWORD_HASH to seed the initial admin account.');
        }
        await prisma.adminIdentity.create({
            data: {
                email: adminEmail,
                name: adminName,
                passwordHash,
                avatarUrl: adminAvatarUrl,
                status: client_1.AdminStatus.active,
            },
        });
        console.info(`Seeded admin account for ${adminEmail}.`);
        return;
    }
    const updates = {};
    if (existingAdmin.name !== adminName) {
        updates.name = adminName;
    }
    if (existingAdmin.status !== client_1.AdminStatus.active) {
        updates.status = client_1.AdminStatus.active;
    }
    if (existingAdmin.avatarUrl !== adminAvatarUrl) {
        updates.avatarUrl = adminAvatarUrl;
    }
    if (adminPasswordHash && existingAdmin.passwordHash !== adminPasswordHash) {
        updates.passwordHash = adminPasswordHash;
    }
    else if (!adminPasswordHash && adminPassword) {
        const passwordMatches = await (0, bcrypt_1.compare)(adminPassword, existingAdmin.passwordHash);
        if (!passwordMatches) {
            updates.passwordHash = await (0, bcrypt_1.hash)(adminPassword, 10);
        }
    }
    if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await prisma.adminIdentity.update({
            where: { email: adminEmail },
            data: updates,
        });
        console.info(`Updated admin account for ${adminEmail}.`);
    }
    else {
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
//# sourceMappingURL=seed.js.map