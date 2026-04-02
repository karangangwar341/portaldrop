# PortalDrop v2

Secure, browser-to-browser file transfer with WebRTC.

## New Features in v2

| Feature | Status | Details |
|---|---|---|
| **User Authentication** | ✅ | Register/login with persistent accounts (server in-memory; swap for DB) |
| **Permanent User Accounts** | ✅ | Sessions stored in localStorage, validated on reconnect |
| **File History Persistence** | ✅ | Last 200 transfers logged in localStorage per user |
| **Folder Transfer** | ✅ | `webkitdirectory` input + folder-meta protocol over data channel |
| **LAN Discovery** | ✅ | Socket.IO broadcast for peers on same server; connect with one click |
| **Resume Interrupted Transfers** | ✅ | Chunk-level resume protocol (`file-resume-request` / `file-resume-ack`) |
| **End-to-End Encryption UI** | ✅ | ECDH P-256 key exchange + AES-GCM per-chunk encryption; badge in UI |
| **Multi-Peer Rooms** | ✅ | Group rooms up to 8 peers; mesh WebRTC connections |
| **Group Sharing** | ✅ | Files broadcast to all connected peers in room |
| **Notifications System** | ✅ | In-app + browser Notification API; bell icon with unread count |
| **Pause Transfers** | ✅ | Abort controller per transfer; resume-from-chunk on reconnect |

## Architecture

```
portaldrop-v2/
├── server/               # Node.js signaling + auth server
│   └── src/
│       ├── auth/         # UserStore (bcrypt + token sessions)
│       ├── rooms/        # RoomManager (multi-peer aware)
│       └── socket/       # handlers (auth, LAN, signaling events)
├── web/                  # Next.js 14 frontend
│   └── src/
│       ├── app/          # page.tsx (main entry)
│       ├── components/
│       │   ├── auth/     # AuthModal
│       │   ├── history/  # TransferHistory
│       │   ├── lan/      # LANDiscoveryPanel
│       │   ├── notifications/ # NotificationPanel, NotificationBell
│       │   ├── pairing/  # CreateConnectionCard, JoinConnectionForm, StatusBadge
│       │   ├── rooms/    # MultiPeerPanel
│       │   └── transfer/ # DropZone, TransferProgressCard, FolderProgressCard, TransferRoom
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useLANDiscovery.ts
│       │   ├── useNotifications.ts
│       │   └── useRoomSession.ts  (multi-peer, folder, encryption, history)
│       └── lib/
│           ├── auth/     # localStorage session + history helpers
│           ├── encryption/ # ECDH + AES-GCM e2e.ts
│           └── webrtc/   # PeerConnection (upgraded with all features)
└── shared/types.ts       # Shared types (auth, LAN, notifications, folders, etc.)
```

## Getting Started

### Server
```bash
cd server
npm install
npm run dev        # starts on :3001
```

### Web
```bash
cd web
npm install
npm run dev        # starts on :3000
```

### Environment
```
# web/.env.local
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
```

## Bluetooth / Native Device APIs
Bluetooth file transfer requires native app context (React Native / Electron).  
The LAN Discovery feature covers the local-network use case via UDP-style announcements over the existing WebSocket.  
To add Bluetooth: use Web Bluetooth API (`navigator.bluetooth`) in a progressive enhancement layer on top of the existing `PeerConnection` class.

## Production Notes
- Replace `UserStore` (in-memory Map) with PostgreSQL / Redis for persistence across restarts.
- Add TURN server credentials to `ICE_CONFIG` for NAT traversal beyond the same LAN.
- The E2E encryption uses ephemeral ECDH keys — forward secrecy per session.
