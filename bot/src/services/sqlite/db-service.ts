import sqlite3 from "sqlite3";
import { glog } from "../logger/custom-logger";

export default class DbService {
  private static instance: DbService;
  private dbInstance?: sqlite3.Database;
  private _dbFilename = "./db/ytdl-bot.db";

  private constructor() {
    this.open();
  }

  static getInstance() {
    if (!DbService.instance) {
      DbService.instance = new DbService();
    }

    return DbService.instance;
  }

  private async createUserTable() {
    let userTable = `
    CREATE TABLE IF NOT EXISTS ytdl_users (
      username TEXT PRIMARY KEY,
      first_name TEXT,
      type TEXT
      )
  `;

    await this.writeQuery(userTable);
  }

  private async createUserFileTypeTable() {
    let fileTypeTable = `
    CREATE TABLE IF NOT EXISTS ytdl_filetype (
      username TEXT,
      filetype TEXT,
      PRIMARY KEY (username, filetype)
      )
  `;

    await this.writeQuery(fileTypeTable);
  }

  private async createOptionsTable() {
    let optionTable = `
    CREATE TABLE IF NOT EXISTS ytdl_option (
        option_key TEXT PRIMARY KEY,
        option_value TEXT,
      )
  `;

    await this.writeQuery(optionTable);
  }

  async createTable() {
    return Promise.all([
      this.createUserTable(),
      this.createUserFileTypeTable(),
      this.createOptionsTable()
    ]);
  }

  private open() {
    this.dbInstance = new sqlite3.Database(this._dbFilename, err => {
      if (err) {
        glog.error(`[Line - 9][File - DbService.ts] ${err}`);
      }
    });
  }

  close() {
    if (this.dbInstance) {
      this.dbInstance.close();
    }
    this.dbInstance = undefined;
  }

  writeQuery(sql: string, params: Array<any> = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.dbInstance?.run(sql, params, (err: Error | null) => {
        if (err) {
          reject(err.message);
        }
        resolve("success");
      });
    });
  }

  selectQuery(sql: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.dbInstance?.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        }
        resolve(rows);
      });
    });
  }
}
