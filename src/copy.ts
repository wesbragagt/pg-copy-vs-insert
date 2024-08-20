import fs from 'fs';
import path from 'path';
import { pipeline } from 'node:stream/promises';
import { logger } from './logger';
import pg from 'pg';
import { Readable } from 'stream';
import { from } from 'pg-copy-streams';

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

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  const start = performance.now();
  try {
    await client.connect();
    logger.info('Copying data to the database');
    await client.query(`
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
    `)
    const writeableStream = client.query(from(`COPY temp_workers (name, email, phone, address, city, state, zip, country) FROM STDIN WITH (FORMAT csv)`));
    const sourceStream = Readable.from([
      ...arrayOfObjects.map(o => `${o.name},${o.email},${o.phone},${o.address},${o.city},${o.state},${o.zip},${o.country}\n`)
    ])
    const totalChunks = arrayOfObjects.length;

    const copyingStart1 = performance.now();
    await pipeline(sourceStream, async function*(sourceStream) {
      let processed = 0;
      for await (const chunk of sourceStream) {
        processed++;
        if (processed % 10000 === 0) {
          logger.info(`Processed ${processed} of ${totalChunks} rows`);
        }
        yield chunk;
      }
    }, writeableStream)
    logger.info(`Copied data to temp table in ${performance.now() - copyingStart1}ms`);


    const copyingStart2 = performance.now();
    await client.query(`
      INSERT INTO workers (id,name, email, phone, address, city, state, zip, country)
      SELECT gen_random_uuid(),name, email, phone, address, city, state, zip, country
      FROM temp_workers
      ON CONFLICT (name) DO NOTHING
    `)
    logger.info(`Copied data to the workers table in ${performance.now() - copyingStart2}ms`);
  }
  catch (error) {
    logger.error({
      error
    })
    process.exit(1);
  }
  finally {
    logger.info(`Total time taken: ${performance.now() - start}ms`);
    await client.end();
  }
}
