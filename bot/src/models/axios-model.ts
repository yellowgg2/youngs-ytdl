import { sanitizePathSegment } from "../utils/filename-utils";

export default class AxiosModel {
  extractFilenameFromContentDisposition(contentDisposition: string): string {
    let filenameRegex = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/;
    let matches = filenameRegex.exec(contentDisposition);

    let filename = "";

    if (matches != null && matches[1]) {
      filename = decodeURI(matches[1]);
      filename = filename.replace(/%[0-9A-Z][0-9A-Z]/g, "");
      filename = sanitizePathSegment(filename, "download");
    }
    return filename;
  }
}
