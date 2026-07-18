import Docker from "dockerode";
import { PassThrough } from "stream";
import type { RuntimeConfig } from "../language-config.js";

export const docker = new Docker();

export async function createContainer({
  config,
  tempDir,
}: {
  config: RuntimeConfig;
  tempDir: string;
}): Promise<Docker.Container> {
  return docker.createContainer({
    Image: config.image,
    Cmd: config.command,
    WorkingDir: "/app",
    User: "runner",
    HostConfig: {
      Binds: [`${tempDir}:/app`],
      Memory: 128 * 1024 * 1024,
      NanoCpus: 500000000,
      NetworkMode: "none",
      ReadonlyRootfs: true,
      AutoRemove: true,
    },
  });
}

export async function startContainer(container: Docker.Container) {
  await container.start();
}

export async function attachStreams(container: Docker.Container) {
  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
  });

  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();

  docker.modem.demuxStream(stream, stdoutStream, stderrStream);

  return {
    stream,
    stdoutStream,
    stderrStream,
  };
}

export async function waitForContainer(container: Docker.Container) {
  const result = await container.wait();
  return result.StatusCode ?? 0;
}

export async function killContainer(container: Docker.Container | null) {
  if (!container) {
    return;
  }

  await container.kill().catch(() => {});
}

export async function removeContainer(container: Docker.Container | null) {
  if (!container) {
    return;
  }

  await container.remove({ force: true }).catch(() => {});
}