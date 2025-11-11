import express from "express";
import { prisma } from "../index";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./auth";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

router.get("/playerstats", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ loggedIn: false });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const stats = await prisma.playerStats.findUnique({ where: { id: decoded.userId } });
        
        if (!stats) return res.status(404).json({ stats: false });
        res.json(stats);
    } catch (err) {
        console.error("Błąd przy pobieraniu broni:", err);
        res.status(500).json({ error: "Błąd serwera przy pobieraniu broni" });
    }
});

router.get("/playerinfo", verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: (req as any).userId },
            include: { profile: true },
        });
        if (!user) return res.status(404).json({ user: false });
        res.json({ username: user.username, profile: user.profile });
    } catch (err) {
        console.error("Błąd przy pobieraniu informacji o użytkowniku:", err);
        res.status(500).json({ error: "Błąd serwera przy pobieraniu informacji o użytkowniku" });
    }
});

export default router;