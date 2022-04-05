import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";
import {
  InlineKeyboard,
  InlineKeyboardButton,
  Row
} from "node-telegram-keyboard-wrapper";
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
  private _fileTypeMsg = "🎫 파일 타입을 선택해주세요";

  static addChannelToFileName = false;
  static addUploadDateToFileName = false;

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
    botInstance.on("callback_query", msg => {
      let chatId = msg.message?.chat.id;
      let text = msg.message?.text;
      let username = msg.from.username;
      let fileType = msg.data;

      if (text === this._fileTypeMsg) {
        // 파일타입 선택 버튼
        if (fileType === "none") {
          DbHandler.deleteAllFileType(username!)
            .then(result => {
              botInstance.answerCallbackQuery(msg.id).then(() => {
                this.sendMsg(chatId!, `🌈 ${result}`);
              });
            })
            .catch(e => glog.error(e));
        } else {
          this.setDefaultFileType(chatId!, username, fileType)
            .then(result => {
              botInstance.answerCallbackQuery(msg.id).then(() => {
                this.sendMsg(chatId!, `🌈 ${result}`);
              });
            })
            .catch(e => glog.error(e));
        }
      } else {
        // 다운로드 url
        ApiCaller.getInstance()
          .getContent(text!, fileType)
          .then(result => {
            botInstance.answerCallbackQuery(msg.id).then(() => {
              this.sendMsg(chatId!, `🎉 다운로드 완료\n${result}`);
            });
          })
          .catch(e => {
            this.sendMsg(chatId!, `👿 ${e}`);
          });
      }
    });
  }

  showHelp(chatId: number) {
    let helpMsg = "/help - 이 도움말 보기\n";
    helpMsg += "/allusers - 모든 사용자 보기\n";
    helpMsg += "/setft - 기본 파일 타입 지정하기\n";
    helpMsg += "/showft - 기본 파일 타입 보기\n";

    this.sendMsg(chatId, helpMsg);
  }

  showAdminHelp(chatId: number) {
    let helpMsg = "/adduser - 사용자 추가 명령\n";
    helpMsg += "/upuser - 사용자 갱신\n";
    helpMsg += "/deluser - 사용자 제거\n";
    helpMsg += "/chtof - 채널 이름을 저장 파일이름에 추가\n";
    helpMsg += "/udtof - 업로드 날짜를 저장 파일 이름에 추가\n";

    helpMsg +=
      "\n-----------------\nudtof, chtof 명령은 서버를 재설치하면 리셋됩니다.\n그리고 모든 사용자에게 적용됩니다.";
    this.sendMsg(chatId, helpMsg);
  }

  sendMsg(
    chatId: number,
    msg: string,
    options: SendMessageOptions = { parse_mode: "HTML" }
  ): void {
    botInstance.sendMessage(chatId, msg, options).catch(e => glog.error(e));
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
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 추가 되었습니다"))
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
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 갱신 되었습니다"))
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
      .then(() => this.sendMsg(chatId, "🌈 성공적으로 삭제 되었습니다"))
      .catch(e => glog.error(e));
  }

  showAllUsers(chatId: number) {
    DbHandler.getAllUsers().then(users => {
      let allUsers = "⚠ 허용된 사용자 목록\n\n";
      for (let user of users) {
        allUsers += `🎫 ${user.username}\n`;
        allUsers += `🤶 ${user.first_name}\n`;
        allUsers += `---------------------\n`;
      }
      this.sendMsg(chatId, allUsers);
    });
  }

  async setDefaultFileType(
    chatId: number,
    username: string | undefined,
    fileType: string | undefined
  ): Promise<string> {
    if (!username || !fileType) {
      return "응?";
    }

    let result = await DbHandler.addOrDeleteFileType(username, fileType);
    return result;
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

  private sendFileTypeButtons(
    chatId: number,
    msg: string,
    setType: boolean = false
  ) {
    let ik = new InlineKeyboard();
    let firstRow = new Row<InlineKeyboardButton>();
    let secondRow = new Row<InlineKeyboardButton>();

    let _firstRowFormatButtons = [
      new InlineKeyboardButton("mp3", "callback_data", "mp3"),
      new InlineKeyboardButton("mp4", "callback_data", "mp4"),
      new InlineKeyboardButton("m4a", "callback_data", "m4a")
    ];

    let _secondRowFormatButtons = [
      new InlineKeyboardButton("flac", "callback_data", "flac"),
      new InlineKeyboardButton("ogg", "callback_data", "ogg"),
      new InlineKeyboardButton("wav", "callback_data", "wav"),
      new InlineKeyboardButton("webm", "callback_data", "webm")
    ];

    firstRow.push(..._firstRowFormatButtons);
    secondRow.push(..._secondRowFormatButtons);

    ik.push(firstRow);
    ik.push(secondRow);
    if (setType === true) {
      // 파일 타입 삭제 버튼
      let thirdRow = new Row<InlineKeyboardButton>();
      thirdRow.push(new InlineKeyboardButton("none", "callback_data", "none"));
      ik.push(thirdRow);
    }
    this.sendMsg(chatId, msg, {
      reply_markup: ik.getMarkup()
    });
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
        case /\/chtof/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            BotService.addChannelToFileName = !BotService.addChannelToFileName;
            this.sendMsg(
              chatId!,
              BotService.addChannelToFileName
                ? `😀 파일 이름에 채널이름이 들어갑니다.`
                : `😱 파일 이름에 채널이름이 빠집니다.`
            );
          });
          break;
        case /\/udtof/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            BotService.addUploadDateToFileName =
              !BotService.addUploadDateToFileName;
            this.sendMsg(
              chatId!,
              BotService.addUploadDateToFileName
                ? `😀 파일 이름에 업로드 날짜가 들어갑니다.`
                : `😱 파일 이름에 업로드 날짜가 빠집니다.`
            );
          });
          break;
        case /\/setft/.test(cmd[0]):
          this.authUserCommand(chatId, username, () => {
            this.sendFileTypeButtons(chatId, this._fileTypeMsg, true);
            // this.setDefaultFileType(chatId, username, cmd[1]);
          });
          break;
        case /\/showft/.test(cmd[0]):
          this.authUserCommand(chatId, username, () => {
            DbHandler.getAllFileTypeForUser(username!).then(results => {
              if (results.length > 0) {
                let fileTypes = `😍 [${username}]님의 기본 파일타입입니다\n\n`;
                for (let type of results) {
                  fileTypes += `${type.filetype}\n`;
                }
                this.sendMsg(chatId!, fileTypes);
              } else {
                this.sendMsg(chatId!, `😪 등록된 파일이 없어요`);
              }
            });
          });
          break;
        default:
          console.log(`${username} - ${msg.text}`);
          break;
      }
      return;
    } else {
      this.authUserCommand(chatId, username, () => {
        let valid = /^(ftp|http|https):\/\/[^ "]+$/.test(msg.text!);
        if (valid === true) {
          DbHandler.getAllFileTypeForUser(username!).then(results => {
            if (results.length > 0) {
              for (let type of results) {
                ApiCaller.getInstance()
                  .getContent(msg.text!, type.filetype)
                  .then(result => {
                    this.sendMsg(chatId!, `🎉 다운로드 완료\n${result}`);
                  })
                  .catch(e => {
                    this.sendMsg(chatId!, `👿 ${e}`);
                  });
              }
            } else {
              let ytdlUrl = msg.text!;
              this.sendFileTypeButtons(chatId, ytdlUrl);
            }
          });
        } else {
          this.sendMsg(chatId, "👿 이건 URL이 아니잖아!");
        }
      });
    }
  };
}
