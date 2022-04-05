import axios, { AxiosInstance } from "axios";
import fs from "fs";
import dotenv from "dotenv";
import { glog } from "../logger/custom-logger";
import BotService from "../telegram/bot-service";
dotenv.config();

interface ICallerOption {
  baseURL: string;
  headers?: Object;
  timeout?: number;
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

  getContent(url: string, type: string = "mp3") {
    return this._axiosCaller
      .get("/", { responseType: "stream", params: { format: type, url } })
      .then(async res => {
        if (res.status !== 200) {
          glog.error(`[Line - 34][File - api-caller.ts] Unknown URL`);
          throw res.statusText;
        }
        let filename = "";

        let filenameRegex =
          /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/;
        let matches = filenameRegex.exec(res.headers["content-disposition"]);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
          filename = decodeURI(filename);
        }

        let buildFileName = "";

        if (BotService.addChannelToFileName) {
          buildFileName += `${decodeURI(res.headers["cc-channel"])}_`;
        }

        if (BotService.addUploadDateToFileName) {
          buildFileName += `${res.headers["cc-uploaddate"]}_`;
        }

        buildFileName += filename;
        try {
          let file = fs.createWriteStream(`./download/${buildFileName}`);
          res.data.pipe(file);
        } catch (error) {
          glog.error(`[Line - 44][File - api-caller.ts] %o`, error);
          throw error;
        }
        return `${buildFileName}`;
      });
  }
}
