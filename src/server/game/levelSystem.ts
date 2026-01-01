// src/server/game/LevelSystem.ts

// Konfiguracja progów XP dla każdego poziomu.
// Klucz to poziom, wartość to CAŁKOWITE doświadczenie potrzebne, by go osiągnąć.
export const LEVEL_THRESHOLDS: Record<number, number> = {
 1: 50,
 2: 100,
 3: 150,
 4: 200,
 5: 250,
 6: 300,
 7: 350,
 8: 400,
 9: 450,
 10: 500,
 11: 550,
 12: 600,
 13: 650,
 14: 700,
 15: 750,
 16: 800,
 17: 850,
 18: 900,
 19	:950,
 20: 1000,
 21: 1365,
 22: 1430,
 23: 1495,
 24: 1560,
 25: 1625,
 26: 1690,
 27: 1755,
 28: 1820,
 29: 1885,
 30: 1950,
 31: 2015,
 32: 2080,
 33: 2145,
 34: 2210,
 35: 2275,
 36: 2340,
 37: 2405,
 38: 2470,
 39: 2535,
 40: 2600,
 41: 3280,
 42: 3360,
 43: 3440,
 44: 3520,
 45: 3600,
 46: 3680,
 47: 3760,
 48: 3840,
 49: 3920,
 50: 4000,
 51: 4080,
 52: 4160,
 53: 4240,
 54: 4320,
 55: 4400,
 56: 4480,
 57: 4560,
 58: 4640,
 59: 4720,
 60: 4800,
 61: 6405,
 62: 6510,
 63: 6615,
 64: 6720,
 65: 6825,
 66: 6930,
 67: 7035,
 68: 7140,
 69: 7245,
 70: 7350
};
 
export class LevelSystem {
/**
     * 1. Zwraca "pojemność" paska XP dla danego poziomu.
     * Czyli: ile muszę uzbierać XP na TYM poziomie, żeby wejść wyżej.
     */
    static getMaxXPForLevel(level: number): number {
        const threshold = LEVEL_THRESHOLDS[level];
        
        // Jeśli mamy zdefiniowany próg w tabeli:
        if (threshold !== undefined) {
            return threshold;
        }

        // Fallback dla bardzo wysokich poziomów (71+):
        // Np. stała wartość 10,000 albo rosnąca
        return 10000; 
    }

    /**
     * 2. Główna logika dodawania XP (z obsługą wielu awansów naraz).
     * Zwraca obiekt, który łatwo zapisać w bazie.
     */
    static calculateNewState(currentLevel: number, currentXP: number, xpToAdd: number) {
        let level = currentLevel;
        let xp = currentXP + xpToAdd;
        let maxXP = this.getMaxXPForLevel(level);

        // Pętla while obsługuje sytuację, gdy gracz dostał tyle XP, 
        // że przeskoczył o 2 lub więcej poziomów naraz (tzw. overflow).
        while (xp >= maxXP) {
            xp -= maxXP;       // "Wylewamy" pełne wiadro (reset paska)
            level++;           // Dajemy poziom w górę
            maxXP = this.getMaxXPForLevel(level); // Sprawdzamy pojemność nowego paska
        }

        return {
            newLevel: level,
            newXP: xp,                   // To jest nowa "reszta" do zapisania w bazie
            xpForNextLevel: maxXP,       // Do wysłania klientowi (ile ma do następnego)
            leveledUp: level > currentLevel,
            levelsGained: level - currentLevel
        };
    }

    /**
     * 3. Pomocnik do UI - zwraca procent (0-100).
     * W nowym systemie to po prostu: (obecne / wymagane) * 100
     */
    static getProgressPercent(currentLevel: number, currentXP: number): number {
        const maxXP = this.getMaxXPForLevel(currentLevel);
        
        if (maxXP === 0) return 100; // Zabezpieczenie przed dzieleniem przez 0
        
        const percent = (currentXP / maxXP) * 100;
        
        // Ograniczamy do zakresu 0-100 i zaokrąglamy w dół
        return Math.floor(Math.min(100, Math.max(0, percent)));
    }
}