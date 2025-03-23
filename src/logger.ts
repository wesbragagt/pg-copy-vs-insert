import { pino } from "pino";

export const logger = pino({
  name: "pg-copy-vs-insert",
  level: "info",
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    hostname() { },
    pid() { }
  }
});
