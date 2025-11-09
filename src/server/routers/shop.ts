import express from "express";
import { prisma } from "../index";

const router = express.Router();

router.get("/weapons", async (req, res) => {
  try {
    const weapons = await prisma.weapon.findMany();
    const formatted = weapons.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      stats: {
        min_damage: w.min_damage,
        max_damage: w.max_damage,
        amunition: w.amunition,
        reloadTime: w.reloadTime,
        fireInterval: w.fireInterval,
        accuracy: w.accuracy,
      },
      priceCoins: w.priceCoins,
      priceCash: w.priceCash,
      category: w.category,
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error("Błąd przy pobieraniu broni:", err);
    res.status(500).json({ error: "Błąd serwera przy pobieraniu broni" });
  }
});

router.get("/artifacts", async (req, res) => {
  try {
    const artifacts = await prisma.artifact.findMany();
    const formatted = artifacts.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      stats: { 
        bonusType: a.bonusType,
        bonusValue: a.bonusValue,
      },
      priceCoins: a.priceCoins,
      priceCash: a.priceCash
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error("Błąd przy pobieraniu artefaktów:", err);
    res.status(500).json({ error: "Błąd serwera przy pobieraniu artefaktów" });
  }
});

router.post("/purchase", async (req, res) => {
  try { 
    const { userId, itemId } = req.body;
    if (!userId || !itemId) {
      return res.status(400).json({ error: "Brakuje danych" });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user || !user.profile) {
      return res.status(404).json({ error: "Nie znaleziono użytkownika" });
    }
    const weapon = await prisma.weapon.findUnique({ where: { id: itemId } });
    if (!weapon) {
      return res.status(404).json({ error: "Nie znaleziono przedmiotu" });
    }
    if (user.profile.coins < weapon.priceCoins || user.profile.cash < weapon.priceCash) {
      return res.status(400).json({ error: "Niewystarczające środki" });
    }
    await prisma.$transaction([
      prisma.playerProfile.update({
        where: { id: user.profile.id },
        data: {
          coins: { decrement: weapon.priceCoins },
          cash: { decrement: weapon.priceCash },
        },
      }),
      prisma.inventoryItem.create({
        data: {
          profileId: user.profile.id,
          weaponId: weapon.id,
          equipped: false,
        },
      }),
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Błąd przy zakupie przedmiotu:", err);
    res.status(500).json({ error: "Błąd serwera przy zakupie przedmiotu" });
  } 
});

export default router;