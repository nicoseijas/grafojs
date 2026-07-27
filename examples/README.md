# Examples

Build and run the examples from the repository root:

```sh
npm run example:basic
npm run example:paths
npm run example:components
npm run example:adapters
npm run example:visual
```

`visual.mjs` uses a development-only DOM implementation so the SVG example is
runnable from Node. Browser consumers pass a real `SVGSVGElement`.

The examples import `grafojs` through its public package entry point.

## Default visual demo

To open a browser-based showcase of the default `grafojs/visual` appearance:

```sh
npm run example:visual:browser
```

Then visit
[http://localhost:4174/examples/visual-default.html](http://localhost:4174/examples/visual-default.html).
The demo uses the renderer's built-in SVG styles and demonstrates visibility,
effects, role labels, and pulses without depending on `design_patterns`.
