import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

export const ADMIN_CHATID = process.env.ADMIN_CHATID
  ? parseInt(process.env.ADMIN_CHATID)
  : 22442558;

export interface DynamicObject {
  [key: string]: any;
}

let botToken = process.env.DEV_BOT_API_TOKEN;

if (process.env.NODE_ENV === "production") {
  botToken = process.env.BOT_API_TOKEN;
}

export const botInstance = new TelegramBot(botToken!, {
  polling: true
});
