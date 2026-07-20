import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type Docker from "dockerode";
import { languageConfig, type Language } from "../language-config.js";
import {
  attachStreams,
  createContainer,
  killContainer,
  removeContainer,
  startContainer,
  waitForContainer,
} from "./docker-service.js";
import {
  Verdict,
  type ExecutionResult,
  type SubmissionEvaluationResult,
  type TestCase,
} from "../types/execution.js";

const EXECUTION_TIMEOUT_MS = 5_000;

async function collectOutput(
  container: Docker.Container,
  stdin = ""
): Promise<{ stdout: string; stderr: string }> {
  const { stream, stdoutStream, stderrStream } = await attachStreams(container);

  let stdout = "";
  let stderr = "";

  stdoutStream.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  stderrStream.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({ stdout, stderr });
    });

    try {
      if (stdin.length > 0) {
        stream.write(stdin);
      }

      stream.end();
    } catch (error) {
      reject(error);
    }
  });
}

function determineVerdict(
  exitCode: number,
  stderr: string,
  timedOut = false
): Verdict {
  if (timedOut) {
    return Verdict.TimeLimitExceeded;
  }

  if (exitCode === 137) {
    return Verdict.MemoryLimitExceeded;
  }

  if (exitCode !== 0) {
    const normalized = stderr.toLowerCase();

    if (
      normalized.includes("error") ||
      normalized.includes("failed") ||
      normalized.includes("exception")
    ) {
      return Verdict.CompilationError;
    }

    return Verdict.RuntimeError;
  }

  return Verdict.Accepted;
}

export async function executeCode(
  language: Language,
  code: string,
  stdin = ""
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const config = languageConfig[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "submission-")
  );

  const sourceFile = path.join(tempDir, config.filename);
  let container: Docker.Container | null = null;

  try {
    await fs.promises.writeFile(sourceFile, code);

    container = await createContainer({
      config,
      tempDir,
    });

    await startContainer(container);

    const outputPromise = collectOutput(container, stdin);
    const waitPromise = waitForContainer(container);
    const timeoutPromise = new Promise<number>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), EXECUTION_TIMEOUT_MS);
    });

    const exitCode = await Promise.race([waitPromise, timeoutPromise]);
    const logs = await outputPromise;

    return {
      stdout: logs.stdout,
      stderr: logs.stderr,
      exitCode,
      executionTime: Date.now() - startedAt,
      verdict: determineVerdict(exitCode, logs.stderr),
    };
  } catch (error: any) {
    if (error.message === "TIMEOUT") {
      await killContainer(container);

      return {
        stdout: "",
        stderr: Verdict.TimeLimitExceeded,
        exitCode: 124,
        executionTime: Date.now() - startedAt,
        verdict: Verdict.TimeLimitExceeded,
      };
    }

    return {
      stdout: "",
      stderr: error.message,
      exitCode: 1,
      executionTime: Date.now() - startedAt,
      verdict: Verdict.RuntimeError,
    };
  } finally {
    await removeContainer(container);

    await fs.promises.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function evaluateSubmission({
  language,
  code,
  stdin = "",
  testCases,
}: {
  language: Language;
  code: string;
  stdin?: string;
  testCases: TestCase[];
}): Promise<SubmissionEvaluationResult> {
  if (testCases.length === 0) {
    const result = await executeCode(language, code, stdin);
    return {
      verdict: result.verdict ?? Verdict.Accepted,
      results: [result],
      passedTestCases: 1,
      totalTestCases: 1,
    };
  }

  const results: ExecutionResult[] = [];
  let passedTestCases = 0;

  for (const testCase of testCases) {
    const result = await executeCode(
      language,
      code,
      testCase.input
    );

    results.push(result);

    const expected = testCase.expectedOutput.trim();
    const actual = result.stdout.trim();

    if (result.exitCode === 0 && actual === expected) {
      passedTestCases += 1;
    }
  }

  let verdict: Verdict = Verdict.Accepted;

  for (const result of results) {
    if (result.verdict === Verdict.TimeLimitExceeded) {
      verdict = Verdict.TimeLimitExceeded;
      break;
    }

    if (result.verdict === Verdict.MemoryLimitExceeded) {
      verdict = Verdict.MemoryLimitExceeded;
      break;
    }

    if (result.exitCode !== 0) {
      verdict = result.verdict ?? Verdict.RuntimeError;
      break;
    }
  }

  if (verdict === Verdict.Accepted && passedTestCases !== testCases.length) {
    verdict = Verdict.WrongAnswer;
  }

  return {
    verdict,
    results,
    passedTestCases,
    totalTestCases: testCases.length,
  };
}
