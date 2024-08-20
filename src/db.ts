import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { DB } from './generated/db/types'
import postgres from 'postgres'
import { PostgresJSDialect } from 'kysely-postgres-js'

export class KyselyDB {
  db: Kysely<DB>

  constructor() {
    this.db = new Kysely({
      dialect: new PostgresJSDialect({
        postgres: postgres(process.env.DATABASE_URL as string),
      }),
    })
  }
}

export async function getDB() {
  const { db } = new KyselyDB();

  return {
    db,
    [Symbol.asyncDispose]: async () => {
      await db.destroy();
      console.log("DB connection closed")
    }
  }
}

