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

      // 채널 정보 가져오기
      const channelInfo = await this.getChannelInfo(url);
      const channelName = channelInfo ? this.sanitizeFilename(channelInfo) : "unknown_channel";

      const outputDir = `/ytdlbot/download/${userId}/${channelName}`;

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
      let cmd = [
        "yt-dlp",
        "-f", this.getFormatSelector(format),
        "-o", `"${outputTemplate}"`,
        "--add-metadata",
        "--embed-thumbnail",
        "--print", '"after_move:%(filepath)s"'  // 다운로드 완료 후 실제 파일 경로 출력
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

      // 다운로드된 파일명 추출 (새로운 방법)
      const downloadedFile = await this.extractFilenameFromOutput(stdout, finalOutputPath);

      // 다운로드된 파일 정보 추출 (--print 옵션으로 얻은 전체 경로 전달)
      const fullFilePath = this.extractFullPathFromOutput(stdout, finalOutputPath);
      const fileInfo = await this.extractFileInfo(url, finalOutputPath, downloadedFile, fullFilePath);

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

  private extractFullPathFromOutput(output: string, outputPath: string): string {
    // --print 옵션으로 출력된 전체 파일 경로 찾기
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // 절대 경로이고 출력 디렉토리 내의 파일인지 확인
      if (trimmedLine.startsWith('/') && trimmedLine.includes(outputPath)) {
        glog.info(`[YtDlpService] Found full file path: ${trimmedLine}`);
        return trimmedLine;
      }
    }
    return "";
  }

  private async extractFilenameFromOutput(output: string, outputPath: string): Promise<string> {
    // 방법 1: --print 옵션으로 출력된 파일 경로 확인
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      // 절대 경로이고 출력 디렉토리 내의 파일인지 확인
      if (trimmedLine.startsWith('/') && trimmedLine.includes(outputPath)) {
        const filename = trimmedLine.split('/').pop();
        if (filename) {
          glog.info(`[YtDlpService] Found filename from --print output: ${filename}`);
          return filename;
        }
      }
    }

    // 방법 2: 기존 패턴 매칭 시도
    const patterns = [
      /\[download\].*?100%.*?of\s+(.+?)(?:\s+in|\s+at|\s*$)/m,  // [download] 100% of filename
      /\[Merger\].*?Merging formats into\s+"([^"]+)"/m,         // [Merger] 출력
      /\[ExtractAudio\].*?Destination:\s*(.+)/m,               // [ExtractAudio] 출력
      /^\s*(.+\.\w+)\s*$/m                                      // 단순 파일명
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        const filename = match[1].trim().split('/').pop() || match[1].trim();
        glog.info(`[YtDlpService] Found filename from pattern matching: ${filename}`);
        return filename;
      }
    }

    // 방법 3: 출력 디렉토리에서 가장 최근 파일 찾기
    try {
      const findCmd = `find "${outputPath}" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-`;
      const { stdout: latestFile } = await execAsync(findCmd);
      if (latestFile.trim()) {
        const filename = latestFile.trim().split('/').pop();
        if (filename) {
          glog.info(`[YtDlpService] Found filename from latest file search: ${filename}`);
          return filename;
        }
      }
    } catch (error) {
      glog.warn(`[YtDlpService] Failed to find latest file: ${error}`);
    }

    glog.warn(`[YtDlpService] Could not extract filename from any method. Output: ${output.substring(0, 200)}...`);
    return "";
  }

  private async extractFileInfo(url: string, outputPath: string, downloadedFile: string, fullFilePath?: string): Promise<string> {
    try {
      if (!downloadedFile) {
        return "Download completed successfully";
      }

      // 비디오 메타데이터 가져오기
      const metadataCmd = `yt-dlp --print "%(uploader)s|%(upload_date)s|%(title)s" --no-download "${url}"`;

      glog.info(`[YtDlpService] Getting metadata: ${metadataCmd}`);

      const { stdout: metadataOutput } = await execAsync(metadataCmd);
      const [uploader, uploadDate, title] = metadataOutput.trim().split('|');


      // 파일 크기 가져오기 (우선 fullFilePath 사용, 없으면 기존 방식)
      let fileSize = "Unknown";
      let actualFilePath = fullFilePath || "";
      let actualFileName = downloadedFile;

      if (fullFilePath) {
        // --print 옵션으로 얻은 전체 경로 사용
        actualFilePath = fullFilePath;
        actualFileName = fullFilePath.split('/').pop() || downloadedFile;
        glog.info(`[YtDlpService] Using full file path from --print: ${actualFilePath}`);
      } 

      // 파일 크기 가져오기
      if (actualFilePath) {
        try {
          const fileSizeCmd = `du -h "${actualFilePath}" | cut -f1`;
          const { stdout: sizeOutput } = await execAsync(fileSizeCmd);
          fileSize = sizeOutput.trim();
          glog.info(`[YtDlpService] File size: ${fileSize} for ${actualFilePath}`);
        } catch (sizeError) {
          glog.warn(`[YtDlpService] Failed to get file size for ${actualFilePath}: ${sizeError}`);
        }
      }

      // 업로드 날짜 포맷팅 (YYYYMMDD)
      const formattedDate = uploadDate || "Unknown";

      // 결과 문자열 구성
      const result = `채널명: ${uploader || "Unknown"}
업로드 날짜: ${formattedDate}
FileSize: ${fileSize}
OutputPath: ${outputPath}

${actualFileName}`;

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
      .replace(/[/\\?%*:|"<>]/g, "_")  // 특수문자를 언더스코어로 대체
      .replace(/\s+/g, "_")            // 공백을 언더스코어로 대체
      .replace(/_{2,}/g, "_")          // 연속된 언더스코어를 하나로 합침
      .replace(/^_|_$/g, "")           // 앞뒤 언더스코어 제거
      .toLowerCase();                  // 소문자로 변환
  }
}