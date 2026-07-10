import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import Docker from "dockerode";

const execAsync = promisify(exec);
export const docker = new Docker();

export const images = {
  python: "python-runner",
  javascript: "node-runner",
  java: "java-runner",
};

export async function executeJavascript(code: string) {
  const path = `temp/${Math.random().toString(36).slice(2)}.js`;

  try {
    await fs.promises.writeFile(path, code);

    // Running asynchronously so other queue items or workers aren't blocked
    const { stdout, stderr } = await execAsync(`node ${path}`, {
      timeout: 5000, // Kills the process after 5s
    });

    return {
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
    };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? err.message,
      exitCode: err.code ?? 1, // exec returns .code for exit codes
    };
  } finally {
    if (fs.existsSync(path)) {
      await fs.promises.unlink(path).catch(() => {});
    }
  }
}