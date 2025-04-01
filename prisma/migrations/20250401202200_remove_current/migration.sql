/*
  Warnings:

  - You are about to drop the column `currency_id` on the `recurring_expenses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "recurring_expenses" DROP COLUMN "currency_id";
