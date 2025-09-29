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

interface VideoMetadata {
  channel: string;
  uploader: string;
  uploadDate: string;
  title: string;
}

interface DownloadPaths {
  outputDir: string;
  finalOutputPath: string;
  fullFilePath: string;
  fullFilename: string;
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

      // 1. 메타데이터 가져오기
      const metadata = await this.fetchMetadata(url);

      // 2. 다운로드 경로 구성
      const paths = await this.generateDownloadPaths(
        userId,
        metadata,
        format,
        isPlaylist,
        playlistTitle
      );

      glog.info(`[YtDlpService] Output will be saved to: ${paths.fullFilePath}`);

      // 3. yt-dlp 명령어 구성 및 실행
      const cmdString = this.buildYtDlpCommand(url, format, paths.fullFilePath);
      await this.executeDownload(cmdString, url);

      // 4. 파일 정보 추출
      const fileInfo = await this.extractFileInfo(
        paths.finalOutputPath,
        paths.fullFilename,
        paths.fullFilePath,
        metadata.channel || metadata.uploader,
        metadata.uploadDate
      );

      return fileInfo;

    } catch (error: any) {
      glog.error(`[YtDlpService] Error downloading ${url}: ${error.message}`);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  private async fetchMetadata(url: string): Promise<VideoMetadata> {
    const metadataCmd = `yt-dlp --print "%(channel)s|%(uploader)s|%(upload_date)s|%(title)s" --no-download "${url}"`;

    glog.info(`[YtDlpService] Getting metadata: ${metadataCmd}`);

    const { stdout: metadataOutput } = await execAsync(metadataCmd);
    const [channel, uploader, uploadDate, title] = metadataOutput.trim().split('|');

    const sanitizedChannel = this.sanitizeFilename(channel || uploader || "unknown_channel");
    const sanitizedTitle = this.sanitizeFilename(title || "unknown_title");

    glog.info(`[YtDlpService] Metadata - Channel: ${sanitizedChannel}, Title: ${sanitizedTitle}, Upload Date: ${uploadDate}`);

    return {
      channel: sanitizedChannel,
      uploader: uploader || channel || "unknown_uploader",
      uploadDate,
      title: sanitizedTitle
    };
  }

  private async generateDownloadPaths(
    userId: string,
    metadata: VideoMetadata,
    format: string,
    isPlaylist: boolean,
    playlistTitle: string
  ): Promise<DownloadPaths> {
    const botService = BotService.getInstance();

    // 파일명 구성
    let filename = metadata.title;

    if (botService.globalOptions.addChannelNameToFileName === "on") {
      filename = `${metadata.channel}_${filename}`;
    }

    if (botService.globalOptions.addUploadDateNameToFileName === "on" && metadata.uploadDate) {
      filename = `${metadata.uploadDate}_${filename}`;
    }

    // 확장자 결정
    const extension = this.isAudioFormat(format) ? this.getAudioFormat(format) : format;
    const fullFilename = `${filename}.${extension}`;

    // 출력 디렉토리 설정
    const outputDir = `/ytdlbot/download/${userId}/${metadata.channel}`;
    let finalOutputPath = outputDir;

    if (isPlaylist && playlistTitle) {
      finalOutputPath = `${outputDir}/${playlistTitle.replace(/[/\\?%*:|"<>]/g, "_")}`;
    }

    const fullFilePath = `${finalOutputPath}/${fullFilename}`;

    return {
      outputDir,
      finalOutputPath,
      fullFilePath,
      fullFilename
    };
  }

  private buildYtDlpCommand(url: string, format: string, fullFilePath: string): string {
    const cmd = [
      "yt-dlp",
      "-f", this.getFormatSelector(format),
      "-o", `"${fullFilePath}"`
    ];

    // 임베딩을 지원하는 포맷인 경우에만 메타데이터 및 썸네일 옵션 추가
    if (this.supportsEmbedding(format)) {
      cmd.push("--add-metadata");
      cmd.push("--embed-thumbnail");
    }

    cmd.push("--print", '"after_move:%(filepath)s"');

    // 오디오 전용 포맷인 경우 추가 옵션
    if (this.isAudioFormat(format)) {
      cmd.push("--extract-audio");
      cmd.push("--audio-format", this.getAudioFormat(format));
    }

    cmd.push(`"${url}"`);

    return cmd.join(" ");
  }

  private async executeDownload(cmdString: string, url: string): Promise<void> {
    glog.info(`[YtDlpService] Executing command: ${cmdString}`);

    const { stderr } = await execAsync(cmdString);

    if (stderr) {
      glog.warn(`[YtDlpService] stderr: ${stderr}`);
    }

    glog.info(`[YtDlpService] Download completed for ${url}`);
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

  private supportsEmbedding(format: string): boolean {
    // yt-dlp에서 썸네일 및 메타데이터 임베딩을 지원하는 포맷
    const supportedFormats = ["mp3", "flac", "m4a", "ogg", "mp4", "mkv", "webm"];
    return supportedFormats.includes(format);
  }

  private async extractFileInfo(outputPath: string, downloadedFile: string, fullFilePath: string, uploader: string, uploadDate: string): Promise<string> {
    try {
      if (!downloadedFile || !fullFilePath) {
        return "Download completed successfully";
      }

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