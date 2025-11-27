import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient()

async function main() {
await prisma.weapon.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: "Pistolet startowy",
      description: "Podstawowa broń dla początkujących graczy.",
      priceCoins: 0,
      priceCash: 0,
      accuracy: 0,
      amunition: 18,
      category: "smg",
      fireInterval: 150,
      max_damage: 10,
      min_damage: 5,
      reloadTime: 2500
    },
    update: {
      name: "Pistolet startowy",
      description: "Podstawowa broń dla początkujących graczy.",
      priceCoins: 0,
      priceCash: 0,
      accuracy: 0,
      amunition: 18,
      category: "smg",
      fireInterval: 150,
      max_damage: 10,
      min_damage: 5,
      reloadTime: 2500
    }
  });

  await prisma.weapon.upsert({
    where: { id: 2 },
    create: {
      id: 2,
      name: "GS100S",
      description: "Green automatic laser",
      priceCoins: 20000,
      priceCash: 100,
      accuracy: 1,
      amunition: 25,
      category: "rifle",
      fireInterval: 100,
      max_damage: 100,
      min_damage: 50,
      reloadTime: 2000
    },
    update: {
      name: "GS100S",
      description: "Green automatic laser",
      priceCoins: 20000,
      priceCash: 100,
      accuracy: 1,
      amunition: 25,
      category: "rifle",
      fireInterval: 100,
      max_damage: 100,
      min_damage: 50,
      reloadTime: 2000
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })