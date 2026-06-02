import { Pool } from "pg";
import { env } from "./env.js";
import { logMission } from "../utils/logger.js";

const getSslConfig = (dbUrl, fallbackState = null) => {
  if (!dbUrl) return false;
  
  if (fallbackState !== null) {
    return fallbackState;
  }
  
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    return false;
  }
  
  // Render internal URL starts with dpg- and has no external domain
  if (dbUrl.includes("dpg-") && !dbUrl.includes(".render.com")) {
    return false;
  }
  
  return { rejectUnauthorized: false };
};

const createPoolWithListeners = (connectionString, ssl) => {
  const newPool = new Pool({
    connectionString,
    ssl,
    max: 5, // Limit concurrent pool connections to protect free-tier Postgres database limits
    idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
    connectionTimeoutMillis: 15000 // Longer timeout for Render free-tier cold starts
  });

  // Catch unexpected background errors on idle clients to prevent Node server crashing!
  newPool.on('error', (err) => {
    console.error('[MISSION-CONTROL][DB-POOL-ERROR] Unexpected error on idle database client:', err.message);
  });

  return newPool;
};

let activePool = createPoolWithListeners(env.databaseUrl, getSslConfig(env.databaseUrl));

// Proxy pool that routes all operations to the currently active, connected pool instance
export const pool = new Proxy({}, {
  get: (target, prop) => {
    const val = activePool[prop];
    if (typeof val === 'function') {
      return val.bind(activePool);
    }
    return val;
  }
});

// DB readiness flag — set to true once initializeDatabase() completes successfully
let dbReady = false;
export const isDbReady = () => dbReady;

export const initializeDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 8;
  let success = false;
  let currentSsl = getSslConfig(env.databaseUrl);
  let consecutiveSameModeFails = 0;

  while (attempts < maxAttempts && !success) {
    try {
      // Perform a lightweight probe query to check if connection works
      await activePool.query("SELECT 1");
      logMission("Database connection probe succeeded. Connection verified.");
      success = true;
    } catch (error) {
      attempts++;
      consecutiveSameModeFails++;
      const errMsg = error.message || "";
      console.warn(`[MISSION-CONTROL][DB] Connection probe ${attempts} failed:`, errMsg);
      
      if (attempts >= maxAttempts) {
        // Fail-over and retry quota exhausted, rethrow the connection error
        throw error;
      }

      // Terminate the current pool connection to avoid leaks
      await activePool.end().catch(() => {});
      
      // Analyze the error semantically to make smart routing choices
      if (errMsg.includes("SSL/TLS required") || (errMsg.includes("no pg_hba.conf entry") && errMsg.includes("SSL off"))) {
        console.log("[MISSION-CONTROL][DB] Database requires SSL. Activating SSL mode...");
        currentSsl = { rejectUnauthorized: false };
        consecutiveSameModeFails = 0;
      } else if (errMsg.includes("no pg_hba.conf entry") && errMsg.includes("SSL on")) {
        console.log("[MISSION-CONTROL][DB] Database does not support SSL. Disabling SSL...");
        currentSsl = false;
        consecutiveSameModeFails = 0;
      } else if (errMsg.includes("Connection terminated unexpectedly") || errMsg.includes("timeout") || errMsg.includes("ECONNRESET")) {
        // After 2 consecutive failures with same SSL mode, toggle SSL as the
        // "terminated unexpectedly" error can be a silent SSL handshake rejection
        if (consecutiveSameModeFails >= 2) {
          const newSsl = currentSsl ? false : { rejectUnauthorized: false };
          console.log(`[MISSION-CONTROL][DB] ${consecutiveSameModeFails} consecutive failures. Toggling SSL from ${!!currentSsl} to ${!!newSsl}...`);
          currentSsl = newSsl;
          consecutiveSameModeFails = 0;
        }
        
        const delay = Math.min(attempts * 2000, 10000);
        console.log(`[MISSION-CONTROL][DB] Network/connection error. Retrying in ${delay}ms (SSL: ${!!currentSsl}, attempt ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Safe fallback toggle for any other connection errors
        console.log("[MISSION-CONTROL][DB] Unhandled connection error. Toggling SSL mode as fallback...");
        currentSsl = currentSsl ? false : { rejectUnauthorized: false };
        consecutiveSameModeFails = 0;
      }

      console.log(`[MISSION-CONTROL][DB] Re-initializing active pool (SSL: ${!!currentSsl}, Attempt: ${attempts + 1}/${maxAttempts})`);
      activePool = createPoolWithListeners(env.databaseUrl, currentSsl);
    }
  }


  // Once activePool is successfully connected, run setup tables queries
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      role VARCHAR(50) DEFAULT 'user',
      is_banned BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await activePool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`);
  
  await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
  await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
  await activePool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false`);
  
  // Enforce Master Admin Role
  await activePool.query(`UPDATE users SET role = 'admin' WHERE email = 'gossipchatadmin@gmail.com'`);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_id VARCHAR(255) NOT NULL,
      secure_url TEXT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, friend_id)
    )
  `);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      file_url TEXT,
      file_type VARCHAR(50),
      file_name VARCHAR(255),
      reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      is_forwarded BOOLEAN DEFAULT FALSE,
      is_edited BOOLEAN DEFAULT FALSE,
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL`);
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE`);
  
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT`);
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type VARCHAR(50)`);
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name VARCHAR(255)`);
  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`);
  
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS verification_otps (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS message_visibility (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id)
    )
  `);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permissions JSONB DEFAULT '{"allow_member_edit": true}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(group_id, user_id)
    )
  `);

  await activePool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE`);
  await activePool.query(`ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL`);

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  logMission("Group Chat telemetry online. Tables verified.");
  dbReady = true;
};
