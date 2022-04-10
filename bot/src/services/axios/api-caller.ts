import axios, { AxiosInstance } from "axios";
import fs from "fs";
import dotenv from "dotenv";
import xml2js from "xml2js";
import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";
import AxiosModel from "../../models/axios-model";
dotenv.config();

interface ICallerOption {
  baseURL: string;
  headers?: Object;
  timeout?: number;
}

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
  private _baseUrl =
    process.env.NODE_ENV === "production"
      ? process.env.YTDL_URL
      : "http://192.168.4.73:8080";

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
      glog.error(`[Line - 34][File - api-caller.ts] Unknown URL`);
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
      glog.error(`[Line - 34][File - api-caller.ts] Unknown URL`);
      throw res.statusText;
    }

    let am = new AxiosModel();
    let filename = am.extractFilenameFromContentDisposition(
      res.headers["content-disposition"]
    );

    let channel = decodeURI(res.headers["cc-channel"]);
    let uploadDate = res.headers["cc-uploaddate"];
    let buildFileName = this.buildFilename(channel, uploadDate) + filename;
    let downloadChannelDir = isPlayList
      ? `./download/${playListTitle}/${channel}`
      : `./download/${channel}`;

    let playListDir = `./download/${playListTitle}`;

    if (isPlayList && !fs.existsSync(playListDir)) {
      fs.mkdirSync(playListDir);
    }

    if (!fs.existsSync(downloadChannelDir)) {
      fs.mkdirSync(downloadChannelDir);
    }

    let file = fs.createWriteStream(`${downloadChannelDir}/${buildFileName}`);

    let finishPromise = new Promise((resolve, _) => {
      file.on("finish", function () {
        glog.info(
          `[Line - 77][File - api-caller.ts] ${buildFileName} completed`
        );
        resolve(
          `채널명: ${channel}\n업로드 날짜: ${uploadDate}\n${buildFileName}`
        );
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
