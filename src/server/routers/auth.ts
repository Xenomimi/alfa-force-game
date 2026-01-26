import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import * as dotenv from 'dotenv';
import { verifyToken } from "../middleware/verifyToken";
import { LevelSystem } from "../game/levelSystem";

const router = express.Router();

dotenv.config()

export const JWT_SECRET = process.env.JWT_SECRET!;

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Brakuje danych" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email zajęty" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
          data: {
            email,
            username,
            password: hashed,
            profile: {
              create: {
                level: 1,
                experience: 0,
                coins: 1000,
                skillPoints: 0,
                stats: {
                  create: {
                    health: 100,
                    armor: 0,
                    agility: 0,
                    intelligence: 0,
                    accuracy: 0,
                  },
                },
                inventory: {
                  create: {
                    weaponId: 1, // domyślna broń
                    equipped: true,
                  },
                },
              },
            },
          },
          include: {
            profile: {
              include: {
                stats: true,
                inventory: { include: { weapon: true } },
              },
            },
          },
    });

    const nextLevelXP = LevelSystem.getMaxXPForLevel(user.profile?.level || 1);
    const levelProgress = 0;

    return res.json({ 
        success: true, 
        user: {
            ...user,
            nextLevelXP,
            levelProgress
        } 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Brakuje danych" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "Nie znaleziono użytkownika" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Niepoprawne hasło" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie('token', token, { 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dni w milisekundach
    });

    return res.json({ success: true, userId: user.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Błąd serwera" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

// Sprawdzenie sesji
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      include: { profile: { include: { stats: true, inventory: { include: { weapon: true } } } } },
    });

    if (!user || !user.profile) return res.status(404).json({ loggedIn: false });
    // Obliczamy ile XP potrzeba na obecnym poziomie i jaki jest postęp
    const nextLevelXP = LevelSystem.getMaxXPForLevel(user.profile.level);
    const levelProgress = LevelSystem.getProgressPercent(user.profile.level, user.profile.experience);

    res.json({ 
        loggedIn: true, 
        user: {
            ...user,
            // Doklejamy obliczone pola, których React oczekuje w "extraData"
            nextLevelXP: nextLevelXP,     
            levelProgress: levelProgress 
        },
        token: req.cookies.token 
    });

  } catch (e) {
    console.error(e); // Warto dodać logowanie błędu
    res.status(401).json({ loggedIn: false });
  }
});

export default router;
