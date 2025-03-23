import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import postgres from 'postgres';
import { Readable } from 'stream';

import { logger } from './logger.ts';
import { measureDuration, getCurrentDir } from './utils.ts';
import { Files } from './constants.ts';
import { randomUUID } from 'crypto';

/**
 * Example showing bulk insert through COPY */
export async function handleCopyInsert(){
  const readCsvInMemory = fs.readFileSync(path.join(getCurrentDir(), Files.WORKERS), 'utf-8');
  const arrayOfObjects = readCsvInMemory.split('\n').slice(1).map((line) => {
    const [name, email, phone, address, city, state, zip, country] = line.split(',');
    return {
      id: randomUUID(),
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country
    }
  }).filter(o => !!o.name);

  const sql = postgres(process.env.DATABASE_URL as string, {
    //close a connection that has either been idle for 20 seconds or existed for more than 30 minutes
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });
  try {
    await sql`TRUNCATE workers;`;

    const start = performance.now();
    logger.info('Copying data to the database');
    const writeableStream = await sql`COPY workers (id,name, email, phone, address, city, state, zip, country) FROM STDIN WITH (FORMAT csv)`.writable();
    const sourceStream = Readable.from([
      ...arrayOfObjects.map(o => `${o.name},${o.email},${o.phone},${o.address},${o.city},${o.state},${o.zip},${o.country}\n`)
    ])
    const totalChunks = arrayOfObjects.length;
    let processed = 0;

    await pipeline(sourceStream, async function*(sourceStream){
      for await (const chunk of sourceStream) {
        logger.info({
          msg: `Copy ${processed}/${totalChunks}`,
        });
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
  const arrayOfObjects = readCsvInMemory.split('\n').slice(1).map((line) => {
    const [name, email, phone, address, city, state, zip, country] = line.split(',');
    return {
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country
    }
  }).filter(o => !!o.name);

  const sql = postgres(process.env.DATABASE_URL as string, {
    //close a connection that has either been idle for 20 seconds or existed for more than 30 minutes
    idle_timeout: 20,
    max_lifetime: 60 * 30
  });
  try {
    const start = performance.now();
    logger.info('Copying data to the database');
    await sql`
      CREATE TEMP TABLE temp_workers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        country TEXT NOT NULL
      );
    `
    const writeableStream = await sql`COPY temp_workers (name, email, phone, address, city, state, zip, country) FROM STDIN WITH (FORMAT csv)`.writable();
    const sourceStream = Readable.from([
      ...arrayOfObjects.map(o => `${o.name},${o.email},${o.phone},${o.address},${o.city},${o.state},${o.zip},${o.country}\n`)
    ])
    const totalChunks = arrayOfObjects.length;
    let processed = 0;

    await pipeline(sourceStream, async function*(sourceStream){
      for await (const chunk of sourceStream) {
        logger.info({
          msg: `Copy ${processed}/${totalChunks}`,
        });
        processed++;
        yield chunk;
      }
    }, writeableStream)
    logger.info(`Copied data to temp table in ${measureDuration(performance.now() - start)}`);

    const startUpdateFromTempAt = performance.now();
    await sql`
      INSERT INTO workers (id,name, email, phone, address, city, state, zip, country)
      SELECT gen_random_uuid(),name, email, phone, address, city, state, zip, country
      FROM temp_workers
      ON CONFLICT (name) DO NOTHING
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
