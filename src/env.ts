import type { KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  BOT_TOKEN: string;
  TG_CHAT_ID: string;
  
  // Mini App configuration
  MINI_APP_URL?: string;
  
  // Optional KV binding for storing user data
  USER_DATA?: KVNamespace;
} 