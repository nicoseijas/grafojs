import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { URL, fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requestedPort = Number.parseInt(
  process.env.GRAFOJS_DEMO_PORT ?? "4174",
  10,
);
const port = Number.isFinite(requestedPort) ? requestedPort : 4174;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const fileFor = (pathname) => {
  const decodedPath = decodeURIComponent(
    pathname === "/" ? "/examples/visual-default.html" : pathname,
  );
  if (
    decodedPath !== "/examples/visual-default.html" &&
    !decodedPath.startsWith("/dist/")
  ) {
    return undefined;
  }
  const file = resolve(projectRoot, `.${decodedPath}`);
  return file.startsWith(`${projectRoot}${sep}`) ? file : undefined;
};

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const file = fileFor(url.pathname);
    if (file === undefined || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Bad request");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `grafojs visual demo: http://localhost:${String(port)}/examples/visual-default.html`,
  );
});
