/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `workers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "workers_name_key" ON "workers"("name");
