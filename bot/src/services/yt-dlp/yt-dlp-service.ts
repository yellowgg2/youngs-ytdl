import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";
import { runProcess } from "../process/process-runner";
import { sanitizePathSegment } from "../../utils/filename-utils";

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
      const args = this.buildYtDlpArgs(url, format, paths.fullFilePath);
      await this.executeDownload(args, url);

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
    const separator = "<<<SEP>>>";
    const metadataArgs = [
      "--print",
      `%(channel)s${separator}%(uploader)s${separator}%(upload_date)s${separator}%(title)s`,
      "--no-download",
      "--no-playlist",
      url
    ];

    glog.info(`[YtDlpService] Getting metadata with args: ${JSON.stringify(metadataArgs)}`);

    const { stdout: metadataOutput } = await runProcess("yt-dlp", metadataArgs);
    const [channel, uploader, uploadDate, ...titleParts] = metadataOutput.trim().split(separator);
    const title = titleParts.join(separator);

    const sanitizedChannel = sanitizePathSegment(channel || uploader || "unknown_channel", "unknown_channel");
    const sanitizedTitle = sanitizePathSegment(title || "unknown_title", "unknown_title");

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
      filename = `${metadata.channel} - ${filename}`;
    }

    if (botService.globalOptions.addUploadDateNameToFileName === "on" && metadata.uploadDate) {
      filename = `${metadata.uploadDate} - ${filename}`;
    }

    // 확장자 결정
    const extension = this.isAudioFormat(format) ? this.getAudioFormat(format) : format;
    const fullFilename = `${filename}.${extension}`;

    // 출력 디렉토리 설정
    const outputDir = `/ytdlbot/download/${userId}/${metadata.channel}`;
    let finalOutputPath = outputDir;

    if (isPlaylist && playlistTitle) {
      finalOutputPath = `${outputDir}/${sanitizePathSegment(playlistTitle, "unknown_playlist")}`;
    }

    const fullFilePath = `${finalOutputPath}/${fullFilename}`;

    return {
      outputDir,
      finalOutputPath,
      fullFilePath,
      fullFilename
    };
  }

  private buildYtDlpArgs(url: string, format: string, fullFilePath: string): string[] {
    const args = [
      "-f", this.getFormatSelector(format),
      "-o", fullFilePath,
      "--no-playlist"
    ];

    // 임베딩을 지원하는 포맷인 경우에만 메타데이터 및 썸네일 옵션 추가
    if (this.supportsEmbedding(format)) {
      args.push("--add-metadata");
      args.push("--embed-thumbnail");
    }

    args.push("--print", "after_move:%(filepath)s");

    // 오디오 전용 포맷인 경우 추가 옵션
    if (this.isAudioFormat(format)) {
      args.push("--extract-audio");
      args.push("--audio-format", this.getAudioFormat(format));
    }

    args.push(url);

    return args;
  }

  private async executeDownload(args: string[], url: string): Promise<void> {
    glog.info(`[YtDlpService] Executing yt-dlp with args: ${JSON.stringify(args)}`);

    const { stderr } = await runProcess("yt-dlp", args);

    if (stderr) {
      glog.warn(`[YtDlpService] stderr: ${stderr}`);
    }

    glog.info(`[YtDlpService] Download completed for ${url}`);
  }

  async getRssContentFromPlaylist(playlistUrl: string): Promise<IPlayList> {
    try {
      // 플레이리스트 정보를 JSON 형태로 가져오기
      const args = ["--dump-json", "--flat-playlist", playlistUrl];

      glog.info(`[YtDlpService] Getting playlist info with args: ${JSON.stringify(args)}`);

      const { stdout } = await runProcess("yt-dlp", args);

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
        const { stdout: sizeOutput } = await runProcess("du", ["-h", fullFilePath]);
        fileSize = sizeOutput.trim().split(/\s+/)[0];
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

}
