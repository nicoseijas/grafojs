# Writing standard

The documentation of grafojs uses ASD-STE100 Simplified Technical English.

Simplified Technical English (STE) is a controlled language for technical
documents. It gives a set of approved words and a set of rules. The result is
text that is easy to read for a person who does not speak English as a first
language. The text is also easy to translate.

## Where the standard applies

The standard applies to:

- the README file;
- the guides in `docs/`;
- the contribution guide;
- the changelog;
- the text of a new architecture decision record.

The standard does not apply to:

- code examples, identifiers, file names, and command names;
- an architecture decision record that the project accepted before this rule. A
  record is a historical document. Do not change it.

## Words

1. Use an approved word. If a word is not approved, use the approved word that
   has the same meaning. The replacement table below gives the words that this
   documentation needs.
2. Give each word one meaning and one part of speech. Do not use the same word
   as a noun and as a verb.
3. Use a technical name from the glossary for a concept of the subject.
4. Do not use two different words for one thing. Use `edge` in every guide.

## Grammar

5. Write in the active voice. Write "the adapter validates the scene". Do not
   write "the scene is validated".
6. Use the simple present tense when you can.
7. Do not use a verb in the `-ing` form. Write "when the view renders a scene".
   Do not write "when rendering a scene".
8. Keep the articles. Write "the graph". Do not write "graph".
9. Use "must" for a rule. Use "can" for an option. Do not use "should" or
   "shall".
10. Write positive sentences. Do not put two negative words in one sentence.

## Sentences and paragraphs

11. A sentence that describes something has a maximum of 25 words.
12. A sentence that gives an instruction has a maximum of 20 words. It gives one
    instruction.
13. A paragraph that gives instructions has a maximum of 6 sentences.
14. Use a vertical list for complex information.
15. A noun cluster has a maximum of three nouns. "Edge insertion order" is
    correct. A cluster of four nouns is not correct.

## Technical names

STE lets a writer use the nouns of the subject. These words are the technical
names of grafojs. Some of them are adjectives, because the subject has no
approved word with the same meaning.

| Technical name                    | Meaning in grafojs                                       |
| --------------------------------- | -------------------------------------------------------- |
| graph, multigraph                 | the headless data structure                              |
| node, edge, endpoint, payload     | the parts of a graph                                     |
| scene, view, renderer, layer      | the parts of the visual model                            |
| path, cycle, component, traversal | the results of the algorithms                            |
| layout, bounds, position          | the results of the layout helpers                        |
| pulse, leg, effect                | the parts of an animation                                |
| routing, route                    | the shape that grafojs gives to the path of an edge      |
| promise, callback, array, map     | the JavaScript values that the API uses                  |
| immutable                         | grafojs never changes the value after it makes the value |
| directed, acyclic, topological    | properties of a directed graph                           |
| incoming, outgoing                | the direction of an edge at a node                       |
| existing, missing                 | the presence or the absence of a node or an edge         |
| radial, orthogonal                | shapes of a layout and of an edge route                  |

## Replacements

| Do not write          | Write                                      |
| --------------------- | ------------------------------------------ |
| require               | need                                       |
| provide               | give                                       |
| utilize               | use                                        |
| prior to              | before                                     |
| in order to           | to                                         |
| ensure                | make sure                                  |
| verify                | check                                      |
| perform               | do                                         |
| obtain                | get                                        |
| additional            | more                                       |
| sufficient            | enough                                     |
| attempt               | try                                        |
| initiate, commence    | start                                      |
| terminate             | stop                                       |
| approximately         | about                                      |
| via                   | with, through                              |
| however               | but                                        |
| therefore             | write a new sentence that starts with "so" |
| identify              | show                                       |
| evaluate (a function) | call                                       |
| propagate (an error)  | grafojs does not catch the error           |
| deterministic         | the result is always the same              |

## How the project checks the standard

No licensed STE checker runs in the continuous integration pipeline. A reviewer
reads the rules above and checks the text by hand. A future tool can replace
this manual step.
