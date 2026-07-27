export const DEFAULT_VISUAL_CSS = `
.gjs-root {
  --gjs-surface: #171a21;
  --gjs-ink: #e8ebf2;
  --gjs-muted: #8991a3;
  --gjs-line: #596174;
  --gjs-accent: #ffb454;
  --gjs-interface: #5ad6be;
  --gjs-danger: #f26d6d;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.gjs-node-shape {
  fill: var(--gjs-surface);
  stroke: var(--gjs-line);
  stroke-width: 1.4;
}
.gjs-node text { fill: var(--gjs-ink); font-size: 13.5px; }
.gjs-node .gjs-tag {
  fill: var(--gjs-muted);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.gjs-node .gjs-role {
  display: none;
  fill: var(--gjs-interface);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.gjs-root.gjs-roles-visible .gjs-role { display: inline; }
.gjs-edge path {
  fill: none;
  stroke: var(--gjs-line);
  stroke-width: 1.5;
}
.gjs-edge text { fill: var(--gjs-muted); font-size: 10.5px; }
.gjs-edge--implementation path {
  stroke: var(--gjs-interface);
  stroke-dasharray: 5 5;
}
.gjs-edge--invisible { opacity: 0; pointer-events: none; }
.gjs-node.gjs-hot .gjs-node-shape, .gjs-edge.gjs-hot path {
  stroke: var(--gjs-accent);
  filter: drop-shadow(0 0 6px var(--gjs-accent));
}
.gjs-node.gjs-stress .gjs-node-shape, .gjs-edge.gjs-stress path {
  stroke: var(--gjs-danger);
  filter: drop-shadow(0 0 6px var(--gjs-danger));
}
.gjs-muted { opacity: .38; }
.gjs-hidden { opacity: 0; pointer-events: none; }
.gjs-node, .gjs-edge { transition: opacity .35s; }
.gjs-pulse {
  fill: var(--gjs-accent);
  filter: drop-shadow(0 0 6px var(--gjs-accent));
}
.gjs-pulse--return {
  fill: var(--gjs-interface);
  filter: drop-shadow(0 0 5px var(--gjs-interface));
}
.gjs-pulse--error {
  fill: var(--gjs-danger);
  filter: drop-shadow(0 0 6px var(--gjs-danger));
}
@media (prefers-reduced-motion: reduce) {
  .gjs-node, .gjs-edge { transition: none; }
}
`.trim();
