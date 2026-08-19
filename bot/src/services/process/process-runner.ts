import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProcessResult {
  stdout: string;
  stderr: string;
}

export async function runProcess(file: string, args: readonly string[]): Promise<ProcessResult> {
  const { stdout, stderr } = await execFileAsync(file, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  return { stdout, stderr };
}
