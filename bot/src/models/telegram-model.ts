import { IYtdlGlobalOption } from "../services/sqlite/db-handler";

export default class TelegramModel {
  arrayToObj(options: Array<IYtdlGlobalOption>) {
    let optionObj = {};
    for (let option of options) {
      optionObj = {
        ...optionObj,
        [option.option_key]: option.option_value
      };
    }
    return optionObj;
  }
}
