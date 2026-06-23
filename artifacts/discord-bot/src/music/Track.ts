import type { User } from 'discord.js';

export interface Track {
  title: string;
  url: string;
  duration: string;
  thumbnail?: string;
  requestedBy: User;
}
