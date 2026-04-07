import app, { PORT } from "./app.js";
import { connectDB } from "./db.js";
import { seedOwner } from "./seedOwner.js";
import { seedSampleUsers } from "./seedSampleUsers.js";
import { seedEnvUser } from "./seedEnvUser.js";
import { ensureMinSessionUser } from "./ensureMinSessionUser.js";

if (process.env.VERCEL !== "1") {
  connectDB()
    .then(() => seedOwner().catch((err) => console.warn("Seed owner failed at startup:", err.message)))
    .then(() => seedSampleUsers().catch((err) => console.warn("Seed sample users failed at startup:", err.message)))
    .then(() => seedEnvUser().catch((err) => console.warn("Seed env user failed at startup:", err.message)))
    .then(() => ensureMinSessionUser())
    .then(() => {
      const server = app.listen(PORT, () => {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        console.log(`\n  Backend API:  http://localhost:${PORT}`);
        console.log(`  Frontend app: ${frontendUrl}\n  Open in browser: ${frontendUrl}\n`);
      });

      server.on("error", (err) => {
        if (err?.code === "EADDRINUSE") {
          console.error(
            `Port ${PORT} is already in use. Another process (often a duplicate backend) is bound to it.\n` +
              `  Fix: from the repo root run  npx kill-port ${PORT}  then start again, or use  run-backend.bat  (it frees 4000 first).\n` +
              `  Or use another port:  set PORT=4001 && npm run dev  (and point the Vite proxy in frontend/vite.config.js at that port).`
          );
        } else {
          console.error("Server startup error:", err);
        }
        process.exit(1);
      });
    })
    .catch((err) => {
      console.error("Startup error:", err);
      process.exit(1);
    });
}

export default app;
