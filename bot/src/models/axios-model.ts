export default class AxiosModel {
  extractFilenameFromContentDisposition(contentDisposition: string): string {
    let filenameRegex = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/;
    let matches = filenameRegex.exec(contentDisposition);

    let filename = "";

    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, "");
      filename = decodeURI(filename);
      filename = filename.replace(/[\|]/g, "");
      filename = filename.replace(/%[0-9A-Z][0-9A-Z]/g, "");
    }
    return filename;
  }
}
