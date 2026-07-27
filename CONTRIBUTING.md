# Contributing

Thank you for your help with grafojs.

## Development setup

The repository toolchain needs Node.js 22.13 or a later version.

```sh
npm install
npm run check
```

The `npm run check` command runs the formatter, the linter, the type checker,
the tests with coverage, and the verification of the compiled package.

The `npm run audit` command checks the dependencies. It is a separate command,
and a separate job in the continuous integration pipeline. A new advisory
against a dependency must not make a pull request red without a code change. The
`check` command also needs no network access.

## Changes

- Start each observable behavior with a test or with an example that runs.
- Write the public documentation, the JSDoc comments, the error messages, and
  the examples in English.
- Follow the [writing standard](./docs/writing-standard.md) in the
  documentation. It applies ASD-STE100 Simplified Technical English.
- Keep the graph immutable, and keep the insertion order stable.
- Document the input, the order of the result, the edge cases, and the
  complexity of each algorithm.
- Add an ADR for a decision that is expensive to reverse.
- Do not add a runtime dependency unless an ADR gives a reason for the tradeoff.

Use a conventional commit prefix, for example `feat:`, `fix:`, `docs:`, `test:`,
`refactor:`, or `chore:`.
