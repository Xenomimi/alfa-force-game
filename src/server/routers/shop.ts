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

export default router;