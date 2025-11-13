import { prisma } from "../index";

export type Weapon = {
    id: number;
    name: string;
    description?: string | null;
    priceCoins: number;
    priceCash: number;
    category: string;
    min_damage: number;
    max_damage: number;
    amunition: number;
    reloadTime: number;
    fireInterval: number;
    accuracy: number;
};

export const Weapons: Record<number, Weapon> = {};

export async function loadWeapons() {
    
    const weaponsFromDB = await prisma.weapon.findMany();

    weaponsFromDB.forEach(w => {
        Weapons[w.id] = {
            id: w.id,
            name: w.name,
            description: w.description,
            priceCoins: w.priceCoins,
            priceCash: w.priceCash,
            category: w.category,
            min_damage: w.min_damage,
            max_damage: w.max_damage,
            amunition: w.amunition,
            reloadTime: w.reloadTime,
            fireInterval: w.fireInterval,
            accuracy: w.accuracy
        };
    });
}