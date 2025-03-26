import { Database } from "./db.ts";
import { logger } from "./logger.ts";
import { extractDataFromCsv } from "./csv.ts";
import { type Selectable, sql } from "kysely";
import type { workers } from "./generated/db/types.ts";
import path from "path";
import { getCurrentDir, measureDuration } from "./utils.ts";
import { Files } from "./constants.ts";

export async function handleInsertOneByOne() {
  const { db } = new Database()
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

      const start = performance.now();
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
      const end = performance.now();
      const duration = end - start;
      durations.push(duration);
      processed++;

      logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
    }

    const totalDuration = measureDuration(performance.now() - start);

    logger.info(`Inserted ${rows.length} rows in ${totalDuration}`);
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
        const start = performance.now();
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
        const end = performance.now();
        const duration = end - start;
        durations.push(duration);
        processed += batchSize;

        logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      const start = performance.now();
      await db.transaction().execute(async trx => {
        await trx.insertInto('workers').values(batch.map(b => ({
          ...b,
          id: sql`gen_random_uuid()`,
        }))).onConflict(c => c.column('email').doNothing()).execute()
      });
      const end = performance.now();
      const duration = end - start;
      durations.push(duration);
      processed += batch.length;

      logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
    }
    const totalDuration = measureDuration(performance.now() - start);
    logger.info(`Inserted ${rows.length} rows in ${totalDuration}`);
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

/**
 * Uses a controlled parallel processing approach where it processes concurrency number of batches simultaneously */
export async function handleBulkInsertParallel(batchSize: number, concurrency: number) {
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

    // Split rows into batches
    const batches: Omit<Selectable<workers>, 'id' | 'updated_at' | 'created_at'>[][] = [];
    let currentBatch: Omit<Selectable<workers>, 'id' | 'updated_at' | 'created_at'>[] = [];

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

      currentBatch.push({
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country,
      });

      if (currentBatch.length === batchSize) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // Process batches in parallel with controlled concurrency
    const processBatch = async (batch: typeof currentBatch) => {
      const start = performance.now();
      await db.transaction().execute(async trx => {
        await trx.insertInto('workers').values(batch.map(b => ({
          ...b,
          id: sql`gen_random_uuid()`,
        }))).onConflict(c => c.column('email').doNothing()).execute();
      });
      const duration = performance.now() - start;
      durations.push(duration);
      processed += batch.length;
      logger.info(`Inserted ${processed}/${rows.length} rows in ${duration}ms`);
    };

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += concurrency) {
      const batchSlice = batches.slice(i, i + concurrency);
      await Promise.all(batchSlice.map(batch => processBatch(batch)));
    }

    const totalDuration = measureDuration(performance.now() - start);
    logger.info(`Inserted ${rows.length} rows in ${totalDuration}`);
  } catch (e) {
    logger.error({
      error: e
    });
    process.exit(1);
  } finally {
    await db.destroy();
  }
}
