import DbService from "./db-service";

interface IYtdlUsers {
  username: string;
  first_name: string;
  type: string;
}

export default class DbHandler {
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
      process.env.ADMIN_DESC ?? "관리자",
      "admin"
    );
  }
}
