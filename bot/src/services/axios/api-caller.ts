import axios, { AxiosInstance } from "axios";
import fs from "fs";
import xml2js from "xml2js";
import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";
import AxiosModel from "../../models/axios-model";
import { LF } from "../../language/language-factory";

export interface IPlayList {
  title: string;
  items: Array<IPlayListItem>;
}

export interface IPlayListItem {
  title: string;
  link: string;
}

export default class ApiCaller {
  private _axiosCaller: AxiosInstance;
  private static instance: ApiCaller;
  private _baseUrl = process.env.YTDL_URL!;

  private constructor() {
    this._axiosCaller = axios.create({ baseURL: this._baseUrl });
  }

  static getInstance() {
    if (!ApiCaller.instance) {
      ApiCaller.instance = new ApiCaller();
    }

    return ApiCaller.instance;
  }

  buildFilename(channel: string, uploadDate: string): string {
    let buildFileName = "";

    if (
      BotService.getInstance().globalOptions.addChannelNameToFileName === "on"
    ) {
      buildFileName += `${channel}_`;
    }

    if (
      BotService.getInstance().globalOptions.addUploadDateNameToFileName ===
      "on"
    ) {
      buildFileName += `${uploadDate}_`;
    }

    return buildFileName;
  }

  async getRssContentFromPlaylist(url: string): Promise<IPlayList> {
    let res = await this._axiosCaller.get("/", {
      //   responseType: "stream",
      params: { format: "rss", url }
    });
    if (res.status !== 200) {
      glog.error(`[Line - 34][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }
    return new Promise((resolve, reject) => {
      xml2js.parseString(res.data, (err, result) => {
        if (err) {
          return reject(err);
        }
        let title = result.rss.channel[0]?.title?.[0];
        let items = result.rss.channel[0]?.item;

        if (title && items.length > 0) {
          return resolve({
            title,
            items
          });
        }
        reject("No items for the Playlist");
      });
    });
  }

  async getContent(
    userId: string,
    url: string,
    type: string = "mp3",
    isPlayList = false,
    playListTitle = ""
  ) {
    let res = await this._axiosCaller.get("/", {
      responseType: "stream",
      params: { format: type, url }
    });
    if (res.status !== 200) {
      glog.error(`[Line - 34][File - api-caller.ts] ${res.statusText}`);
      throw res.statusText;
    }

    let am = new AxiosModel();
    const containingHostName = new URL(url);

    let filename = am.extractFilenameFromContentDisposition(
      res.headers["content-disposition"]
    );

    let headOfFile = filename.split(`.${type}`);
    if (headOfFile[0].length > 90) {
      filename = headOfFile[0].substring(0, 80) + `-toolong.${type}`;
    }

    let channel = decodeURI(res.headers["cc-channel"]);

    if (channel.length === 0) {
      channel = containingHostName.hostname;
    }

    let uploadDate = res.headers["cc-uploaddate"];
    let buildFileName = this.buildFilename(channel, uploadDate) + filename;
    let downloadChannelDir = isPlayList
      ? `./download/${userId}/${playListTitle}/${channel}`
      : `./download/${userId}/${channel}`;

    let playListDir = `./download/${userId}/${playListTitle}`;

    if (isPlayList && !fs.existsSync(playListDir)) {
      fs.mkdirSync(playListDir, { recursive: true });
    }

    if (!fs.existsSync(downloadChannelDir)) {
      fs.mkdirSync(downloadChannelDir, { recursive: true });
    }

    let file = fs.createWriteStream(`${downloadChannelDir}/${buildFileName}`);

    let finishPromise = new Promise((resolve, reject) => {
      file.on("finish", function () {
        glog.info(
          `[Line - 77][File - api-caller.ts] ${buildFileName} completed`
        );
        fs.stat(`${downloadChannelDir}/${buildFileName}`, (err, stats) => {
          if (err) {
            reject(err.message);
          } else {
            resolve(
              `${LF.str.channelName}${channel}\n${
                LF.str.uploadDate
              }${uploadDate}\nFileSize: ${(stats.size / 1024 / 1024).toFixed(
                1
              )} MB\n\n${buildFileName}`
            );
          }
        });
      });
    });
    let errorPromise = new Promise((_, reject) => {
      file.on("error", function (err) {
        glog.error(`[Line - 84][File - api-caller.ts] %o`, err.message);
        reject(err.message);
      });
    });

    res.data.pipe(file);

    return await Promise.race([finishPromise, errorPromise]);
  }
}
