/*
  Warnings:

  - You are about to drop the column `endurance` on the `PlayerStats` table. All the data in the column will be lost.
  - You are about to drop the column `luck` on the `PlayerStats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlayerStats" DROP COLUMN "endurance",
DROP COLUMN "luck",
ADD COLUMN     "accuracy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "armor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "health" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "Artifact" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bonusType" TEXT NOT NULL,
    "bonusValue" INTEGER NOT NULL DEFAULT 0,
    "priceCoins" INTEGER NOT NULL DEFAULT 0,
    "priceCash" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerArtifact" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "artifactId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerArtifact_profileId_slot_key" ON "PlayerArtifact"("profileId", "slot");

-- AddForeignKey
ALTER TABLE "PlayerArtifact" ADD CONSTRAINT "PlayerArtifact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerArtifact" ADD CONSTRAINT "PlayerArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
