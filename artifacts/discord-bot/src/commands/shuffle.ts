import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const shuffleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Randomly shuffle the upcoming queue'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);
    const queue = player?.getQueue() ?? [];

    if (queue.length < 2) {
      await interaction.reply({
        content: '❌ Need at least 2 songs in the queue to shuffle.',
        ephemeral: true,
      });
      return;
    }

    player!.shuffle();
    await interaction.reply(`🔀 Shuffled **${queue.length}** songs in the queue.`);
  },
};
