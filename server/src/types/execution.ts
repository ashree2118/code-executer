export enum Verdict {
  Accepted = "Accepted",
  WrongAnswer = "WrongAnswer",
  RuntimeError = "RuntimeError",
  CompilationError = "CompilationError",
  TimeLimitExceeded = "TimeLimitExceeded",
  MemoryLimitExceeded = "MemoryLimitExceeded",
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsed?: number;
  verdict?: Verdict;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface SubmissionEvaluationResult {
  verdict: Verdict;
  results: ExecutionResult[];
  passedTestCases: number;
  totalTestCases: number;
}