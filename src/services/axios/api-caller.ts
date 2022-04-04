import axios, { AxiosInstance } from "axios";
import fs from "fs";
import dotenv from "dotenv";
import { glog } from "../logger/custom-logger";
dotenv.config();

interface ICallerOption {
  baseURL: string;
  headers?: Object;
  timeout?: number;
}

export default class ApiCaller {
  private _axiosCaller: AxiosInstance;
  private static instance: ApiCaller;

  private constructor() {
    this._axiosCaller = axios.create({ baseURL: process.env.YTDL_URL });
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

        let filenameRegex = /filename=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(res.headers["content-disposition"]);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }

        try {
          let file = fs.createWriteStream(`./download/${filename}`);
          res.data.pipe(file);
        } catch (error) {
          glog.error(`[Line - 44][File - api-caller.ts] %o`, error);
          throw error;
        }
        return `${filename}`;
      });
  }
}
