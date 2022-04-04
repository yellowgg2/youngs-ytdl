import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

export const GUIDE_IDENTITY = "installGuide";
export const LOG_LIST = "logList";
export const ADMIN_CHATID = 22442558;
export const NON_AUTH_WARN_MSG = "🌼 권한이 없습니다.\n관리자에게 문의하세요.";

export interface DynamicObject {
  [key: string]: any;
}

// inline button callback data
// 최대 64byte가 넘지 못한다
export interface IInlineKeyboardCallbackData {
  type: string;
  step: number;
  guide_id: string;
  companyCode?: string;
  index?: string;
}

export interface IGuides {
  guide_id: string;
  step: number;
  description: string;
  title: string;
}

let botToken = process.env.DEV_BOT_API_TOKEN;

if (process.env.NODE_ENV === "production") {
  botToken = process.env.BOT_API_TOKEN;
}

export const botInstance = new TelegramBot(botToken!, {
  polling: true
});
