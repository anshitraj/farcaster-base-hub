/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `Developer` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MODERATOR');

-- DropIndex
DROP INDEX "Developer_isAdmin_idx";

-- AlterTable
ALTER TABLE "Developer" DROP COLUMN "isAdmin",
ADD COLUMN     "adminRole" "AdminRole";

-- AlterTable
ALTER TABLE "MiniApp" ADD COLUMN     "monetizationEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Developer_adminRole_idx" ON "Developer"("adminRole");
