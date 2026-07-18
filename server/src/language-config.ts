export type Language = "javascript" | "python" | "java";

export type RuntimeConfig = {
  image: string;
  filename: string;
  command: string[];
};

export const languageConfig: Record<Language, RuntimeConfig> = {
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