import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initializeDatabase } from "./config/db.js";
import { initializeSocket } from "./socket.js";
import { logMission, logMissionError } from "./utils/logger.js";

const bootstrap = async () => {
  try {
    await initializeDatabase();

    const server = http.createServer(app);
    initializeSocket(server);

    server.listen(env.port, () => {
      logMission(`GOSSIP backend launched on port ${env.port}.`);
    });
  } catch (error) {
    logMissionError("Launch sequence failed.", error);
    process.exit(1);
  }
};

void bootstrap();
