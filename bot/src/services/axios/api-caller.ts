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

  async getContent(url: string, type: string = "mp3") {
    let res = await this._axiosCaller.get("/", {
      responseType: "stream",
      params: { format: type, url }
    });
    if (res.status !== 200) {
      glog.error(`[Line - 34][File - api-caller.ts] Unknown URL`);
      throw res.statusText;
    }
    let filename = "";

    let filenameRegex = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/;
    let matches = filenameRegex.exec(res.headers["content-disposition"]);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
      filename = decodeURI(filename);
      filename = filename.replace(/[\|]|%2C/g, "_");
    }

    let buildFileName = "";
    let channel = decodeURI(res.headers["cc-channel"]);
    let uploadDate = res.headers["cc-uploaddate"];

    let downloadChannelDir = `./download/${channel}`;

    if (BotService.addChannelToFileName) {
      buildFileName += `${channel}_`;
    }

    if (BotService.addUploadDateToFileName) {
      buildFileName += `${uploadDate}_`;
    }

    buildFileName += filename;
    if (!fs.existsSync(downloadChannelDir)) {
      fs.mkdirSync(downloadChannelDir);
    }
    let file = fs.createWriteStream(`${downloadChannelDir}/${buildFileName}`);

    // Promise.race()
    let finishPromise = new Promise((resolve, _) => {
      file.on("finish", function () {
        glog.info(
          `[Line - 77][File - api-caller.ts] ${buildFileName} completed`
        );
        resolve(buildFileName);
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
