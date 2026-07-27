import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "grafojs-package-"));

const run = (command, arguments_, cwd) => {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${arguments_.join(" ")}`,
        result.stdout,
        result.stderr,
      ].join("\n"),
    );
  }

  return result.stdout;
};

const runNpm = (arguments_, cwd) => {
  const npmCli = process.env.npm_execpath;

  if (npmCli === undefined) {
    throw new Error("npm_execpath is not available.");
  }

  return run(process.execPath, [npmCli, ...arguments_], cwd);
};

const sourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });

try {
  const packOutput = runNpm(
    ["pack", "--json", "--pack-destination", temporaryRoot],
    projectRoot,
  );
  const reports = JSON.parse(packOutput);
  const report = reports[0];

  if (report === undefined) {
    throw new Error("npm pack did not return a package report.");
  }

  const packedPaths = report.files.map(({ path }) => path);
  assert.ok(packedPaths.includes("README.md"));
  assert.ok(packedPaths.includes("package.json"));
  assert.ok(packedPaths.includes("LICENSE"), "The package must ship LICENSE.");
  assert.deepEqual(
    packedPaths.filter((path) => path.startsWith("src/")),
    [],
    "The package must not ship TypeScript sources.",
  );

  const expectedDistPaths = sourceFiles(resolve(projectRoot, "src"))
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
    .flatMap((path) => {
      const output = relative(resolve(projectRoot, "src"), path)
        .replaceAll("\\", "/")
        .replace(/\.ts$/, "");
      return [
        `dist/${output}.d.ts`,
        `dist/${output}.js`,
        `dist/${output}.js.map`,
      ];
    })
    .sort();
  const packedDistPaths = packedPaths
    .filter((path) => path.startsWith("dist/"))
    .sort();

  assert.deepEqual(
    packedDistPaths,
    expectedDistPaths,
    "Packed dist files must exactly match current non-test TypeScript sources.",
  );

  const tarball = resolve(temporaryRoot, report.filename);
  const consumerDirectory = resolve(temporaryRoot, "consumer");
  mkdirSync(consumerDirectory);
  writeFileSync(
    resolve(consumerDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "grafojs-package-consumer",
        private: true,
        type: "module",
        dependencies: {
          grafojs: `file:${tarball}`,
        },
      },
      null,
      2,
    )}\n`,
  );
  runNpm(
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    consumerDirectory,
  );

  writeFileSync(
    resolve(consumerDirectory, "runtime.mjs"),
    [
      'import { addEdge, addNode, bfs, createGraph } from "grafojs";',
      'import { DEFAULT_VISUAL_CSS } from "grafojs/visual";',
      'import { graphToVisualScene } from "grafojs/adapters";',
      'import { applyLayout, layoutRow } from "grafojs/layout";',
      "const empty = createGraph();",
      'const nodes = addNode(addNode(empty, { id: "a", data: 1 }), { id: "b", data: 2 });',
      'const graph = addEdge(nodes, { id: "a-b", from: "a", to: "b", data: undefined });',
      'if (bfs(graph, "a").map(({ id }) => id).join(",") !== "a,b") throw new Error("Runtime export failed.");',
      'if (!DEFAULT_VISUAL_CSS.includes(".gjs-node")) throw new Error("Visual runtime export failed.");',
      'const layout = layoutRow([{ id: "a", width: 100, height: 50 }]);',
      'if (applyLayout([{ id: "a", width: 100, height: 50 }], layout)[0].x !== 0) throw new Error("Layout runtime export failed.");',
      "const scene = graphToVisualScene(graph, { width: 240, height: 160, node: (node, index) => ({ x: index * 120, y: 40, width: 100, height: 50, label: String(node.data) }) });",
      'if (scene.edges[0]?.from !== "a") throw new Error("Adapter runtime export failed.");',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["runtime.mjs"], consumerDirectory);

  writeFileSync(
    resolve(consumerDirectory, "types.ts"),
    [
      'import { addNode, createGraph, type Graph } from "grafojs";',
      'import { createSvgGraph, type VisualScene } from "grafojs/visual";',
      'import { graphToVisualScene, type GraphSceneAdapterOptions } from "grafojs/adapters";',
      'import { applyLayout, layoutRow } from "grafojs/layout";',
      "const empty: Graph<{ label: string }, never> = createGraph<{ label: string }, never>();",
      'const graph = addNode(empty, { id: "a", data: { label: "A" } });',
      "const count: number = graph.nodeCount;",
      "void count;",
      "// @ts-expect-error Graph is nominal and cannot be constructed structurally.",
      "const invalid: Graph<unknown, unknown> = { nodeCount: 0, edgeCount: 0 };",
      "void invalid;",
      "declare const svg: SVGSVGElement;",
      "const scene: VisualScene = { width: 100, height: 100, nodes: [], edges: [] };",
      "const view = createSvgGraph(svg, scene);",
      "view.setEffects({});",
      'const positions = layoutRow([{ id: "a", width: 100, height: 50 }]);',
      'const positioned = applyLayout([{ id: "a", width: 100, height: 50 }], positions);',
      "void positioned;",
      "const adapterOptions: GraphSceneAdapterOptions<{ label: string }, never> = { width: 160, height: 100, node: (node) => ({ x: 20, y: 20, width: 100, height: 50, label: node.data.label }) };",
      "const adapted = graphToVisualScene(graph, adapterOptions);",
      "void adapted;",
      "",
    ].join("\n"),
  );
  writeFileSync(
    resolve(consumerDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          exactOptionalPropertyTypes: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          target: "ES2022",
        },
        include: ["types.ts"],
      },
      null,
      2,
    )}\n`,
  );
  const typescriptCli = resolve(
    projectRoot,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  run(
    process.execPath,
    [typescriptCli, "-p", "tsconfig.json"],
    consumerDirectory,
  );

  const installedPackage = JSON.parse(
    readFileSync(
      resolve(consumerDirectory, "node_modules", "grafojs", "package.json"),
      "utf8",
    ),
  );
  assert.equal(installedPackage.name, "grafojs");

  // The package ships dist/ only, so a source map that merely points at
  // ../src/*.ts would be unusable for a consumer. Every map must carry its
  // own sources.
  const installedRoot = resolve(consumerDirectory, "node_modules", "grafojs");
  const maps = sourceFiles(resolve(installedRoot, "dist")).filter((path) =>
    path.endsWith(".js.map"),
  );
  assert.ok(maps.length > 0, "The package must ship source maps.");
  for (const map of maps) {
    const parsed = JSON.parse(readFileSync(map, "utf8"));
    assert.ok(
      Array.isArray(parsed.sourcesContent) &&
        parsed.sourcesContent.every(
          (content) => typeof content === "string" && content.length > 0,
        ),
      `Source map without inlined sources: ${relative(installedRoot, map)}`,
    );
  }

  // Node resolves `require` of an ES module since 22.12, but only when the
  // exports map offers a condition that `require` matches.
  writeFileSync(
    resolve(consumerDirectory, "required.cjs"),
    [
      'const { createGraph } = require("grafojs");',
      'const { layoutRow } = require("grafojs/layout");',
      'if (createGraph().nodeCount !== 0) throw new Error("require() of the root entry point failed.");',
      'if (layoutRow([]).bounds.width !== 0) throw new Error("require() of a subpath failed.");',
      'require("grafojs/package.json");',
      "",
    ].join("\n"),
  );
  run(process.execPath, ["required.cjs"], consumerDirectory);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
