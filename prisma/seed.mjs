import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "barath.kumar@digitalwebsolutions.in";
  const plainPassword = "Barath@123";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  console.log(`Admin ensured: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
