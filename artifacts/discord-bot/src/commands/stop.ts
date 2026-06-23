import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.isConnected()) {
      await interaction.reply({ content: "❌ I'm not playing anything.", ephemeral: true });
      return;
    }

    player.stop();
    await interaction.reply('⏹️ Stopped playback and cleared the queue.');
  },
};
