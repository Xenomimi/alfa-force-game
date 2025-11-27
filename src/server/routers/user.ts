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

router.get("/leaderboard", async (req, res) => {
    try {
        // Pobieramy wszystkich użytkowników wraz z ich profilem
        // Sortujemy wstępnie po doświadczeniu (DESC)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                profile: {
                    select: {
                        experience: true,
                        totalKills: true,
                        totalDeaths: true,
                        level: true
                    }
                }
            },
            orderBy: {
                profile: {
                    experience: 'desc'
                }
            },
            take: 100 // Limit 100 najlepszych graczy dla wydajności
        });

        // Mapujemy dane do formatu wygodnego dla frontendu
        const leaderboardData = users.map(user => {
            const kills = user.profile?.totalKills || 0;
            const deaths = user.profile?.totalDeaths || 0;
            // Obliczamy KDR (zabezpieczenie przed dzieleniem przez 0)
            const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);

            return {
                id: user.id,
                name: user.username,
                level: user.profile?.level || 1,
                experience: user.profile?.experience || 0,
                kills: kills,
                deaths: deaths,
                kdr: parseFloat(kdr)
            };
        });

        res.json(leaderboardData);

    } catch (err) {
        console.error("Błąd przy pobieraniu rankingu:", err);
        res.status(500).json({ error: "Błąd serwera przy pobieraniu rankingu" });
    }
});

export default router;