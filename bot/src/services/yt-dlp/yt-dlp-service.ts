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
    format: string = "mp3",
    isPlaylist: boolean = false,
    playlistTitle: string = ""
  ): Promise<string> {
    try {
      glog.info(`[YtDlpService] getContent called with parameters: userId=${userId}, url=${url}, format=${format}, isPlaylist=${isPlaylist}, playlistTitle=${playlistTitle}`);

      const botService = BotService.getInstance();

      // 1. 다운로드 전에 메타데이터 먼저 가져오기
      const metadataCmd = `yt-dlp --print "%(channel)s|%(uploader)s|%(upload_date)s|%(title)s" --no-download "${url}"`;

      glog.info(`[YtDlpService] Getting metadata: ${metadataCmd}`);

      const { stdout: metadataOutput } = await execAsync(metadataCmd);
      const [channel, uploader, uploadDate, title] = metadataOutput.trim().split('|');

      // 2. channel과 title을 sanitize
      const sanitizedChannel = this.sanitizeFilename(channel || uploader || "unknown_channel");
      const sanitizedTitle = this.sanitizeFilename(title || "unknown_title");

      glog.info(`[YtDlpService] Metadata - Channel: ${sanitizedChannel}, Title: ${sanitizedTitle}, Upload Date: ${uploadDate}`);

      // 3. 파일명 구성
      let filename = sanitizedTitle;

      if (botService.globalOptions.addChannelNameToFileName === "on") {
        filename = `${sanitizedChannel}_${filename}`;
      }

      if (botService.globalOptions.addUploadDateNameToFileName === "on" && uploadDate) {
        filename = `${uploadDate}_${filename}`;
      }

      // 확장자 결정
      const extension = this.isAudioFormat(format) ? this.getAudioFormat(format) : format;
      const fullFilename = `${filename}.${extension}`;

      // 출력 디렉토리 설정
      const outputDir = `/ytdlbot/download/${userId}/${sanitizedChannel}`;
      let finalOutputPath = outputDir;
      if (isPlaylist && playlistTitle) {
        finalOutputPath = `${outputDir}/${playlistTitle.replace(/[/\\?%*:|"<>]/g, "_")}`;
      }

      // 전체 파일 경로
      const fullFilePath = `${finalOutputPath}/${fullFilename}`;

      glog.info(`[YtDlpService] Output will be saved to: ${fullFilePath}`);

      // yt-dlp 명령어 구성
      let cmd = [
        "yt-dlp",
        "-f", this.getFormatSelector(format),
        "-o", `"${fullFilePath}"`,  // 직접 구성한 전체 경로 사용
        "--add-metadata",
        "--embed-thumbnail",
        "--print", '"after_move:%(filepath)s"'  // 로그용으로 유지
      ];

      // 오디오 전용 포맷인 경우 추가 옵션
      if (this.isAudioFormat(format)) {
        cmd.push("--extract-audio");
        cmd.push("--audio-format", this.getAudioFormat(format));
      }

      cmd.push(`"${url}"`);

      const cmdString = cmd.join(" ");

      glog.info(`[YtDlpService] Executing command: ${cmdString}`);

      const { stdout, stderr } = await execAsync(cmdString);

      if (stderr) {
        glog.warn(`[YtDlpService] stderr: ${stderr}`);
      }

      glog.info(`[YtDlpService] Download completed for ${url}`);

      // 이미 알고 있는 파일 정보 사용
      const downloadedFile = fullFilename;
      const actualFilePath = fullFilePath;

      // 파일 정보 추출 (직접 구성한 값 전달)
      const fileInfo = await this.extractFileInfo(url, finalOutputPath, downloadedFile, actualFilePath);

      return fileInfo;

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
      "mp3": "bestaudio/best",          // 오디오 추출 후 mp3로 변환
      "mp4": "best[ext=mp4]/best",
      "m4a": "bestaudio/best",          // 오디오 추출 후 m4a로 변환
      "flac": "bestaudio/best",         // 오디오 추출 후 flac으로 변환
      "ogg": "bestaudio/best",          // 오디오 추출 후 vorbis로 변환 (ogg 컨테이너)
      "wav": "bestaudio/best",          // 오디오 추출 후 wav로 변환
      "webm": "best[ext=webm]/best"
    };

    return formatMap[format] || "best";
  }

  private isAudioFormat(format: string): boolean {
    const audioFormats = ["mp3", "m4a", "flac", "ogg", "wav"];
    return audioFormats.includes(format);
  }

  private getAudioFormat(format: string): string {
    // yt-dlp --audio-format에서 지원하는 포맷으로 매핑
    const audioFormatMap: { [key: string]: string } = {
      "mp3": "mp3",
      "m4a": "m4a",
      "flac": "flac",
      "ogg": "vorbis",    // ogg -> vorbis 변환
      "wav": "wav"
    };

    return audioFormatMap[format] || format;
  }

  private async extractFileInfo(url: string, outputPath: string, downloadedFile: string, fullFilePath: string): Promise<string> {
    try {
      if (!downloadedFile || !fullFilePath) {
        return "Download completed successfully";
      }

      // 메타데이터는 이미 getContent에서 가져왔으므로 다시 가져올 필요 없음
      // 하지만 결과 포맷팅을 위해 다시 가져오기 (나중에 최적화 가능)
      const metadataCmd = `yt-dlp --print "%(uploader)s|%(upload_date)s" --no-download "${url}"`;

      glog.info(`[YtDlpService] Getting additional metadata for result: ${metadataCmd}`);

      const { stdout: metadataOutput } = await execAsync(metadataCmd);
      const [uploader, uploadDate] = metadataOutput.trim().split('|');

      // 파일 크기 가져오기
      let fileSize = "Unknown";
      try {
        const fileSizeCmd = `du -h "${fullFilePath}" | cut -f1`;
        const { stdout: sizeOutput } = await execAsync(fileSizeCmd);
        fileSize = sizeOutput.trim();
        glog.info(`[YtDlpService] File size: ${fileSize} for ${fullFilePath}`);
      } catch (sizeError) {
        glog.warn(`[YtDlpService] Failed to get file size for ${fullFilePath}: ${sizeError}`);
      }

      // 결과 문자열 구성
      const result = `채널명: ${uploader || "Unknown"}
업로드 날짜: ${uploadDate || "Unknown"}
FileSize: ${fileSize}
OutputPath: ${outputPath}

${downloadedFile}`;

      return result;

    } catch (error: any) {
      glog.error(`[YtDlpService] Error extracting file info: ${error.message}`);
      return "Download completed successfully";
    }
  }

  private async getChannelInfo(url: string): Promise<string | null> {
    try {
      // yt-dlp를 사용해 채널명 가져오기
      const cmd = `yt-dlp --print "%(uploader)s" --no-download "${url}"`;

      glog.info(`[YtDlpService] Getting channel info: ${cmd}`);

      const { stdout } = await execAsync(cmd);
      const channelName = stdout.trim();

      return channelName || null;
    } catch (error: any) {
      glog.warn(`[YtDlpService] Failed to get channel info: ${error.message}`);
      return null;
    }
  }

  private sanitizeFilename(filename: string): string {
    // 파일/폴더명에 사용할 수 없는 문자들을 제거하거나 대체
    return filename
      .replace(/[/\\?%*:|"<>,]/g, "_")  // 특수문자(콤마 포함)를 언더스코어로 대체
      .replace(/\s+/g, "_")             // 공백을 언더스코어로 대체
      .replace(/_{2,}/g, "_")           // 연속된 언더스코어를 하나로 합침
      .replace(/^_|_$/g, "")            // 앞뒤 언더스코어 제거
      .toLowerCase();                   // 소문자로 변환
  }
}