/*
  Warnings:

  - You are about to drop the column `damage` on the `Weapon` table. All the data in the column will be lost.
  - You are about to drop the column `speed` on the `Weapon` table. All the data in the column will be lost.
  - Added the required column `amunition` to the `Weapon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Weapon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fireInterval` to the `Weapon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_damage` to the `Weapon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `min_damage` to the `Weapon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reloadTime` to the `Weapon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Weapon" DROP COLUMN "damage",
DROP COLUMN "speed",
ADD COLUMN     "amunition" INTEGER NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "fireInterval" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "max_damage" INTEGER NOT NULL,
ADD COLUMN     "min_damage" INTEGER NOT NULL,
ADD COLUMN     "reloadTime" DOUBLE PRECISION NOT NULL;
