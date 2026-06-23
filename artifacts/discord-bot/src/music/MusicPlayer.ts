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
  getVoiceConnection,
} from '@discordjs/voice';
import type { VoiceBasedChannel } from 'discord.js';
import play from 'play-dl';
import type { Track } from './Track.js';

export enum LoopMode {
  None = 'none',
  Track = 'track',
  Queue = 'queue',
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Clean up any stale connection for this guild
    const stale = getVoiceConnection(this.guildId);
    if (stale) {
      console.log('[Voice] Destroying stale connection before joining');
      stale.destroy();
      await sleep(500);
    }

    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: this.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    this.connection = conn;
    let rejoinCount = 0;
    const maxRejoins = 8;

    conn.on('stateChange', (oldState, newState) => {
      console.log(`[Voice] State: ${oldState.status} → ${newState.status}`);

      // When we cycle back to signalling mid-connection, send a fresh join request
      if (
        oldState.status === VoiceConnectionStatus.Connecting &&
        newState.status === VoiceConnectionStatus.Signalling
      ) {
        rejoinCount++;
        console.log(`[Voice] Re-signalling (${rejoinCount}/${maxRejoins}) — sending rejoin`);
        if (rejoinCount <= maxRejoins) {
          conn.rejoin();
        } else {
          console.error('[Voice] Max rejoins exceeded, destroying connection');
          conn.destroy();
        }
      }
    });

    conn.on('error', (err) => {
      console.error('[Voice] Connection error:', err.message);
    });

    try {
      await entersState(conn, VoiceConnectionStatus.Ready, 90_000);
      console.log('[Voice] Connection ready!');
    } catch (err) {
      const stuck = conn.state.status;
      console.error(`[Voice] Failed to reach Ready (stuck at: ${stuck})`);
      conn.destroy();
      this.connection = null;
      throw new Error(`Could not connect to voice channel after ${maxRejoins} attempts. Try changing your voice channel's Region Override to "Automatic" in channel settings.`);
    }

    conn.on(VoiceConnectionStatus.Disconnected, () => {
      void (async () => {
        try {
          await Promise.race([
            entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
            entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          this.destroy();
        }
      })();
    });

    conn.subscribe(this.player);
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

  setLoop(mode: LoopMode): void { this._loop = mode; }
  getLoop(): LoopMode { return this._loop; }

  setVolume(percent: number): void {
    this._volume = Math.max(0, Math.min(200, percent));
    this.currentResource?.volume?.setVolumeLogarithmic(this._volume / 100);
  }

  getVolume(): number { return this._volume; }
  getCurrentTrack(): Track | null { return this.currentTrack; }
  getQueue(): Track[] { return [...this.queue]; }
  isPaused(): boolean { return this._paused; }

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
