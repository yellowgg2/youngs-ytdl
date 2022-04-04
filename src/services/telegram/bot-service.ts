import TelegramBot from "node-telegram-bot-api";
import {
  ADMIN_CHATID,
  botInstance,
  NON_AUTH_WARN_MSG
} from "../../global-bot-config";
import ApiCaller from "../axios/api-caller";
import { glog } from "../logger/custom-logger";
import DbHandler from "../sqlite/db-handler";

export default class BotService {
  private static instance: BotService;

  private constructor() {}

  static getInstance() {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }

    return BotService.instance;
  }

  start() {
    botInstance.on("message", this._messageHandler);
    botInstance.on("polling_error", err => console.log(err));
  }

  showHelp(chatId: number) {
    let helpMsg = "/help - 이 도움말 보기\n";

    this.sendMsg(chatId, helpMsg);
  }

  showAdminHelp(chatId: number) {
    let helpMsg = "/adduser - 사용자 추가 명령\n";
    helpMsg += "/upuser - 사용자 갱신\n";
    helpMsg += "/deluser - 사용자 제거\n";
    this.sendMsg(chatId, helpMsg);
  }

  sendMsg(chatId: number, msg: string): void {
    botInstance
      .sendMessage(chatId, msg, { parse_mode: "HTML" })
      .catch(e => glog.error(e));
  }

  sendMsgToAdmin(msg: string): void {
    botInstance.sendMessage(ADMIN_CHATID, `WARNING FROM bot:\n${msg}`, {
      parse_mode: "HTML"
    });
  }

  async checkAuthUser(username?: string): Promise<void> {
    if (!username) {
      this.sendMsgToAdmin("Unauthorized user comes in");
      throw "whoisthis";
    }
    let auth = await DbHandler.isExistingUsername(username);
    if (auth) {
      return;
    } else {
      this.sendMsgToAdmin(`Unauthorized user ${username}`);
      throw "no-auth";
    }
  }

  addUser(
    chatId: number,
    id: string | undefined,
    name: string | undefined,
    type: string = "user"
  ) {
    if (!id || !name) {
      this.sendMsg(chatId, "🌈 사용법 : /adduser [id] [이름] [admin/user]");
      return;
    }
    this.sendMsgToAdmin("Hidden Cmd: 새로운 사용자 추가");
    this.sendMsgToAdmin(`ID: ${id} NAME: ${name}`);
    DbHandler.insertNewUser(id, name, type)
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 추가되었습니다"))
      .catch(e => glog.error(e));
  }

  upUser(
    chatId: number,
    id: string | undefined,
    name: string | undefined,
    type: string = "user"
  ) {
    if (!id || !name) {
      this.sendMsg(chatId, "🌈 사용법 : /upuser [id] [이름] [admin/user]");
      return;
    }
    this.sendMsgToAdmin("Hidden Cmd: 새로운 사용자 갱신");
    this.sendMsgToAdmin(`ID: ${id} NAME: ${name}`);
    DbHandler.updateUser(id, name, type)
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 갱신되었습니다"))
      .catch(e => glog.error(e));
  }

  delUser(chatId: number, id: string | undefined) {
    if (!id) {
      this.sendMsg(chatId, "🌈 사용법 : /deluser [id]");
      return;
    }
    this.sendMsgToAdmin("Hidden Cmd: 사용자 삭제");
    this.sendMsgToAdmin(`ID: ${id}`);
    DbHandler.deleteUser(id)
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 삭제되었습니다"))
      .catch(e => glog.error(e));
  }

  showAllUsers(chatId: number) {
    DbHandler.getAllUsers().then(users => {
      let allUsers = "⚠ 특수 명령이 허용된 사용자 목록\n\n";
      for (let user of users) {
        allUsers += `🎫 ${user.username}\n`;
        allUsers += `🤶 ${user.first_name}\n`;
        allUsers += `---------------------\n`;
      }
      this.sendMsg(chatId, allUsers);
    });
  }

  startBot(chatId: number) {
    this.sendMsg(chatId, "환영합니다. 처음 오신분은 관리자에게 문의하세요.");
  }

  authUserCommand(
    chatId: number,
    username: string | undefined,
    callback: () => any
  ) {
    if (!username) {
      this.sendMsg(chatId, NON_AUTH_WARN_MSG);
      return;
    }
    this.checkAuthUser(username)
      .then(() => {
        callback();
      })
      .catch(e => this.sendMsg(chatId, NON_AUTH_WARN_MSG));
  }

  adminCommand(
    chatId: number,
    username: string | undefined,
    callback: () => any
  ) {
    if (!username) {
      return;
    }
    DbHandler.isAdminUser(username)
      .then(async admin => {
        if (admin) {
          callback();
        } else {
          this.sendMsg(chatId, "👿 당신은 관리자가 아닙니다");
          this.sendMsgToAdmin(`No Auth user ${username}`);
        }
      })
      .catch(e => glog.error(e));
  }

  private _messageHandler = (msg: TelegramBot.Message): void => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    if (msg.entities && msg.entities[0].type === "bot_command") {
      const cmd = msg.text?.split(" ") ?? [""];
      switch (true) {
        // ----------------------------------- 게스트 메뉴
        case /\/help/.test(cmd[0]):
          this.showHelp(chatId);
          break;
        case /\/start/.test(cmd[0]):
          this.startBot(chatId);
          break;
        case /\/allusers/.test(cmd[0]):
          this.showAllUsers(chatId);
          break;
        // ----------------------------------- 수퍼관리자 메뉴
        case /\/ahelp/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.showAdminHelp(chatId);
          });
          break;
        case /\/adduser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.addUser(chatId, cmd[1], cmd[2], cmd[3]);
          });
          break;
        case /\/upuser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.upUser(chatId, cmd[1], cmd[2], cmd[3]);
          });
          break;
        case /\/deluser/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this.delUser(chatId, cmd[1]);
          });
          break;
        default:
          console.log(`${username} - ${msg.text}`);
          break;
      }
      return;
    } else {
      console.log(msg.text);
      this.authUserCommand(chatId, username, () => {
        let valid = /^(ftp|http|https):\/\/[^ "]+$/.test(msg.text!);
        if (valid === true) {
          ApiCaller.getInstance().getContent(msg.text!);
        } else {
          this.sendMsg(chatId, "👿 이건 URL이 아니잖아!");
        }
      });
    }
  };
}
