// Basic types for Telegram Bot Starter

export interface User {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export interface Message {
  message_id: number;
  from?: User;
  chat: Chat;
  date: number;
  text?: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface BotResponse {
  success: boolean;
  message: string;
  data?: any;
} 