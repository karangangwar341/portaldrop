/** File chunk size in bytes. Tune based on latency/throughput tradeoffs. */
export const CHUNK_SIZE = 64 * 1024; // 64 KB

/** DataChannel buffer threshold — pause sending when above this. */
export const BUFFER_HIGH_WATERMARK = 1 * 1024 * 1024; // 1 MB

/** DataChannel buffer threshold — resume sending when below this. */
export const BUFFER_LOW_WATERMARK = 256 * 1024; // 256 KB

/** Maximum DataChannel message size (metadata/text, not chunk data) */
export const MAX_META_SIZE = 16 * 1024; // 16 KB

/** Room expiry warning threshold (ms before expiry) */
export const EXPIRY_WARNING_MS = 60 * 1000; // 1 minute

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    // Public STUN servers for development
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // V2: Add TURN credentials here
    // {
    //   urls: "turn:your-turn-server.com:3478",
    //   username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    //   credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    // },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

export const DATA_CHANNEL_OPTIONS: RTCDataChannelInit = {
  ordered: true,
  // For V2: Consider unordered + manual reassembly for better throughput
};
