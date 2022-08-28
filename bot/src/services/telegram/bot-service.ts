import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";
import {
  InlineKeyboard,
  InlineKeyboardButton,
  Row
} from "node-telegram-keyboard-wrapper";
import { ADMIN_CHATID, botInstance } from "../../global-bot-config";
import ApiCaller from "../axios/api-caller";
import { glog } from "../logger/custom-logger";
import DbHandler, { IYtdlGlobalOptionToObj } from "../sqlite/db-handler";
import fs from "fs";
import TelegramModel from "../../models/telegram-model";
import { LF } from "../../language/language-factory";

enum CheckReplyForDelete {
  StopProcessing = 1,
  KeepProcessing
}

export default class BotService {
  private static instance: BotService;
  private _fileTypeMsg = LF.str.selectFileType;
  private _stopDownloadingPlaylist = false;

  _addChannelNameToFileNameKey = "addChannelNameToFileName";
  _addUploadDateNameToFileNameKey = "addUploadDateNameToFileName";

  private _tm = new TelegramModel();
  private _globalOptions: IYtdlGlobalOptionToObj = {};

  public get globalOptions() {
    return this._globalOptions;
  }

  public set globalOptions(options: IYtdlGlobalOptionToObj) {
    this._globalOptions = options;
  }

  private constructor() {
    DbHandler.getGlobalOptions().then(options => {
      this._globalOptions = this._tm.arrayToObj(options);
      glog.info(
        `[Line - 44][File - bot-service.ts] Show Global Options %o`,
        this._globalOptions
      );
    });
  }

  static getInstance() {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }

    return BotService.instance;
  }

  start() {
    botInstance.on("message", this._messageHandler);
    botInstance.on("polling_error", err => console.log(err));
    botInstance.on("callback_query", async msg => {
      let chatId = msg.message?.chat.id;
      let text = msg.message?.text;
      let username = msg.from.username;
      let fileType = msg.data;

      try {
        if (text === this._fileTypeMsg) {
          // 파일타입 선택 버튼
          if (fileType === "none") {
            let result = await DbHandler.deleteAllFileType(username!);
            this.sendMsg(chatId!, `🌈 ${result}`);
          } else {
            let result = await this.setDefaultFileType(
              chatId!,
              username,
              fileType
            );
            this.sendMsg(chatId!, `🌈 ${result}`);
          }
        } else {
          // 다운로드 url
          if (this.isPlayList(text!) === true) {
            await this.downloadPlayList(chatId!, [fileType!], text!);
            return;
          }
          await this.downloadSingleFile(chatId!, [fileType!], text!);
        }
      } catch (error) {
        this.sendMsg(chatId!, `👿 ${error}`);
      }
    });
  }

  async downloadPlayList(
    chatId: number,
    fileTypes: Array<string>,
    url: string
  ) {
    this._stopDownloadingPlaylist = false;
    this.sendMsg(chatId!, LF.str.searchingPlayList);
    let playList = await ApiCaller.getInstance().getRssContentFromPlaylist(url);
    this.sendMsg(chatId!, LF.str.searchingCompleted(playList.items.length));

    let title = playList.title;
    let songs = playList.items;

    let index = 1;
    let totalCount = songs.length * fileTypes.length;

    for (let song of songs) {
      if (this._stopDownloadingPlaylist) {
        this.sendMsg(chatId!, LF.str.stopDownloadingPlaylist);
        this._stopDownloadingPlaylist = false;
        return;
      }
      for (let type of fileTypes) {
        this.sendMsg(chatId!, LF.str.startDownloading(song.title, type));
        let result = await ApiCaller.getInstance().getContent(
          song.link[0],
          type,
          true,
          title
        );
        this.sendMsg(
          chatId!,
          LF.str.downloadCompleted(
            type,
            result as string,
            `${index++}/${totalCount}`
          )
        );
      }
    }
    this.sendMsg(chatId!, LF.str.completelyDownloadPlayList);
  }

  async downloadSingleFile(
    chatId: number,
    fileTypes: Array<string>,
    url: string
  ) {
    for (let type of fileTypes) {
      this.sendMsg(chatId!, LF.str.startDownloading("", type));
      let result = await ApiCaller.getInstance().getContent(url, type);
      this.sendMsg(chatId!, LF.str.downloadCompleted(type, result as string));
    }
  }

  showHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showHelp);
  }

  showAdminHelp(chatId: number) {
    this.sendMsg(chatId, LF.str.showAdminHelp);
  }

  sendMsg(
    chatId: number,
    msg: string,
    options: SendMessageOptions = { parse_mode: "HTML" }
  ): void {
    botInstance.sendMessage(chatId, msg, options).catch(e => glog.error(e));
  }

  sendMsgToAdmin(msg: string): void {
    botInstance.sendMessage(ADMIN_CHATID, LF.str.warningFromBot(msg), {
      parse_mode: "HTML"
    });
  }

  async checkAuthUser(username?: string): Promise<void> {
    if (!username) {
      this.sendMsgToAdmin(LF.str.unauthorizedUserComesIn("Unknown"));
      throw "whoisthis";
    }
    let auth = await DbHandler.isExistingUsername(username);
    if (auth) {
      return;
    } else {
      this.sendMsgToAdmin(LF.str.unauthorizedUserComesIn(username));
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
      this.sendMsg(chatId, LF.str.howToAddUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.newlyAddUserAdminCmd(id, name));
    DbHandler.insertNewUser(id, name, type)
      .then(() => this.sendMsg(chatId, LF.str.successfullyAdded))
      .catch(e => glog.error(e));
  }

  upUser(
    chatId: number,
    id: string | undefined,
    name: string | undefined,
    type: string = "user"
  ) {
    if (!id || !name) {
      this.sendMsg(chatId, LF.str.howToUpUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.updateUserAdminCmd(id, name));
    DbHandler.updateUser(id, name, type)
      .then(() => this.sendMsg(chatId, LF.str.successfullyUpdated))
      .catch(e => glog.error(e));
  }

  delUser(chatId: number, id: string | undefined) {
    if (!id) {
      this.sendMsg(chatId, LF.str.howToDelUser);
      return;
    }
    this.sendMsgToAdmin(LF.str.deleteUserAdminCmd(id));
    DbHandler.deleteUser(id)
      .then(() => this.sendMsg(chatId, LF.str.successfullyDeleted))
      .catch(e => glog.error(e));
  }

  showAllUsers(chatId: number) {
    DbHandler.getAllUsers().then(users => {
      let allUsers = `${LF.str.allowedUsers}\n\n`;
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
    this.sendMsg(chatId, LF.str.welcomeMessage);
  }

  authUserCommand(
    chatId: number,
    username: string | undefined,
    callback: () => any
  ) {
    if (!username) {
      this.sendMsg(chatId, LF.str.noAuthUserWarnMsg);
      return;
    }
    this.checkAuthUser(username)
      .then(() => {
        callback();
      })
      .catch(e => this.sendMsg(chatId, LF.str.noAuthUserWarnMsg));
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
          this.sendMsg(chatId, LF.str.notAdminWarn);
        }
      })
      .catch(e => glog.error(e));
  }

  private async runLinuxCommand(cmd: string) {
    let exec = require("child_process").exec;
    const output = await exec(cmd);
    console.log(output);
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

  private isDeleteWords(text: string): boolean {
    return (
      text === "지우기" ||
      text === "삭제" ||
      text === "d" ||
      text === "del" ||
      text === "delete"
    );
  }

  private isStopDownloadingWords(text: string): boolean {
    return (
      text === "정지" || text === "멈춤" || text === "stop" || text === "s"
    );
  }

  private stopDownloadingPlaylist(msg: TelegramBot.Message) {
    if (this.isStopDownloadingWords(msg.text ?? "")) {
      this._stopDownloadingPlaylist = true;
      return true;
    }
    return false;
  }

  private isPlayList(text: string): boolean {
    return text.includes("playlist?list=");
  }

  checkReplyAndDeleteFile(msg: TelegramBot.Message): CheckReplyForDelete {
    const chatId = msg.chat.id;
    let channel = msg.reply_to_message?.text?.split("\n")?.[3] ?? null;

    // 해당 메세지를 지우겠다는 의미
    if (channel !== null && this.isDeleteWords(msg.text ?? "")) {
      let downloadChannelDir = `./download/${channel.replace(
        LF.str.channelName,
        ""
      )}`;
      let filename = msg.reply_to_message?.text?.split("\n")?.[7] ?? null;
      if (
        filename !== null &&
        fs.existsSync(`${downloadChannelDir}/${filename}`)
      ) {
        fs.unlink(`${downloadChannelDir}/${filename}`, err => {
          if (err) {
            this.sendMsg(chatId!, err.message);
            return;
          }
          botInstance.deleteMessage(
            chatId,
            `${msg.reply_to_message?.message_id}`
          );
          this.sendMsg(chatId!, LF.str.successfullyDeleted);
        });
      }
      return CheckReplyForDelete.StopProcessing;
    } else if (channel !== null && !this.isDeleteWords(msg.text!)) {
      this.sendMsg(chatId!, LF.str.notACmd);
      return CheckReplyForDelete.StopProcessing;
    }

    return CheckReplyForDelete.KeepProcessing;
  }

  private _messageHandler = (msg: TelegramBot.Message): void => {
    const chatId = msg.chat.id;
    const username = msg.from?.username;

    if (this.stopDownloadingPlaylist(msg)) {
      return;
    }

    if (
      this.checkReplyAndDeleteFile(msg) === CheckReplyForDelete.StopProcessing
    ) {
      return;
    }

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
            this._globalOptions.addChannelNameToFileName =
              this._globalOptions.addChannelNameToFileName === "on"
                ? "off"
                : "on";
            this.sendMsg(
              chatId!,
              this._globalOptions.addChannelNameToFileName === "on"
                ? LF.str.addChannelToFilename
                : LF.str.delChannelToFilename
            );
            DbHandler.upsertOptions(
              this._addChannelNameToFileNameKey,
              this._globalOptions.addChannelNameToFileName
            ).catch(e =>
              glog.error(`[Line - 326][File - bot-service.ts] %o`, e)
            );
          });
          break;
        case /\/udtof/.test(cmd[0]):
          this.adminCommand(chatId, username, () => {
            this._globalOptions.addUploadDateNameToFileName =
              this._globalOptions.addUploadDateNameToFileName === "on"
                ? "off"
                : "on";
            this.sendMsg(
              chatId!,
              this._globalOptions.addUploadDateNameToFileName === "on"
                ? LF.str.addUploadDateToFilename
                : LF.str.delUploadDateToFilename
            );
            DbHandler.upsertOptions(
              this._addUploadDateNameToFileNameKey,
              this._globalOptions.addUploadDateNameToFileName
            ).catch(e =>
              glog.error(`[Line - 326][File - bot-service.ts] %o`, e)
            );
          });
          break;
        case /\/setft/.test(cmd[0]):
          this.authUserCommand(chatId, username, () => {
            this.sendFileTypeButtons(chatId, this._fileTypeMsg, true);
            // this.setDefaultFileType(chatId, username, cmd[1]);
          });
          break;
        case /\/ff/.test(cmd[0]):
          this.authUserCommand(chatId, username, () => {
            this.sendFileTypeButtons(chatId, this._fileTypeMsg, true);
            let rootPath = process.env.SEARCH_ROOT_PATH ?? "/volume1/Music";
            this.runLinuxCommand(`find ${rootPath} -name "*${cmd[1]}*"`);
          });
          break;
        case /\/showft/.test(cmd[0]):
          this.authUserCommand(chatId, username, () => {
            DbHandler.getAllFileTypeForUser(username!).then(results => {
              if (results.length > 0) {
                let fileTypes = LF.str.showDefaultFileTypes(username!);
                for (let type of results) {
                  fileTypes += `${type.filetype}\n`;
                }
                this.sendMsg(chatId!, fileTypes);
              } else {
                this.sendMsg(chatId!, LF.str.noDefaultFileTypes);
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
          if (this.isPlayList(msg.text!) === true) {
            DbHandler.getAllFileTypeForUser(username!).then(async results => {
              if (results.length > 0) {
                this.downloadPlayList(
                  chatId,
                  results.map(v => v.filetype),
                  msg.text!
                ).catch(e => {
                  this.sendMsg(chatId!, `👿 ${e}`);
                });
              } else {
                let ytdlUrl = msg.text!;
                this.sendFileTypeButtons(chatId, ytdlUrl);
              }
            });
            return;
          }
          DbHandler.getAllFileTypeForUser(username!).then(async results => {
            if (results.length > 0) {
              this.downloadSingleFile(
                chatId,
                results.map(v => v.filetype),
                msg.text!
              ).catch(e => {
                this.sendMsg(chatId!, `👿 ${e}`);
              });
            } else {
              let ytdlUrl = msg.text!;
              this.sendFileTypeButtons(chatId, ytdlUrl);
            }
          });
        } else {
          this.sendMsg(chatId, LF.str.thisIsNotURL);
        }
      });
    }
  };
}
