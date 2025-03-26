import { handleInsertOneByOne, handleBulkInsert, handleBulkInsertParallel } from './insert.ts'
import { handleCopyInsert, handleCopyUpdate } from './copy.ts'
import { createCSV, createCsvWithDuplicateData } from './csv.ts';

import dotenv from 'dotenv'

dotenv.config();

const Arguments = Object.freeze({
  Insert: "insert",
  BulkInsert: "bulk-insert",
  BulkInsertParallel: "bulk-insert-parallel",
  Copy: "copy",
  CopyUpdate: "copy-update",
  CreateCSV: "create-csv",
  CreateCSVWithDups: "create-csv-dups"
});
const ArgumentValues = Object.values(Arguments);

async function main() {
  if (process.argv.length < 3) {
    console.log(`Provide a command: ${ArgumentValues.join(", ")}`)
    process.exit(1)
  }

  if (!Object.values(Arguments).includes(process.argv[2] as any)) {
    console.log(`Invalid command. Possible commands are: ${ArgumentValues.join(", ")}`)
    process.exit(1)
  }

  switch (process.argv[2]) {
    case Arguments.Insert: {
      await handleInsertOneByOne()
      break;
    }
    case Arguments.BulkInsert: {
      await handleBulkInsert(process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : 1)
      break;
    }
    case Arguments.BulkInsertParallel: {
      await handleBulkInsertParallel(
        process.env.BATCH_SIZE ? Number(process.env.BATCH_SIZE) : 1,
        process.env.CONCURRENCY ? Number(process.env.CONCURRENCY) : 1
      )
      break
    }
    case Arguments.Copy: {
      await handleCopyInsert()
      break;
    }
    case Arguments.CopyUpdate: {
      await handleCopyUpdate()
      break;
    }
    case Arguments.CreateCSV: {
      createCSV()
      break;
    }
    case Arguments.CreateCSVWithDups: {
      createCsvWithDuplicateData()
      break;
    }
    default: {
      console.log("Invalid command")
      process.exit(1)
    }
  }
}

main()

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1)
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1)
});
