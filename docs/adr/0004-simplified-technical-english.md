# ADR-0004: Simplified Technical English for documentation

- Status: accepted
- Date: 2026-07-27

## Context

The guidelines say that the public documentation is in English. They do not say
which English. The guides thus mix long sentences, the passive voice, and
several words for one concept. The word "requires" and the word "needs" appear
for the same idea. The passive voice hides the component that does the work.

Many readers of a graph library do not speak English as a first language. A
controlled language makes the text easier for them, and easier to translate.

ASD-STE100 Simplified Technical English is a public standard for technical
documents. The aerospace industry maintains it. It gives approved words, and it
lets a project add the technical names of its own subject.

## Decision

The documentation of grafojs uses ASD-STE100. `docs/writing-standard.md` holds
the rules, the technical names of grafojs, and the replacement table.

The standard applies to the README file, the guides in `docs/`, the contribution
guide, and the text of a new architecture decision record.

The standard does not apply to code examples, identifiers, or an architecture
decision record that the project accepted before this decision. A record is a
historical document, so the project keeps its original text.

Error messages and JSDoc comments keep their current text. A later change can
apply the standard to them, because a change to an error message also changes
the tests that assert the message.

No licensed STE checker runs in the continuous integration pipeline. A reviewer
applies the rules by hand.

## Consequences

- A reader gets short sentences, the active voice, and one word for one concept.
- A translator gets text with a small vocabulary.
- A writer must look at the replacement table before the writer adds a guide.
- The project applies the standard, but the project does not certify the
  compliance. A licensed dictionary and a checker tool can certify it later.
- The documentation and the error messages use different English until a later
  change makes them equal.
