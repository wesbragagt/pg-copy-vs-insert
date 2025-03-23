import { handleInsert, handleBulkInsert } from './insert.ts'
import { handleCopyInsert, handleCopyUpdate } from './copy.ts'
import { createCSV, createCsvWithDuplicateData } from './csv.ts';

import dotenv from 'dotenv'

dotenv.config();

const PossibleArgs = Object.freeze({
  Insert: "insert",
  BulkInsert: "bulk-insert",
  Copy: "copy",
  CopyUpdate: "copy-update",
  CreateCSV: "create-csv",
  CreateCSVWithDups: "create-csv-dups"
});
const PossibleArgsValues = Object.values(PossibleArgs);

async function main() {
  if (process.argv.length < 3) {
    console.log(`Provide a command: ${PossibleArgsValues.join(", ")}`)
    process.exit(1)
  }

  if (!Object.values(PossibleArgs).includes(process.argv[2] as any)) {
    console.log(`Invalid command. Possible commands are: ${PossibleArgsValues.join(", ")}`)
    process.exit(1)
  }

  switch (process.argv[2]) {
    case PossibleArgs.Insert: {
      await handleInsert()
      break;
    }
    case PossibleArgs.BulkInsert: {
      await handleBulkInsert(process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : 1)
      break;
    }
    case PossibleArgs.Copy: {
      await handleCopyInsert()
      break;
    }
    case PossibleArgs.CopyUpdate: {
      await handleCopyUpdate()
      break;
    }
    case PossibleArgs.CreateCSV: {
      createCSV()
      break;
    }
    case PossibleArgs.CreateCSVWithDups: {
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
