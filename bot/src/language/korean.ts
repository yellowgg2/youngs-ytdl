import { ILanguageBot } from "./language-factory";

export default class KoreanBot implements ILanguageBot {
  selectFileType = "🎫 파일 타입을 선택해주세요";
  searchingPlayList = "📃 플레이 리스트를 검색 중입니다.";
  howToAddUser = "🌈 사용법 : /adduser [id] [설명] [admin/user]";
  successfullyAdded = "🌈 성공적으로 [[ 추가 ]] 되었습니다";
  howToUpUser = "🌈 사용법 : /upuser [id] [설명] [admin/user]";
  successfullyUpdated = "🌈 성공적으로 [[ 변경 ]] 되었습니다";
  howToDelUser = "🌈 사용법 : /deluser [id]";
  successfullyDeleted = "🌈 성공적으로 [[ 삭제 ]] 되었습니다";
  allowedUsers = "⚠ 허용된 사용자 목록";
  welcomeMessage = "환영합니다. 처음 오신분은 관리자에게 문의하세요.";
  noAuthUserWarnMsg = "🌼 권한이 없습니다.\n관리자에게 문의하세요.";
  notAdminWarn = "👿 당신은 관리자가 아닙니다";
  notACmd = "😥 해당 명령은 없어요!";
  addChannelToFilename = `😀 파일 이름에 채널이름이 들어갑니다.`;
  delChannelToFilename = `😱 파일 이름에 채널이름이 빠집니다.`;
  addUploadDateToFilename = `😀 파일 이름에 업로드 날짜가 들어갑니다.`;
  delUploadDateToFilename = `😱 파일 이름에 업로드 날짜가 빠집니다.`;
  noDefaultFileTypes = `😪 등록된 파일이 없어요`;
  thisIsNotURL = "👿 이건 URL이 아니잖아!";
  successfullyDeleteAllTypes = `성공적으로 [[ 모든 ]] 타입을 삭제했습니다.`;

  channelName = "채널명: ";
  uploadDate = "업로드 날짜: ";

  successfullyAddType(type: string): string {
    return `성공적으로 [[ 추가 ]] 했습니다. [${type}]`;
  }

  successfullyDelType(type: string): string {
    return `성공적으로 [[ 삭제 ]] 했습니다. [${type}]`;
  }

  newlyAddUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: 새로운 사용자 추가됨 ${id} - ${desc}`;
  }

  updateUserAdminCmd(id: string, desc: string): string {
    return `Admin Warning: 사용자 갱신 됨 ${id} - ${desc}`;
  }

  deleteUserAdminCmd(id: string): string {
    return `Admin Warning: 사용자 삭제 됨 ${id}`;
  }

  unauthorizedUserComesIn(username: string): string {
    return `인증되지 않은 사용자 [${username}] 가 봇을 사용하려 시도함`;
  }

  searchingCompleted(count: number): string {
    return `📃 플레이 리스트를 검색 완료. (${count}개 항목)`;
  }
  downloadCompleted(type: string, result: string): string {
    return `🎉 다운로드 완료 [${type}]\n${result}`;
  }

  startDownloading(title: string, type: string): string {
    return `😊 다운로드를 시작합니다.\n\n[${title}] [${type}]`;
  }

  warningFromBot(msg: string): string {
    return `경고 :\n${msg}`;
  }

  public get showHelp(): string {
    let helpMsg = "/help - 이 도움말 보기\n";
    helpMsg += "/allusers - 모든 사용자 보기\n";
    helpMsg += "/setft - 기본 파일 타입 지정하기\n";
    helpMsg += "/showft - 기본 파일 타입 보기\n";
    helpMsg += "\n😏 부가기능\n";
    helpMsg += "다운로드 완료 메세지에 reply로\n";
    helpMsg += "아래 단어 중 하나 입력하면\n저장 파일을 삭제합니다\n\n";

    helpMsg += "지우기, 삭제, d, del, delete";

    return helpMsg;
  }

  public get showAdminHelp(): string {
    let helpMsg = "/adduser - 사용자 추가 명령\n";
    helpMsg += "/upuser - 사용자 갱신\n";
    helpMsg += "/deluser - 사용자 제거\n";
    helpMsg += "/chtof - 채널 이름을 저장 파일이름에 추가\n";
    helpMsg += "/udtof - 업로드 날짜를 저장 파일 이름에 추가\n";

    helpMsg +=
      "\n-----------------\nudtof, chtof 명령은 실행할 때마다 토글되며,\n모든 사용자에게 적용됩니다.";

    return helpMsg;
  }

  showDefaultFileTypes(username: string): string {
    return `😍 [${username}]님의 기본 파일타입입니다\n\n`;
  }
}
