# Security policy

## Versions that get a fix

The project is in early development. Only the most recent `0.x` version gets a
fix. An older version gets no patch release.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## How to report a problem

Do not open a public issue for a security problem.

Use
[a private security advisory](https://github.com/nicoseijas/grafojs/security/advisories/new).
GitHub sends the report to the maintainer, and the discussion stays private
until a fix exists.

Give the version, the entry point, and the smallest input that shows the
problem. The maintainer answers in seven days.

## What the library does with your data

Two properties limit the attack surface:

- The package has no runtime dependency. The published files contain only the
  code of this repository.
- The renderer writes every label through the text APIs of the DOM. It builds no
  HTML from a string, so a label cannot become an element. A label is text, even
  when it holds `<script>`.

Two things stay with the host application:

- **The class names of a node and of an edge.** The renderer validates that each
  class is a single CSS class token, and then writes it into the `class`
  attribute. A host that takes a class name from an untrusted source gives that
  source control of the appearance.
- **The styles.** `injectStyles: false` gives all the styles to the host. CSS
  from an untrusted source can hide, move, or cover any part of the picture.

The renderer needs no network and no storage. Of the environment, it reads only
the media query for reduced motion, the clock, and the animation-frame API.
