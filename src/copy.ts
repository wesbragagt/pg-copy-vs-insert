import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import postgres from 'postgres';
import { Readable } from 'stream';

import { logger } from './logger.ts';
import { measureDuration, getCurrentDir, getMemoryUsageDetails } from './utils.ts';
import { Files } from './constants.ts';
import { randomUUID } from 'crypto';
import type { CreateWorker } from './interfaces.ts';

function mapNewWorker(row: string): CreateWorker {
  const [name, email, phone, address, city, state, zip, country] = row.split(',');
  return {
    id: `${randomUUID()}`,
    name,
    email,
    phone,
    address,
    city,
    state,
    zip,
    country
  } 
}

/**
 * Example showing bulk insert through COPY */
export async function handleCopyInsert() {
  const readCsvInMemory = fs.readFileSync(path.join(getCurrentDir(), Files.WORKERS), 'utf-8');

  const arrayOfObjects = readCsvInMemory.split('\n').slice(1).map(mapNewWorker).filter(o => !!o.name);
  logger.info(`Read ${arrayOfObjects.length} records from CSV in memory ${getMemoryUsageDetails()}`);

  const sql = postgres(process.env.DATABASE_URL as string, {
    //close a connection that has either been idle for 20 seconds or existed for more than 30 minutes
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });

  try {
    await sql`TRUNCATE workers;`;

    const start = performance.now();
    logger.info('Copying data to the database');
    const writeableStream = await sql`
      COPY workers (
        id,
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country
      ) FROM STDIN WITH (FORMAT csv, DELIMITER ',')
    `.writable();
    const sourceStream = Readable.from(arrayOfObjects.map(o => [o.id, o.name, o.email, o.phone, o.address, o.city, o.state, o.zip, o.country].join(',') + '\n'))
    const totalChunks = arrayOfObjects.length;
    let processed = 0;
    await pipeline(sourceStream, async function*(sourceStream) {
      for await (const chunk of sourceStream) {
        if (processed % 50000 === 0) {
          logger.info({
            msg: `Copy ${processed}/${totalChunks}`,
          });
        }
        processed++;
        yield chunk;
      }
    }, writeableStream)
    logger.info(`Copied data to table in ${measureDuration(performance.now() - start)}`);
  }
  catch (error) {
    logger.error({
      error
    })
    process.exit(1);
  }
  finally {
    await sql.end();
  }
}

/**
 * Exampe showing insert while checking constraints with COPY and then insert into with constraint check. */
export async function handleCopyUpdate() {
  const readCsvInMemory = fs.readFileSync(path.join(getCurrentDir(), Files.WORKERS_WITH_DUPLICATE), 'utf-8');
  const arrayOfObjects = readCsvInMemory.split('\n').slice(1).map(mapNewWorker).filter(o => !!o.name);
  logger.info(`Read ${arrayOfObjects.length} records from CSV in memory ${getMemoryUsageDetails()}`);

  const sql = postgres(process.env.DATABASE_URL as string, {
    //close a connection that has either been idle for 20 seconds or existed for more than 30 minutes
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });
  try {
    const start = performance.now();
    logger.info('Copying data to the database');
    await sql`
      -- create temp table with the same structure as target table
      CREATE TEMP TABLE temp_workers AS SELECT * FROM workers WHERE 1=0;
    `
    const writeableStream = await sql`COPY temp_workers (name, email, phone, address, city, state, zip, country) FROM STDIN WITH (FORMAT csv)`.writable();
    const sourceStream = Readable.from(arrayOfObjects.map(o => `${o.name},${o.email},${o.phone},${o.address},${o.city},${o.state},${o.zip},${o.country}\n`))
    const totalChunks = arrayOfObjects.length;
    let processed = 0;

    await pipeline(sourceStream, async function*(sourceStream) {
      for await (const chunk of sourceStream) {
        logger.info({
          msg: `Copy ${processed}/${totalChunks}`,
        });
        processed++;
        yield chunk;
      }
    }, writeableStream)
    logger.info(`Copied data to temp table in ${measureDuration(performance.now() - start)}`);
    logger.info(`Running update with constraint checks...`);

    const startUpdateFromTempAt = performance.now();
    await sql`
      INSERT INTO workers (id,name, email, phone, address, city, state, zip, country)
      SELECT gen_random_uuid(),name, email, phone, address, city, state, zip, country
      FROM temp_workers
      ON CONFLICT (email) DO NOTHING
    `
    logger.info(`Ran update from temp table in ${measureDuration(performance.now() - startUpdateFromTempAt)}`);

    logger.info(`Total time taken: ${measureDuration(performance.now() - start)}`);
  }
  catch (error) {
    logger.error({
      error
    })
    process.exit(1);
  }
  finally {
    await sql.end();
  }
}

/**Streams the csv records, transforms and lods on demand */
export async function copyInsertStreamed() {
  const sql = postgres(process.env.DATABASE_URL as string);
  try {

    const start = performance.now();

    await sql`TRUNCATE workers;`;

    const readStream = fs.createReadStream(path.join(getCurrentDir(), Files.WORKERS), { encoding: 'utf-8' });

    const writeableStream = await sql`
    COPY workers (
      id,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country
    ) FROM STDIN WITH (FORMAT csv, DELIMITER ',')
  `.writable();

    let processed = 0;

    await pipeline(readStream, async function*(readStream) {
      for await (const chunk of readStream) {
        if (processed % 50000 === 0) {
          logger.info({
            msg: `Copy ${processed}`,
          });
        }
        const mapped = mapNewWorker(chunk);
        // ERROR: "NextCopyFrom"},"msg":"missing data for column \"name\"" 
        const chunkProcessed = `${mapped.id},${mapped.name},${mapped.email},${mapped.phone},${mapped.address},${mapped.city},${mapped.state},${mapped.zip},${mapped.country}\n`;

        processed++;
        yield chunkProcessed;
      }
    }, writeableStream)

    logger.info(`Copied data to table in ${measureDuration(performance.now() - start)}`);
  } catch (e) {
    logger.error(e)
    process.exit(1)
  } finally {
    await sql.end();
  }
}
