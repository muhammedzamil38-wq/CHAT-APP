import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initializeDatabase, isDbReady } from "./config/db.js";
import { initializeSocket } from "./socket.js";
import { logMission, logMissionError } from "./utils/logger.js";

// Add a DB-readiness gate middleware so API calls during DB startup get a clean error
app.use("/api", (req, res, next) => {
  if (!isDbReady()) {
    return res.status(503).json({ 
      error: "Service starting up. Database initializing. Please retry in a moment." 
    });
  }
  next();
});

const bootstrap = async () => {
  // CRITICAL: Start the HTTP server FIRST so Render detects the open port
  // and does NOT restart the process. DB init runs in the background.
  const server = http.createServer(app);
  initializeSocket(server);

  await new Promise((resolve) => {
    server.listen(env.port, () => {
      logMission(`GOSSIP backend port ${env.port} open. DB initialization starting in background...`);
      resolve();
    });
  });

  // Now initialize DB in the background — retries will not crash the process
  const initDbWithRetry = async (overallAttempt = 1) => {
    const MAX_OVERALL = 5;
    try {
      await initializeDatabase();
      logMission("Database fully initialized. All systems nominal.");
    } catch (error) {
      logMissionError(`DB initialization failed (overall attempt ${overallAttempt}/${MAX_OVERALL}).`, error);
      if (overallAttempt < MAX_OVERALL) {
        const delay = Math.min(overallAttempt * 15000, 60000); // 15s, 30s, 45s, 60s
        console.log(`[MISSION-CONTROL] Retrying DB init in ${delay / 1000}s...`);
        setTimeout(() => initDbWithRetry(overallAttempt + 1), delay);
      } else {
        logMissionError("All DB initialization attempts exhausted. Running in degraded mode (API returns 503).", error);
        // Do NOT exit — server stays alive so Render doesn't restart and spam the DB
      }
    }
  };

  void initDbWithRetry();
};

void bootstrap();

