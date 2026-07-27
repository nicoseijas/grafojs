import { Window } from "happy-dom";
import { createSvgGraph } from "grafojs/visual";

const window = new Window();
const svg = window.document.createElementNS(
  "http://www.w3.org/2000/svg",
  "svg",
);

const view = createSvgGraph(
  svg,
  {
    width: 720,
    height: 400,
    ariaLabel: "Observer notification flow",
    nodes: [
      {
        id: "store",
        x: 40,
        y: 160,
        width: 150,
        height: 64,
        label: "Store",
        tag: "class",
        role: "Subject",
      },
      {
        id: "email",
        x: 480,
        y: 80,
        width: 180,
        height: 64,
        label: "Email subscriber",
        tag: "class",
        role: "Observer",
      },
      {
        id: "sms",
        x: 480,
        y: 240,
        width: 180,
        height: 64,
        label: "SMS subscriber",
        tag: "class",
        role: "Observer",
      },
    ],
    edges: [
      { id: "email-call", from: "store", to: "email", label: "notify" },
      { id: "sms-call", from: "store", to: "sms", label: "notify" },
    ],
  },
  { reducedMotion: () => false },
);

view.setRolesVisible(true);
view.setEffects({ hot: { nodes: ["store"], edges: ["email-call"] } });
await view.pulse([{ edge: "email-call" }], { durationMs: 0 });

console.log(svg.outerHTML);
