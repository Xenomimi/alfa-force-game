import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import * as dotenv from 'dotenv';
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

    return res.json({ success: true, user });
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
router.get("/me", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true},
    });

    if (!user) return res.status(404).json({ loggedIn: false });
    res.json({ loggedIn: true, user });
  } catch {
    res.status(401).json({ loggedIn: false });
  }
});



export default router;
