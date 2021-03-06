import { ILanguageBot } from "./language-factory";

export default class KoreanBot implements ILanguageBot {
  selectFileType = "π« νμΌ νμμ μ νν΄μ£ΌμΈμ";
  searchingPlayList = "π νλ μ΄ λ¦¬μ€νΈλ₯Ό κ²μ μ€μλλ€.";
  howToAddUser = "π μ¬μ©λ² : /adduser [id] [μ€λͺ] [admin/user]";
  successfullyAdded = "π μ±κ³΅μ μΌλ‘ [[ μΆκ° ]] λμμ΅λλ€";
  howToUpUser = "π μ¬μ©λ² : /upuser [id] [μ€λͺ] [admin/user]";
  successfullyUpdated = "π μ±κ³΅μ μΌλ‘ [[ λ³κ²½ ]] λμμ΅λλ€";
  howToDelUser = "π μ¬μ©λ² : /deluser [id]";
  successfullyDeleted = "π μ±κ³΅μ μΌλ‘ [[ μ­μ  ]] λμμ΅λλ€";
  allowedUsers = "β  νμ©λ μ¬μ©μ λͺ©λ‘";
  welcomeMessage = "νμν©λλ€. μ²μ μ€μ λΆμ κ΄λ¦¬μμκ² λ¬ΈμνμΈμ.";
  noAuthUserWarnMsg = "πΌ κΆνμ΄ μμ΅λλ€.\nκ΄λ¦¬μμκ² λ¬ΈμνμΈμ.";
  notAdminWarn = "πΏ λΉμ μ κ΄λ¦¬μκ° μλλλ€";
  notACmd = "π₯ ν΄λΉ λͺλ Ήμ μμ΄μ!";
  addChannelToFilename = `π νμΌ μ΄λ¦μ μ±λμ΄λ¦μ΄ λ€μ΄κ°λλ€.`;
  delChannelToFilename = `π± νμΌ μ΄λ¦μ μ±λμ΄λ¦μ΄ λΉ μ§λλ€.`;
  addUploadDateToFilename = `π νμΌ μ΄λ¦μ μλ‘λ λ μ§κ° λ€μ΄κ°λλ€.`;
  delUploadDateToFilename = `π± νμΌ μ΄λ¦μ μλ‘λ λ μ§κ° λΉ μ§λλ€.`;
  noDefaultFileTypes = `πͺ λ±λ‘λ νμΌμ΄ μμ΄μ`;
  thisIsNotURL = "πΏ μ΄κ±΄ URLμ΄ μλμμ!";
  successfullyDeleteAllTypes = `μ±κ³΅μ μΌλ‘ [[ λͺ¨λ  ]] νμμ μ­μ νμ΅λλ€.`;
  stopDownloadingPlaylist = "π νλ μ΄λ¦¬μ€νΈ λ€μ΄λ‘λλ₯Ό μ€μ§ν©λλ€.";
  completelyDownloadPlayList =
    "π μ±κ³΅μ μΌλ‘ νλ μ΄λ¦¬μ€νΈκ° λ€μ΄λ‘λλμμ΅λλ€";

  channelName = "μ±λλͺ: ";
  uploadDate = "μλ‘λ λ μ§: ";

  successfullyAddType(type: string): string {
    return `μ±κ³΅μ μΌλ‘ [[ μΆκ° ]] νμ΅λλ€. [${type}]`;
  }

  successfullyDelType(type: string): string {
    return `μ±κ³΅μ μΌλ‘ [[ μ­μ  ]] νμ΅λλ€. [${type}]`;
  }

  newlyAddUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: μλ‘μ΄ μ¬μ©μ μΆκ°λ¨ ${id} - ${desc}`;
  }

  updateUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: μ¬μ©μ κ°±μ  λ¨ ${id} - ${desc}`;
  }

  deleteUserAdminCmd(id: string): string {
    return `Admin Warning: μ¬μ©μ μ­μ  λ¨ ${id}`;
  }

  unauthorizedUserComesIn(username: string): string {
    return `μΈμ¦λμ§ μμ μ¬μ©μ [${username}] κ° λ΄μ μ¬μ©νλ € μλν¨`;
  }

  searchingCompleted(count: number): string {
    return `π νλ μ΄ λ¦¬μ€νΈλ₯Ό κ²μ μλ£. (${count}κ° ν­λͺ©)`;
  }
  downloadCompleted(
    type: string,
    result: string,
    remainCountStr: string = "1/1"
  ): string {
    return `π λ€μ΄λ‘λ μλ£ [${type}]\n\nλ¨μ κ°―μ: ${remainCountStr}\n${result}`;
  }

  startDownloading(title: string, type: string): string {
    let localTitle = title !== "" ? `\n\n[${title}]` : "";
    return `π λ€μ΄λ‘λλ₯Ό μμν©λλ€.${localTitle}[${type}]`;
  }

  warningFromBot(msg: string): string {
    return `κ²½κ³  :\n${msg}`;
  }

  public get showHelp(): string {
    let helpMsg = "/help - μ΄ λμλ§ λ³΄κΈ°\n";
    helpMsg += "/allusers - λͺ¨λ  μ¬μ©μ λ³΄κΈ°\n";
    helpMsg += "/setft - κΈ°λ³Έ νμΌ νμ μ§μ νκΈ°\n";
    helpMsg += "/showft - κΈ°λ³Έ νμΌ νμ λ³΄κΈ°\n";
    helpMsg += "\nπ λΆκ°κΈ°λ₯\n";
    helpMsg += "λ€μ΄λ‘λ μλ£ λ©μΈμ§μ replyλ‘\n";
    helpMsg += "μλ λ¨μ΄ μ€ νλ μλ ₯νλ©΄\nμ μ₯ νμΌμ μ­μ ν©λλ€\n\n";

    helpMsg += "μ§μ°κΈ°, μ­μ , d, del, delete";

    return helpMsg;
  }

  public get showAdminHelp(): string {
    let helpMsg = "/adduser - μ¬μ©μ μΆκ° λͺλ Ή\n";
    helpMsg += "/upuser - μ¬μ©μ κ°±μ \n";
    helpMsg += "/deluser - μ¬μ©μ μ κ±°\n";
    helpMsg += "/chtof - μ±λ μ΄λ¦μ μ μ₯ νμΌμ΄λ¦μ μΆκ°\n";
    helpMsg += "/udtof - μλ‘λ λ μ§λ₯Ό μ μ₯ νμΌ μ΄λ¦μ μΆκ°\n";

    helpMsg +=
      "\n-----------------\nudtof, chtof λͺλ Ήμ μ€νν  λλ§λ€ ν κΈλλ©°,\nλͺ¨λ  μ¬μ©μμκ² μ μ©λ©λλ€.";

    return helpMsg;
  }

  showDefaultFileTypes(username: string): string {
    return `π [${username}]λμ κΈ°λ³Έ νμΌνμμλλ€\n\n`;
  }
}
