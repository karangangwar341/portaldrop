import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { RoomManager } from "./rooms/RoomManager";
import { UserStore } from "./auth/UserStore";
import { registerSocketHandlers } from "./socket/handlers";
import { prisma } from "./db/prisma";

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: Date.now(), version: "2.0.0" });
  } catch {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e8,
});

const roomManager = new RoomManager();
const userStore = new UserStore();

io.on("connection", socket => {
  console.log(`[Socket] Connected: ${socket.id}`);
  registerSocketHandlers(socket, io, roomManager, userStore);
  socket.on("disconnect", reason => console.log(`[Socket] Disconnected: ${socket.id} — ${reason}`));
});

// ── Background jobs ────────────────────────────────────────────────────────

// Clean up expired in-memory rooms every 60s
setInterval(() => {
  const n = roomManager.cleanExpiredRooms();
  if (n > 0) console.log(`[Rooms] Cleaned ${n} expired room(s)`);
}, 60_000);

// Purge expired DB sessions every hour
setInterval(async () => {
  const n = await userStore.purgeExpiredSessions();
  if (n > 0) console.log(`[Auth] Purged ${n} expired session(s)`);
}, 60 * 60_000);

// ── Boot ───────────────────────────────────────────────────────────────────

async function start() {
  // Verify DB connection before accepting traffic
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Could not connect to database:", err);
    console.error("   Check DATABASE_URL in server/.env");
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 PortalDrop v2 Server`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Client origin: ${CLIENT_ORIGIN}\n`);
  });
}

start();
