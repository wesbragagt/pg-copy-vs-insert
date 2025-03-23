import { Kysely } from 'kysely'
import type { DB } from './generated/db/types.ts'
import postgres from 'postgres'
import { PostgresJSDialect } from 'kysely-postgres-js'

export class Database {
  db: Kysely<DB>

  constructor() {
    this.db = new Kysely({
      dialect: new PostgresJSDialect({
        postgres: postgres(process.env.DATABASE_URL as string),
      }),
    })
  }

  cleanUpRecords = async () => {
    await this.db.deleteFrom('workers').execute()
  }
}
