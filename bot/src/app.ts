import "./env-checker";
import { glog } from "./services/logger/custom-logger";
import DbHandler from "./services/sqlite/db-handler";
import DbService from "./services/sqlite/db-service";
import BotService from "./services/telegram/bot-service";

class Starter {
  startServer = async () => {
    await DbService.getInstance()
      .createTable()
      .catch(e => glog.error(e));

    DbHandler.initAuthorizedUsers().catch(e => glog.error(e));

    BotService.getInstance().start();

    process.on("SIGINT", () => {
      process.exit(0);
    });
  };
}
new Starter().startServer();
