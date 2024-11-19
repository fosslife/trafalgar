# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format

<type>(<scope>): <subject>

<body>

<footer>

## Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Tests
- `chore`: Maintenance

## Examples

```bash
feat(file-explorer): add drag and drop support
Ask
Copy
Apply
```

```bash
fix(file-explorer): fix file size display
```

## Scope

- `file-explorer`: File explorer component
- `sidebar`: Sidebar component

## Subject

- `add`: Add a new feature
- `fix`: Fix a bug
- `update`: Update a feature

## Body

- `Ask`: Ask for feedback
- `Copy`: Copy a file
- `Apply`: Apply a patch

## Breaking Changes

If your change breaks backward compatibility, the message should include BREAKING CHANGE: in the footer:

- `BREAKING CHANGE`: A breaking change

```bash
feat(api): update file system API

BREAKING CHANGE: new API is not compatible with previous versions
```
