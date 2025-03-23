/*
 * Create a function that when called writes to a csv file with 1000000 rows of data */
import { deduplicateByEmail, getCurrentDir } from './utils.ts'
import { createWorker } from './fake.ts';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.ts';
import { Files } from './constants.ts';

export function createCSV() {
  const fileName = Files.WORKERS;
  const fields = [
    'name',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'zip',
    'country'
  ] as const;

  const headers = fields.join(',');
  const data = Array.from({ length: 1000000 }, () => createWorker());
  const deduplicatedByEmail = deduplicateByEmail(data);

  const csvString = [headers, ...deduplicatedByEmail.map(worker => fields.map(field => worker[field]).join(','))];

  fs.writeFileSync(path.join(getCurrentDir(), fileName), csvString.join('\n'));

  logger.info(`Created ${fileName} file with 1000000 rows of data.`);
}

export function createCsvWithDuplicateData(){
  const fileName = Files.WORKERS_WITH_DUPLICATE;
    
  const fields = [
    'name',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'zip',
    'country'
  ] as const;

  const headers = fields.join(',');

  const data = Array.from({ length: 1000000 }, () => createWorker());
  const DUPLICATE_EMAIL = 'mscott@dundermifflin.com';
  // add duplicate email
  data[0].email = DUPLICATE_EMAIL;
  data[1].email = DUPLICATE_EMAIL;

  const csvString = [headers, ...data.map(worker => fields.map(field => worker[field]).join(','))];

  fs.writeFileSync(path.join(getCurrentDir(), fileName), csvString.join('\n'));

  logger.info(`Created ${fileName} file with 1000000 rows of data with duplicate email.`);
}

export function extractDataFromCsv(filePath: string) {
  const fileRead = fs.readFileSync(filePath, 'utf-8');
  const lines = fileRead.split('\n');
  const [headers] = lines.slice(0, 1);
  const rows = lines.slice(1);

  return { headers, rows };
}
