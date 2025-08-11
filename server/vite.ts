import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Lazy-load Vite and config to avoid requiring devDependencies in production
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteLogger = createLogger();
  const viteConfig = (await import("../vite.config")).default;
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use process.cwd() for esbuild compatibility instead of import.meta.dirname
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log("🔧 Static serving setup:");
  console.log("  Working directory:", process.cwd());
  console.log("  Static path:", distPath);
  console.log("  Path exists:", fs.existsSync(distPath));
  
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath, { recursive: true });
    console.log("  Files found:", files.length);
    console.log("  First few files:", files.slice(0, 5));
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  console.log("  ✅ express.static middleware configured");

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    console.log("  📄 Serving index.html fallback for:", _req.originalUrl);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
