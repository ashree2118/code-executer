import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Docker from "dockerode";

const docker = new Docker();

type Language = "javascript" | "python" | "java";

const runtimeConfig: Record<
  Language,
  {
    image: string;
    filename: string;
    command: string[];
  }
> = {
  javascript: {
    image: "node-runner",
    filename: "main.js",
    command: ["node", "/app/main.js"],
  },

  python: {
    image: "python-runner",
    filename: "main.py",
    command: ["python3", "/app/main.py"],
  },

  java: {
    image: "java-runner",
    filename: "Main.java",
    command: ["java", "Main"],
  },
};

export async function executeCode(
  language: Language,
  code: string
) {
  const config = runtimeConfig[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create unique temp directory
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "submission-")
  );

  const sourceFile = path.join(tempDir, config.filename);

  await fs.promises.writeFile(sourceFile, code);

  let container: Docker.Container | null = null;

  try {
    container = await docker.createContainer({
      Image: config.image,

      Cmd: config.command,

      WorkingDir: "/app",

      HostConfig: {
        Binds: [`${tempDir}:/app`],
      },
    });

    await container.start();

    const result = await container.wait();

    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    return {
      stdout: logs.toString(),
      stderr: "",
      exitCode: result.StatusCode ?? 0,
    };
  } catch (err: any) {
    return {
      stdout: "",
      stderr: err.message,
      exitCode: 1,
    };
  } finally {
    if (container) {
      await container.remove({
        force: true,
      }).catch(() => {});
    }

    await fs.promises.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}