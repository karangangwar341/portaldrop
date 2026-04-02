import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";

const AVATAR_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#10B981",
  "#F59E0B", "#EF4444", "#06B6D4", "#F97316",
];

function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function sessionExpiry() {
  const ttlDays = parseInt(process.env.SESSION_TTL_DAYS ?? "7", 10);
  const d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  createdAt: Date;
}

function toPublic(u: {
  id: string; username: string; displayName: string;
  avatarColor: string; createdAt: Date;
}): PublicUser {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarColor: u.avatarColor, createdAt: u.createdAt };
}

export class UserStore {

  async register(username: string, displayName: string, password: string): Promise<
    | { success: true; user: PublicUser; token: string }
    | { success: false; error: string }
  > {
    const lc = username.toLowerCase().trim();
    if (lc.length < 3 || lc.length > 20) return { success: false, error: "Username must be 3–20 characters." };
    if (!/^[a-z0-9_]+$/.test(lc)) return { success: false, error: "Username may only contain letters, numbers, and underscores." };
    if (password.length < 6) return { success: false, error: "Password must be at least 6 characters." };

    const existing = await prisma.user.findUnique({ where: { username: lc } });
    if (existing) return { success: false, error: "Username already taken." };

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username: lc, displayName: displayName.trim() || username, avatarColor: randomColor(), passwordHash },
    });

    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: sessionExpiry() },
    });

    console.log(`[Auth] Registered: ${lc}`);
    return { success: true, user: toPublic(user), token: session.token };
  }

  async login(username: string, password: string): Promise<
    | { success: true; user: PublicUser; token: string }
    | { success: false; error: string }
  > {
    const lc = username.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { username: lc } });
    if (!user) return { success: false, error: "Invalid username or password." };

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return { success: false, error: "Invalid username or password." };

    // Single-session: remove old sessions
    await prisma.session.deleteMany({ where: { userId: user.id } });
    const session = await prisma.session.create({
      data: { userId: user.id, expiresAt: sessionExpiry() },
    });

    console.log(`[Auth] Login: ${lc}`);
    return { success: true, user: toPublic(user), token: session.token };
  }

  async validateToken(token: string): Promise<PublicUser | null> {
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { token } });
      return null;
    }
    // Slide window
    await prisma.session.update({ where: { token }, data: { expiresAt: sessionExpiry() } });
    return toPublic(session.user);
  }

  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { token } });
  }

  async purgeExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return result.count;
  }
}
