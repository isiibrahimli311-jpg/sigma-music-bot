import { MusicPlayer } from './MusicPlayer.js';

class PlayerManager {
  private players = new Map<string, MusicPlayer>();

  get(guildId: string): MusicPlayer | undefined {
    return this.players.get(guildId);
  }

  getOrCreate(guildId: string): MusicPlayer {
    if (!this.players.has(guildId)) {
      this.players.set(guildId, new MusicPlayer(guildId));
    }
    return this.players.get(guildId)!;
  }

  delete(guildId: string): void {
    const player = this.players.get(guildId);
    if (player) {
      player.destroy();
      this.players.delete(guildId);
    }
  }
}

export const playerManager = new PlayerManager();
