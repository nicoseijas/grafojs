# Contributing

Thanks for helping improve grafojs.

## Development setup

The repository toolchain requires Node.js 22.13 or later.

```sh
npm install
npm run check
```

`npm run check` runs formatting, lint, type checking, coverage, compiled-package
verification, and the dependency audit.

## Changes

- Start observable behavior with a test or executable example.
- Keep public documentation, JSDoc, error messages, and examples in English.
- Preserve graph immutability and deterministic insertion order.
- Document algorithm input, result order, edge cases, and complexity.
- Add an ADR for decisions that are expensive to reverse.
- Avoid runtime dependencies unless an ADR justifies the tradeoff.

Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`,
`refactor:`, and `chore:`.
