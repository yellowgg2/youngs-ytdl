import { glog } from "./services/logger/custom-logger";

require("custom-env").env();

if (process.env.NODE_ENV !== "production") {
  require("custom-env").env("dev");
}

function checkEnvs() {
  if (process.env.BOT_API_TOKEN && process.env.YTDL_URL) {
    glog.info(
      `🎁 Run in [${process.env.NODE_ENV}] mode. YTDL URL [${process.env.YTDL_URL}]`
    );
    return;
  }

  glog.error("There are missing env variable. check the .env file");
  glog.info(`=============== ${process.env.NODE_ENV}`);
  glog.info(`🧨 Bot Token: ${process.env.BOT_API_TOKEN}`);
  glog.info(`🧨 YTDL url: ${process.env.YTDL_URL}`);
  glog.info("===============");
  process.exit(1);
}

checkEnvs();
