import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const resumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume a paused song'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.resume()) {
      await interaction.reply({ content: '❌ Nothing is paused right now.', ephemeral: true });
      return;
    }

    await interaction.reply('▶️ Resumed.');
  },
};
