const cron = require("node-cron");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const BACKUP_DIR = "D:\\mongo-backups";
const MONGODUMP_PATH = "C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe";

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatDate() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}`;
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function sendToTelegram(filePath) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("caption", `Shu loyihadan daily backup\n${path.basename(filePath)}`);
  form.append("document", fs.createReadStream(filePath));

  await axios.post(url, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
}

function deleteOldBackups(days = 7) {
  const files = fs.readdirSync(BACKUP_DIR);

  for (const file of files) {
    const fullPath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(fullPath);

    const diffDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);

    if (file.endsWith(".gz") && diffDays > days) {
      fs.unlinkSync(fullPath);
      console.log("Deleted old backup:", fullPath);
    }
  }
}

async function runBackupAndSend() {
  try {
    ensureBackupDir();

    const fileName = `mongo_backup_${formatDate()}.gz`;
    const backupPath = path.join(BACKUP_DIR, fileName);

    const command = `"${MONGODUMP_PATH}" --uri="${MONGO_URI}" --archive="${backupPath}" --gzip`;

    console.log("Backup started...");
    await runCommand(command);

    console.log("Backup created:", backupPath);

    await sendToTelegram(backupPath);
    console.log("Backup sent to Telegram:", TELEGRAM_CHAT_ID);

    deleteOldBackups(7);
  } catch (error) {
    console.error("Backup job error:", error.message);
  }
}

function startBackupJob() {
  cron.schedule("0 3 * * *", async () => {
    await runBackupAndSend();
  });

  console.log("Backup cron started. Runs every day at 03:00");
}

module.exports = {
  startBackupJob,
  runBackupAndSend,
};