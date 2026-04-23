export default class AxiosModel {
  extractFilenameFromContentDisposition(contentDisposition: string): string {
    let filenameRegex = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/;
    let matches = filenameRegex.exec(contentDisposition);

    let filename = "";

    if (matches != null && matches[1]) {
      filename = decodeURI(matches[1]);
      filename = filename.replace(/%[0-9A-Z][0-9A-Z]/g, "");
      filename = filename
        .replace(/[/\\?%*:|"<>,'"!@#$^&(){}[\]~`]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_|_$/g, "");
    }
    return filename;
  }
}
