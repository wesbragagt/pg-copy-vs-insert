import { handleInsert, handleBulkInsert } from './insert'
import { handleCopy } from './copy'

import dotenv from 'dotenv'
import { createCSV } from './csv';

dotenv.config();

const PossibleArgs = Object.freeze({
  Insert: "insert",
  BulkInsert: "bulk-insert",
  Copy: "copy",
  CreateCSV: "create-csv",
});
const PossibleArgsValues = Object.values(PossibleArgs);

async function main() {
  if (process.argv.length < 3) {
    console.log("Please provide a command")
    process.exit(1)
  }

  if (!Object.values(PossibleArgs).includes(process.argv[2] as any)) {
    console.log(`Invalid command. Possible commands are: ${PossibleArgsValues.join(", ")}`)
    process.exit(1)
  }

  switch (process.argv[2]) {
    case "insert": {
      await handleInsert()
      break;
    }
    case "bulk-insert": {
      await handleBulkInsert(process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : 1)
      break;
    }
    case "copy": {
      await handleCopy()
      break;
    }
    case "create-csv": {
      createCSV()
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
