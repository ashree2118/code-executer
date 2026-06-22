import fs from "node:fs";
import { execSync } from "node:child_process";

export async function executeJavascript(
  code: string
) {
  const path =
    `temp/${Math.random().toString(36).slice(2)}.js`;

  try {
    fs.writeFileSync(path, code);

    const stdout = execSync(
      `node ${path}`,
      {
        encoding: "utf8",
        timeout: 5000,
      }
    );

    return {
      stdout,
      stderr: "",
      exitCode: 0,
    };
  } catch (err: any) {
    return {
      stdout:
        err.stdout?.toString() ?? "",
      stderr:
        err.stderr?.toString() ??
        err.message,
      exitCode:
        err.status ?? 1,
    };
  } finally {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }
}