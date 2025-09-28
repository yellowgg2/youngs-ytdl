import { exec } from "child_process";
import { promisify } from "util";
import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";

const execAsync = promisify(exec);

interface IPlayListItem {
  title: string;
  link: string[];
}

interface IPlayList {
  title: string;
  items: IPlayListItem[];
}

export default class YtDlpService {
  private static instance: YtDlpService;

  static getInstance(): YtDlpService {
    if (!YtDlpService.instance) {
      YtDlpService.instance = new YtDlpService();
    }
    return YtDlpService.instance;
  }

  private constructor() {}

  async getContent(
    userId: string,
    url: string,
    format: string,
    isPlaylist: boolean = false,
    playlistTitle: string = ""
  ): Promise<string> {
    try {
      const botService = BotService.getInstance();
      const outputDir = `/ytdlbot/download/${userId}`;

      // 채널명과 업로드 날짜를 파일명에 포함할지 결정
      let filenameTemplate = "%(title)s.%(ext)s";

      if (botService.globalOptions.addChannelNameToFileName === "on") {
        filenameTemplate = "%(uploader)s_" + filenameTemplate;
      }

      if (botService.globalOptions.addUploadDateNameToFileName === "on") {
        filenameTemplate = "%(upload_date)s_" + filenameTemplate;
      }

      // 플레이리스트인 경우 플레이리스트 제목으로 폴더 생성
      let finalOutputPath = outputDir;
      if (isPlaylist && playlistTitle) {
        finalOutputPath = `${outputDir}/${playlistTitle.replace(/[/\\?%*:|"<>]/g, "_")}`;
      }

      const outputTemplate = `${finalOutputPath}/${filenameTemplate}`;

      // yt-dlp 명령어 구성
      const cmd = [
        "yt-dlp",
        "-f", this.getFormatSelector(format),
        "-o", `"${outputTemplate}"`,
        "--add-metadata",
        "--embed-thumbnail",
        "--write-info-json",
        `"${url}"`
      ].join(" ");

      glog.info(`[YtDlpService] Executing command: ${cmd}`);

      const { stdout, stderr } = await execAsync(cmd);

      if (stderr) {
        glog.warn(`[YtDlpService] stderr: ${stderr}`);
      }

      glog.info(`[YtDlpService] Download completed for ${url}`);

      // 다운로드된 파일명 추출 (실제 구현에서는 더 정교하게 파싱 필요)
      const downloadedFile = this.extractFilenameFromOutput(stdout);

      return downloadedFile || "Download completed successfully";

    } catch (error: any) {
      glog.error(`[YtDlpService] Error downloading ${url}: ${error.message}`);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async getRssContentFromPlaylist(playlistUrl: string): Promise<IPlayList> {
    try {
      // 플레이리스트 정보를 JSON 형태로 가져오기
      const cmd = `yt-dlp --dump-json --flat-playlist "${playlistUrl}"`;

      glog.info(`[YtDlpService] Getting playlist info: ${cmd}`);

      const { stdout } = await execAsync(cmd);

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const items: IPlayListItem[] = [];
      let playlistTitle = "Unknown Playlist";

      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);

          // 첫 번째 항목에서 플레이리스트 제목 가져오기
          if (jsonData.playlist_title && playlistTitle === "Unknown Playlist") {
            playlistTitle = jsonData.playlist_title;
          }

          if (jsonData.url && jsonData.title) {
            items.push({
              title: jsonData.title,
              link: [jsonData.url]
            });
          }
        } catch (parseError) {
          glog.warn(`[YtDlpService] Failed to parse playlist item: ${line}`);
        }
      }

      const playlist: IPlayList = {
        title: playlistTitle,
        items: items
      };

      glog.info(`[YtDlpService] Playlist info retrieved: ${items.length} items`);

      return playlist;

    } catch (error: any) {
      glog.error(`[YtDlpService] Error getting playlist info: ${error.message}`);
      throw new Error(`Failed to get playlist info: ${error.message}`);
    }
  }

  private getFormatSelector(format: string): string {
    const formatMap: { [key: string]: string } = {
      "mp3": "bestaudio[ext=m4a]/bestaudio/best",
      "mp4": "best[ext=mp4]/best",
      "m4a": "bestaudio[ext=m4a]/bestaudio",
      "flac": "bestaudio[acodec=flac]/bestaudio",
      "ogg": "bestaudio[acodec=vorbis]/bestaudio",
      "wav": "bestaudio[acodec=pcm]/bestaudio",
      "webm": "best[ext=webm]/best"
    };

    return formatMap[format] || "best";
  }

  private extractFilenameFromOutput(output: string): string {
    // yt-dlp 출력에서 다운로드된 파일명 추출
    // 예: "[download] 100% of filename.mp3"
    const match = output.match(/\[download\].*?(\S+\.\w+)$/m);
    return match ? match[1] : "";
  }
}