import { LF } from "../../language/language-factory";
import DbService from "./db-service";

interface IYtdlUsers {
  username: string;
  first_name: string;
  type: string;
}

interface IYtdlFileType {
  username: string;
  filetype: string;
}

export interface IYtdlGlobalOption {
  option_key: string;
  option_value: string;
}

export interface IYtdlGlobalOptionToObj {
  addUploadDateNameToFileName?: string;
  addChannelNameToFileName?: string;
}

export default class DbHandler {
  static async upsertOptions(key: string, value: string) {
    await DbService.getInstance().writeQuery(
      `INSERT INTO ytdl_option(option_key, option_value) 
      VALUES('${key}', '${value}') 
      ON CONFLICT(option_key) DO UPDATE SET option_value = '${value}';`
    );
  }

  static async getGlobalOptions(): Promise<Array<IYtdlGlobalOption>> {
    let result: Array<IYtdlGlobalOption> =
      await DbService.getInstance().selectQuery(
        `SELECT option_key, option_value FROM ytdl_option;`
      );

    return result;
  }

  static async insertNewUser(
    username: string,
    firstName: string,
    type: string = "user"
  ): Promise<void> {
    if (!(await DbHandler.isExistingUsername(username))) {
      await DbService.getInstance().writeQuery(
        "INSERT INTO ytdl_users(username, first_name, type) VALUES (?, ?, ?)",
        [username, firstName, type]
      );
    }
  }

  static async updateUser(
    username: string,
    firstName: string,
    type: string = "user"
  ): Promise<void> {
    if (await DbHandler.isExistingUsername(username)) {
      await DbService.getInstance().writeQuery(
        `UPDATE ytdl_users SET first_name='${firstName}',type='${type}' WHERE username='${username}'`
      );
    } else {
      throw "Nothing to update";
    }
  }

  static async deleteUser(username: string): Promise<void> {
    await DbService.getInstance().writeQuery(
      `DELETE FROM ytdl_users where username = '${username}'`
    );
  }

  static async deleteAllUser(): Promise<void> {
    await DbService.getInstance().writeQuery(`DELETE FROM ytdl_users`);
  }

  static async isExistingUsername(username: string): Promise<boolean> {
    let result: Array<IYtdlUsers> = await DbService.getInstance().selectQuery(
      `SELECT * FROM ytdl_users WHERE username = '${username}'`
    );

    return result.length !== 0;
  }

  static async isExistingFileTypeForUser(
    username: string,
    type: string
  ): Promise<boolean> {
    let result: Array<any> = await DbService.getInstance().selectQuery(
      `SELECT * FROM ytdl_filetype WHERE username = '${username}' and filetype = '${type}'`
    );

    return result.length !== 0;
  }

  static async getAllFileTypeForUser(
    username: string
  ): Promise<Array<IYtdlFileType>> {
    let result: Array<IYtdlFileType> =
      await DbService.getInstance().selectQuery(
        `SELECT * FROM ytdl_filetype WHERE username = '${username}'`
      );

    return result;
  }

  static async addOrDeleteFileType(
    username: string,
    type: string
  ): Promise<string> {
    if (!(await DbHandler.isExistingFileTypeForUser(username, type))) {
      await DbService.getInstance().writeQuery(
        "INSERT INTO ytdl_filetype(username, filetype) VALUES (?, ?)",
        [username, type]
      );
      return LF.str.successfullyAddType(type);
    } else {
      await DbService.getInstance().writeQuery(
        `DELETE FROM ytdl_filetype where username = '${username}' AND filetype = '${type}'`
      );
      return LF.str.successfullyDelType(type);
    }
  }

  static async deleteAllFileType(username: string): Promise<string> {
    await DbService.getInstance().writeQuery(
      `DELETE FROM ytdl_filetype where username = '${username}'`
    );
    return LF.str.successfullyDeleteAllTypes;
  }

  static async isAdminUser(username: string): Promise<boolean> {
    let result: Array<IYtdlUsers> = await DbService.getInstance().selectQuery(
      `SELECT * FROM ytdl_users WHERE username = '${username}' AND type='admin'`
    );

    return result.length !== 0;
  }

  static async getAllUsers(): Promise<Array<IYtdlUsers>> {
    let result: Array<IYtdlUsers> = await DbService.getInstance().selectQuery(
      `SELECT * FROM ytdl_users`
    );
    return result;
  }

  static async initAuthorizedUsers(): Promise<void> {
    // await DbHandler.deleteAllUser();
    await DbHandler.insertNewUser(
      process.env.ADMIN_USERNAME ?? "admin",
      process.env.ADMIN_DESC ?? "admin",
      "admin"
    );
  }
}
