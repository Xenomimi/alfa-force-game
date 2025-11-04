import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient()

async function main() {
  const defaultWeapon = await prisma.weapon.upsert({
    where: { id: 1 }, // Zakładam, że chcesz sprawdzić, czy broń o id = 1 istnieje
    create: {
      name: 'Pistolet startowy',
      description: 'Podstawowa broń dla początkujących graczy.',
      min_damage: 5,
      max_damage: 10,
      amunition: 12,
      reloadTime: 1.5,
      fireInterval: 0.5,
      accuracy: 0.8,
      priceCoins: 0,
      priceCash: 0,
      category: 'smg',
    },
    update: {
      name: 'Pistolet startowy', // Upewnij się, że masz tu te same dane, co w `create`
      description: 'Podstawowa broń dla początkujących graczy.',
      min_damage: 5,
      max_damage: 10,
      amunition: 12,
      reloadTime: 1.5,
      fireInterval: 0.5,
      accuracy: 0.8,
      priceCoins: 0,
      priceCash: 0,
      category: 'smg',
    },
  });
  console.log({ defaultWeapon });
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