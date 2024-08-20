import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import { logger } from './logger';
import postgres from 'postgres';
import { ReadableStream } from 'stream/web';
import { Readable } from 'stream';

export async function handleCopy() {
  const readCsvInMemory = fs.readFileSync(path.join(__dirname, 'workers.csv'), 'utf-8');
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
    logger.info(`Copied data to temp table in ${performance.now() - start}ms`);


    await sql`
      INSERT INTO workers (id,name, email, phone, address, city, state, zip, country)
      SELECT gen_random_uuid(),name, email, phone, address, city, state, zip, country
      FROM temp_workers
      ON CONFLICT (name) DO NOTHING
    `
    const end = performance.now();
    logger.info(`Copied data to the database workers table in ${end - start}ms`);
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
