import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { LoopMode } from '../music/MusicPlayer.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

const modeLabel: Record<LoopMode, string> = {
  [LoopMode.None]: '➡️ Loop **off**',
  [LoopMode.Track]: '🔂 Looping **current track**',
  [LoopMode.Queue]: '🔁 Looping **entire queue**',
};

export const loopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode for playback')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('What to loop')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: LoopMode.None },
          { name: 'Track — repeat the current song', value: LoopMode.Track },
          { name: 'Queue — repeat the whole queue', value: LoopMode.Queue }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.isConnected()) {
      await interaction.reply({ content: "❌ I'm not playing anything right now.", ephemeral: true });
      return;
    }

    const mode = interaction.options.getString('mode', true) as LoopMode;
    player.setLoop(mode);

    await interaction.reply(modeLabel[mode]);
  },
};
