import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const leaveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.isConnected()) {
      await interaction.reply({ content: "❌ I'm not in a voice channel.", ephemeral: true });
      return;
    }

    playerManager.delete(interaction.guildId!);
    await interaction.reply('👋 Left the voice channel. See you next time!');
  },
};
