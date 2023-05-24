const path = require("path");
const express = require("express");
const winston = require("winston");
require("winston-daily-rotate-file");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv))
  .option("filename", {
    alias: "f",
    type: "string",
    description: "Log filename",
  })
  .option("datePattern", {
    alias: "d",
    type: "string",
    description: "Date pattern for log files",
  })
  .option("zip", {
    alias: "z",
    type: "boolean",
    description: "Enable zippedArchive for log files",
  })
  .option("maxSize", {
    alias: "s",
    type: "string",
    description: "Maximum size of log file before being rotated",
  })
  .option("maxFiles", {
    alias: "m",
    type: "string",
    description: "Maximum number of log files to keep before deleting old ones",
  })
  .option("port", {
    alias: "p",
    type: "number",
    description: "Port number on which the server will listen",
  }).argv;

const app = express();
app.use(express.json());

const baseDir = process.cwd();

let filename = argv.filename || "logs-%DATE%.txt";
if (!path.isAbsolute(filename)) {
  filename = path.join(baseDir, filename);
}

const transport = new winston.transports.DailyRotateFile({
  filename: filename,
  datePattern: argv.datePattern || "YYYY-MM-DD",
  zippedArchive: argv.zip || false,
  maxSize: argv.maxSize || "20m",
  maxFiles: argv.maxFiles || "14d",
});

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [transport],
});

app.post("/logs", (req, res) => {
  logger.info(req.body);
  res.sendStatus(200);
});

app.listen(argv.port || 3000, () =>
  console.log(`Listening on port ${argv.port || 3000}`)
);
