/*
 * Create a function that when called writes to a csv file with 1000000 rows of data */

import { createWorker } from './fake';
import fs from 'fs';
import path from 'path';

export function createCSV() {
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

  const csvString = [headers, ...data.map(worker => fields.map(field => worker[field]).join(','))];

  console.log("Creating workers.csv file with 1000000 rows of data...");

  fs.writeFileSync(path.join(__dirname, 'workers.csv'), csvString.join('\n'));

  console.log("Created workers.csv file with 1000000 rows of data.");
}

export function extractDataFromCsv() {
  const filePath = path.join(__dirname, "workers.csv");
  const fileRead = fs.readFileSync(filePath, 'utf-8');
  const lines = fileRead.split('\n');
  const [headers] = lines.slice(0, 1);
  const rows = lines.slice(1);

  return { headers, rows };
}
