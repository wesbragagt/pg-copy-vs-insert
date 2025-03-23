import { Database } from "./db.ts";
import { logger } from "./logger.ts";
import { extractDataFromCsv } from "./csv.ts";
import { type Selectable, sql } from "kysely";
import type { workers } from "./generated/db/types.ts";
import path from "path";
import { getCurrentDir } from "./utils.ts";
import { Files } from "./constants.ts";

export async function handleInsert() {
  const { db } = new Database()
  // Read from ./workers.csv and insert into the database line by line
  const start = performance.now();
  const { rows } = extractDataFromCsv(path.join(getCurrentDir(), Files.WORKERS));
  logger.info({
    message: 'File read in',
    time: performance.now() - start,
  }, 'File read in: ' + (performance.now() - start) + 'ms');

  try {
    await db.executeQuery(sql`TRUNCATE TABLE workers`.compile(db));
    logger.info("Table truncated");

    let processed = 0;
    const durations: number[] = [];
    const start = performance.now();
    for (const row of rows) {
      const [
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country
      ] = row.split(',');

      const _start = performance.now();
      await db.insertInto('workers').values({
        id: sql`gen_random_uuid()`,
        name: name,
        email: email,
        phone: phone,
        address: address,
        city: city,
        state: state,
        zip: zip,
        country: country,
      }).onConflict(c => c.column('email').doNothing()).execute();
      const _end = performance.now();
      const duration = _end - _start;
      durations.push(duration);
      processed++;

      logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
    }
    const totalDuration = performance.now() - start;

    const averageTotalInsertTime = durations.reduce((a, b) => a + b, 0) / durations.length;

    logger.info(`Inserted ${rows.length} rows in ${totalDuration}ms`);
    logger.info(`Average insert time: ${averageTotalInsertTime}ms`);
  } catch (e) {
    logger.error({
      error: e
    })
    process.exit(1);
  }finally{
    await db.destroy();
  }
}

export async function handleBulkInsert(batchSize: number) {
  const { db } = new Database()
  // Read from ./workers.csv and insert into the database line by line
  const start = performance.now();
  const { rows } = extractDataFromCsv(path.join(getCurrentDir(), Files.WORKERS));
  logger.info({
    message: 'File read in',
    time: performance.now() - start,
  }, 'File read in: ' + (performance.now() - start) + 'ms');

  try {
    await db.executeQuery(sql`TRUNCATE TABLE workers`.compile(db));
    logger.info("Table truncated");

    let processed = 0;
    const durations: number[] = [];
    const start = performance.now();
    const batch: Omit<Selectable<workers>, 'id' | 'updated_at' | 'created_at'>[] = [];
    for (const row of rows) {
      const [
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country
      ] = row.split(',');

      batch.push({
        name: name,
        email: email,
        phone: phone,
        address: address,
        city: city,
        state: state,
        zip: zip,
        country: country,
      });

      if (batch.length === batchSize) {
        const _start = performance.now();
        await db.transaction().execute(async trx => {
          await trx.insertInto('workers').values(batch.map(b => ({
            ...b,
            id: sql`gen_random_uuid()`,
          }))).onConflict(c => c.column('email').doNothing()).execute()
        }).catch(e => {
          logger.error({
            error: e
          });
          process.exit(1);
        });
        const _end = performance.now();
        const duration = _end - _start;
        durations.push(duration);
        processed += batchSize;

        logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      const _start = performance.now();
      await db.transaction().execute(async trx => {
        await trx.insertInto('workers').values(batch.map(b => ({
          ...b,
          id: sql`gen_random_uuid()`,
        }))).onConflict(c => c.column('email').doNothing()).execute()
      });
      const _end = performance.now();
      const duration = _end - _start;
      durations.push(duration);
      processed += batch.length;

      logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
    }
    const averageTotalInsertTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    logger.info(`Inserted ${rows.length} rows in ${performance.now() - start}ms`);
    logger.info(`Average insert time: ${averageTotalInsertTime}ms`);
  } catch (e) {
    logger.error({
      error: e
    })
    process.exit(1);
  }
  finally{
    await db.destroy();
  }
}
