import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static web files in production
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const path = await import("path");
    app.use(express.static(path.join(process.cwd(), "dist/web")));
  }

  registerOAuthRoutes(app);

  // Receipt image upload endpoint
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { base64, mimeType = "image/jpeg" } = req.body;
      if (!base64) { res.status(400).json({ error: "base64 required" }); return; }
      const { storagePut } = await import("../storage");
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const key = `receipts/images/upload-${Date.now()}.${ext}`;
      const buf = Buffer.from(base64, "base64");
      const { url } = await storagePut(key, buf, mimeType);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // Material delivery file upload (photos + PDFs)
  app.post("/api/upload-material-file", async (req, res) => {
    try {
      const { base64, mimeType = "image/jpeg", fileName = "file" } = req.body;
      if (!base64) { res.status(400).json({ error: "base64 required" }); return; }
      const { storagePut } = await import("../storage");
      const ext = mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg";
      const key = `material-delivery/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;
      const buf = Buffer.from(base64, "base64");
      const { url } = await storagePut(key, buf, mimeType);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // SPA fallback: serve index.html for all non-API routes
  if (isProduction) {
    const path = await import("path");
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/web/index.html"));
    });
  }

  // Deploy to Production endpoint - triggers GitHub Actions workflow
  app.post("/api/deploy-to-production", async (req, res) => {
    try {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        res.status(500).json({ error: "GitHub token not configured" });
        return;
      }

      const owner = "greggdisantis";
      const repo = "DOS-Hub";
      const workflowId = "242198057"; // Numeric ID for deploy-to-cloud-run.yml

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref: "main",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        res.status(response.status).json({
          error: `GitHub API error: ${response.statusText}`,
          details: error,
        });
        return;
      }

      res.json({
        success: true,
        message: "Deployment to production triggered successfully",
        workflowUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowId}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Deployment failed" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
