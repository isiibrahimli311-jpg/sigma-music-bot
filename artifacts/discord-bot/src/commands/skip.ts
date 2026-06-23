import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);
    const current = player?.getCurrentTrack();

    if (!current) {
      await interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
      return;
    }

    player!.skip();
    await interaction.reply(`⏭️ Skipped **${current.title}**.`);
  },
};
