import type { KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  BOT_TOKEN: string;
  TG_CHAT_ID: string;
  
  // Mini App configuration
  MINI_APP_URL?: string;
  
  // RPC URLs for blockchain networks
  BASE_RPC_URL?: string;
  MANTLE_RPC_URL?: string;
  ARBITRUM_RPC_URL?: string;
  
  // Optional KV binding for storing user data
  USER_DATA?: KVNamespace;
} 