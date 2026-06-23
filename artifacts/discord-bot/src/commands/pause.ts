import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const pauseCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.pause()) {
      await interaction.reply({ content: '❌ Nothing is playing or it is already paused.', ephemeral: true });
      return;
    }

    await interaction.reply('⏸️ Paused.');
  },
};
