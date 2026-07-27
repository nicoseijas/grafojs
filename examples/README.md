# Examples

Build and run the examples from the root of the repository:

```sh
npm run example:basic
npm run example:paths
npm run example:components
npm run example:adapters
npm run example:visual
```

The `visual.mjs` example uses a DOM implementation for development only, so you
can run the SVG example from Node. A browser gives a real `SVGSVGElement`.

Each example in this directory imports `grafojs` through a public entry point of
the package.

## Browser demos

To see the browser demos, run this command:

```sh
npm run example:visual:browser
```

The command starts a local server and prints one address for each page.

Both pages import the compiled files in `dist/` directly, and neither page
depends on `design_patterns`.

### Default appearance

[visual-default.html](http://localhost:4174/examples/visual-default.html) uses
the SVG styles that the renderer injects by itself. It shows the visibility, the
effects, the role labels, and the pulses.

### Composition with host content

[visual-composition.html](http://localhost:4174/examples/visual-composition.html)
shows the pattern that the [scene guide](../docs/visual/scenes.md) describes.
grafojs draws the cards and every edge. The page draws the icons, the titles,
the descriptions, and the chips in an HTML layer above the SVG, from the same
coordinates.

The page has two buttons. One button runs a pulse through the flow, so you can
see that the animation of grafojs and the HTML layer stay together. The other
button hides the HTML layer, so you can see which part grafojs draws.
