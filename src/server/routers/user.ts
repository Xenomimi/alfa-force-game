import express from "express";
import bcrypt from "bcrypt";
import { prisma } from "../index";
import { verifyToken } from "../middleware/verifyToken";
import { LevelSystem } from "../game/levelSystem";
const router = express.Router();

router.get("/inventory", verifyToken, async (req, res) => {
    try {
        const userId = (req as any).userId;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        inventory: {
                            include: { weapon: true }
                        }
                    }
                }
            }
        });

        if (!user || !user.profile) {
            return res.status(404).json({ error: "Nie znaleziono profilu użytkownika" });
        }

        // Mapujemy dane z bazy na format oczekiwany przez frontend (Item)
        const inventory = user.profile.inventory.map(item => ({
            id: item.weapon.id, // ID definicji broni (potrzebne do sprzedaży/wyświetlania)
            name: item.weapon.name,
            description: item.weapon.description,
            category: item.weapon.category,
            priceCoins: item.weapon.priceCoins,
            priceCash: item.weapon.priceCash,
            stats: {
                min_damage: item.weapon.min_damage,
                max_damage: item.weapon.max_damage,
                amunition: item.weapon.amunition,
                reloadTime: item.weapon.reloadTime,
                fireInterval: item.weapon.fireInterval,
                accuracy: item.weapon.accuracy
            }
        }));

        res.json(inventory);

    } catch (err) {
        console.error("Błąd przy pobieraniu ekwipunku:", err);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

router.get("/playerstats", verifyToken, async (req, res) => {
    try {
        const userId = (req as any).userId as number;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: { include: { stats: true } } }
        });

        if (!user || !user.profile || !user.profile.stats) {
            return res.status(404).json({ stats: false });
        }

        res.json(user.profile.stats);
    } catch (err) {
        console.error("Błąd przy pobieraniu broni:", err);
        res.status(500).json({ error: "Błąd serwera przy pobieraniu broni" });
    }
});

router.post("/assign-skill", verifyToken, async (req, res) => {
    try {
        const userId = (req as any).userId as number;
        const { stat } = req.body as { stat?: string };

        const allowedStats = ["accuracy"];
        if (!stat || !allowedStats.includes(stat)) {
            return res.status(400).json({ error: "Nieprawidłowa umiejętność" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: { include: { stats: true } } }
        });

        if (!user || !user.profile || !user.profile.stats) {
            return res.status(404).json({ error: "Nie znaleziono profilu" });
        }

        if (user.profile.skillPoints <= 0) {
            return res.status(400).json({ error: "Brak punktów umiejętności" });
        }

        const statUpdate: Record<string, any> = {};
        if (stat === "accuracy") statUpdate.accuracy = { increment: 1 };

        const updatedProfile = await prisma.playerProfile.update({
            where: { id: user.profile.id },
            data: {
                skillPoints: { decrement: 1 },
                stats: { update: statUpdate }
            },
            include: { stats: true }
        });

        res.json({
            success: true,
            skillPoints: updatedProfile.skillPoints,
            stats: updatedProfile.stats
        });
    } catch (err) {
        console.error("Błąd przy przypisywaniu punktu:", err);
        res.status(500).json({ error: "Błąd serwera przy przypisywaniu punktu" });
    }
});

router.post("/account", verifyToken, async (req, res) => {
    try {
        const userId = (req as any).userId as number;
        const { username, email, currentPassword, newPassword } = req.body as {
            username?: string;
            email?: string;
            currentPassword?: string;
            newPassword?: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user || !user.profile) {
            return res.status(404).json({ error: "Nie znaleziono profilu" });
        }

        const updates: Record<string, any> = {};
        let renameCost = 0;

        const trimmedUsername = typeof username === "string" ? username.trim() : "";
        const trimmedEmail = typeof email === "string" ? email.trim() : "";

        if (trimmedUsername && trimmedUsername !== user.username) {
            const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
            if (existing) {
                return res.status(400).json({ error: "Nazwa uzytkownika jest juz zajeta" });
            }
            if (user.profile.cash < 5) {
                return res.status(400).json({ error: "Brak wystarczajacego cashu na zmiane nazwy" });
            }
            updates.username = trimmedUsername;
            renameCost = 5;
        }

        if (trimmedEmail && trimmedEmail !== user.email) {
            const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
            if (existingEmail) {
                return res.status(400).json({ error: "Email jest juz zajety" });
            }
            updates.email = trimmedEmail;
        }

        if (newPassword && newPassword.length > 0) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Wymagane aktualne haslo" });
            }
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) {
                return res.status(400).json({ error: "Niepoprawne aktualne haslo" });
            }
            const hashed = await bcrypt.hash(newPassword, 10);
            updates.password = hashed;
        }

        if (Object.keys(updates).length === 0 && renameCost === 0) {
            return res.status(400).json({ error: "Brak zmian do zapisania" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...updates,
                ...(renameCost > 0 ? { profile: { update: { cash: { decrement: renameCost } } } } : {})
            },
            include: { profile: true }
        });

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                profile: updatedUser.profile
            }
        });
    } catch (err) {
        console.error("Blad przy aktualizacji konta:", err);
        res.status(500).json({ error: "Blad serwera przy aktualizacji konta" });
    }
});

router.get("/playerinfo", verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: (req as any).userId },
            include: { profile: true },
        });
        if (!user || !user.profile) return res.status(404).json({ user: false });

        // Używamy metody z klasy LevelSystem - kod jest czysty i spójny
        const progress = LevelSystem.getProgressPercent(user.profile.level, user.profile.experience);
        const maxXP = LevelSystem.getMaxXPForLevel(user.profile.level);

        res.json({ 
            username: user.username, 
            profile: user.profile,
            levelProgress: progress, // Gotowe np. 45
            nextLevelXP: maxXP,      // Ile potrzeba łącznie na ten level (np. 200)
            currentXP: user.profile.experience // Ile gracz ma obecnie (np. 90)
        });
    } catch (err) {
       throw err;
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
