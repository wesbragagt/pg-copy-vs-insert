import type { Logger } from "pino";
import type { CreateWorker } from "./interfaces.ts";

export function measureDuration(milliseconds: number) /*hh:mm:ss*/ {
  const isLessThanHours = milliseconds < 3600000;
  const isLessThanMinutes = milliseconds < 60000;

  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor(milliseconds / 1000);

  if (isLessThanMinutes) {
    return `${seconds} seconds`;
  } else if (isLessThanHours) {
    return `${minutes} minutes and ${seconds} seconds`;
  } else {
    return `${hours} hours, ${minutes} minutes and ${seconds} seconds`;
  }
}

export function getCurrentDir(){
  return new URL('.', import.meta.url).pathname
}

/**
 * Efficiently checks reduces duplicates from the array */
export function deduplicateByEmail(w: CreateWorker[]){
  const emailMap = new Map<string, CreateWorker>();
  for (const worker of w) {
    emailMap.set(worker.email, worker);
  }
  return Array.from(emailMap.values());
}

export function getMemoryUsageDetails(_process = process){
  const memoryUsage = _process.memoryUsage();
  const memoryRssInMB = memoryUsage.rss / 1024 / 1024;
  const memoryHeapTotalInMB = memoryUsage.heapTotal / 1024 / 1024;
  const memoryHeapUsedInMB = memoryUsage.heapUsed / 1024 / 1024;

  return `rss: ${memoryRssInMB.toFixed(2)}MB, heapTotal: ${memoryHeapTotalInMB.toFixed(2)}MB, heapUsed: ${memoryHeapUsedInMB.toFixed(2)}MB`;
}
