/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `workers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "workers_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "workers_email_key" ON "workers"("email");
