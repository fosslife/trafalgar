export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "revert",
        "build",
        "ci",
      ],
    ],
    "scope-empty": [0, "never"],
    "subject-case": [0],
    "body-max-line-length": [0],
  },
};
