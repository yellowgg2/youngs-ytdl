import axios, { AxiosInstance } from "axios";
import { Blob } from "buffer";
import fs from "fs";
import dotenv from "dotenv";
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
    this._axiosCaller
      .get("/", { responseType: "stream", params: { format: type, url } })
      .then(async res => {
        let filename = "";

        let filenameRegex = /filename=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(res.headers["content-disposition"]);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
        // const blob = new Blob([res.data], {
        //   type: "audio/mpeg"
        // });
        // const buffer = Buffer.from(await blob.arrayBuffer());
        // fs.writeFile("aaa.mp3", buffer, () => console.log("video saved!"));

        var file = fs.createWriteStream(filename);
        res.data.pipe(file);
        console.log(`${filename} downloaded`);
      });
  }
}
