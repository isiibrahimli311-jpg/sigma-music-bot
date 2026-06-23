import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';
import type { VoiceBasedChannel } from 'discord.js';
import play from 'play-dl';
import type { Track } from './Track.js';

export enum LoopMode {
  None = 'none',
  Track = 'track',
  Queue = 'queue',
}

export class MusicPlayer {
  private connection: VoiceConnection | null = null;
  private player: AudioPlayer;
  private queue: Track[] = [];
  private currentTrack: Track | null = null;
  private currentResource: AudioResource | null = null;
  private _paused = false;
  private _loop: LoopMode = LoopMode.None;
  private _volume = 100;

  constructor(private guildId: string) {
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      const finished = this.currentTrack;
      this.currentTrack = null;
      this.currentResource = null;
      this._paused = false;

      if (finished) {
        if (this._loop === LoopMode.Track) {
          this.queue.unshift(finished);
        } else if (this._loop === LoopMode.Queue) {
          this.queue.push(finished);
        }
      }

      void this.playNext();
    });

    this.player.on('error', (error) => {
      console.error(`[MusicPlayer] Audio error: ${error.message}`);
      this.currentTrack = null;
      this.currentResource = null;
      this._paused = false;
      void this.playNext();
    });
  }

  async join(channel: VoiceBasedChannel): Promise<void> {
    console.log(`[Voice] Joining channel "${channel.name}" in guild ${this.guildId}`);

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: this.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    this.connection.on('stateChange', (oldState, newState) => {
      console.log(`[Voice] State: ${oldState.status} → ${newState.status}`);
    });

    this.connection.on('error', (err) => {
      console.error('[Voice] Connection error:', err);
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 60_000);
      console.log('[Voice] Connection ready!');
      this.connection.subscribe(this.player);
    } catch (err) {
      const stuck = this.connection?.state.status ?? 'unknown';
      console.error(`[Voice] Failed to reach Ready state (stuck at: ${stuck}):`, err);
      this.connection.destroy();
      this.connection = null;
      throw new Error(`Voice connection failed (stuck at: ${stuck}). Make sure the bot has Connect & Speak permissions in that channel.`);
    }

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      void (async () => {
        try {
          await Promise.race([
            entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          this.destroy();
        }
      })();
    });
  }

  async addTrack(track: Track): Promise<void> {
    this.queue.push(track);
    if (this.currentTrack === null && this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    const track = this.queue.shift();
    if (!track) return;

    this.currentTrack = track;

    try {
      console.log(`[MusicPlayer] Streaming: ${track.title} | ${track.url}`);
      const stream = await play.stream(track.url);
      console.log(`[MusicPlayer] Stream type: ${stream.type}`);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      resource.volume?.setVolumeLogarithmic(this._volume / 100);
      this.currentResource = resource;
      this.player.play(resource);
      console.log(`[MusicPlayer] Playing: ${track.title}`);
    } catch (error) {
      console.error(`[MusicPlayer] Failed to stream "${track.title}":`, error);
      this.currentTrack = null;
      this.currentResource = null;
      await this.playNext();
    }
  }

  skip(): boolean {
    if (!this.currentTrack) return false;
    const loopSave = this._loop;
    this._loop = LoopMode.None;
    this.player.stop(true);
    this._loop = loopSave;
    return true;
  }

  stop(): void {
    this.queue = [];
    this.currentTrack = null;
    this.currentResource = null;
    this._paused = false;
    this._loop = LoopMode.None;
    this.player.stop(true);
  }

  pause(): boolean {
    if (this.player.state.status !== AudioPlayerStatus.Playing) return false;
    this.player.pause();
    this._paused = true;
    return true;
  }

  resume(): boolean {
    if (this.player.state.status !== AudioPlayerStatus.Paused) return false;
    this.player.unpause();
    this._paused = false;
    return true;
  }

  shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j]!, this.queue[i]!];
    }
  }

  setLoop(mode: LoopMode): void {
    this._loop = mode;
  }

  getLoop(): LoopMode {
    return this._loop;
  }

  setVolume(percent: number): void {
    this._volume = Math.max(0, Math.min(200, percent));
    this.currentResource?.volume?.setVolumeLogarithmic(this._volume / 100);
  }

  getVolume(): number {
    return this._volume;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  getQueue(): Track[] {
    return [...this.queue];
  }

  isPaused(): boolean {
    return this._paused;
  }

  isConnected(): boolean {
    return (
      this.connection !== null &&
      this.connection.state.status !== VoiceConnectionStatus.Destroyed
    );
  }

  destroy(): void {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }
}
