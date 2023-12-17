import { ILanguageBot } from "./language-factory";

export default class EnglishBot implements ILanguageBot {
  selectFileType = "🎫 Choose default file types";
  searchingPlayList = "📃 Searching playlist...";
  howToAddUser = "🌈 HowTo : /adduser [id] [desc] [admin/user]";
  successfullyAdded = "🌈 Successfully [[ Added ]]";
  howToUpUser = "🌈 HowTo : /upuser [id] [desc] [admin/user]";
  successfullyUpdated = "🌈 Successfully [[ Updated ]]";
  howToDelUser = "🌈 HowTo : /deluser [id]";
  successfullyDeleted = "🌈 Successfully [[ Deleted ]]";
  allowedUsers = "⚠ Allowed Users List";
  welcomeMessage = "Welcome to Ytdl bot. Ask Admin to grant access";
  noAuthUserWarnMsg =
    "🌼 Install Guide:\nhttps://github.com/yellowgg2/youngs-ytdl\n\nYou don't have permission to use this bot directly.\nAsk Admin.";
  notAdminWarn = "👿 You are not Admin";
  notACmd = "😥 There is no cmd like this.";
  addChannelToFilename = `😀 Filename will include channel name from now on.`;
  delChannelToFilename = `😱 Filename will not include channel name from now on.`;
  addUploadDateToFilename = `😀 Filename will include upload date from now on.`;
  delUploadDateToFilename = `😱 Filename will not include upload date from now on.`;
  noDefaultFileTypes = `😪 There is no default file type.`;
  thisIsNotURL = "👿 This is not URL!";
  successfullyDeleteAllTypes = `Successfully [[ DELETE ]] all file types`;
  stopDownloadingPlaylist = "👀 Stop downloading playlist.";
  completelyDownloadPlayList =
    "🌈 Successfully downloaded all videos in the list";

  channelName = "Channel: ";
  uploadDate = "Upload Date: ";

  successfullyAddType(type: string): string {
    return `${this.successfullyAdded} [${type}]`;
  }

  successfullyDelType(type: string): string {
    return `${this.successfullyDeleted} [${type}]`;
  }

  newlyAddUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: User newly added ${id} - ${desc}`;
  }

  updateUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: User updated ${id} - ${desc}`;
  }

  deleteUserAdminCmd(id: string): string {
    return `Admin Warning: User deleted ${id}`;
  }

  unauthorizedUserComesIn(username: string): string {
    return `NoAuth User [${username}] tries to use the bot.`;
  }

  searchingCompleted(count: number): string {
    return `📃 Completely searched. (${count} items)`;
  }
  downloadCompleted(
    type: string,
    result: string,
    remainCountStr: string = "1/1"
  ): string {
    return `🎉 Completely downloaded [${type}]\n\nRemain Count: ${remainCountStr}\n${result}`;
  }

  startDownloading(title: string, type: string): string {
    let localTitle = title !== "" ? `\n\n[${title}] ` : "";
    return `😊 Start downloading ${localTitle}[${type}]`;
  }

  warningFromBot(msg: string): string {
    return `WARNING :\n${msg}`;
  }

  public get showHelp(): string {
    let helpMsg = "/help - Show help menu\n";
    helpMsg += "/allusers - Show all users registered\n";
    helpMsg += "/setft - Set default file types\n";
    helpMsg += "/showft - Show default file types\n";
    helpMsg += "\n😏 Additional Feature\n";
    helpMsg += "To delete file from the download directory, \n";
    helpMsg +=
      "reply to download completed message with \none of the words below.\n\n";

    helpMsg += "지우기, 삭제, d, del, delete";

    return helpMsg;
  }

  public get showAdminHelp(): string {
    let helpMsg = "/adduser - Add User\n";
    helpMsg += "/upuser - Update User\n";
    helpMsg += "/deluser - Delete User\n";
    helpMsg += "/chtof - Add Channel To filename\n";
    helpMsg += "/udtof - Add Upload Date To filename\n";

    helpMsg +=
      "\n-----------------\nudtof, chtof Toggled if executed the cmd again.\nThis will be applied to all users current and future users registered";

    return helpMsg;
  }

  showDefaultFileTypes(username: string): string {
    return `😍 Default file types for [${username}]\n\n`;
  }
}
