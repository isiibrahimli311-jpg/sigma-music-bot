import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const queueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);
    const current = player?.getCurrentTrack() ?? null;
    const queue = player?.getQueue() ?? [];

    if (!current && queue.length === 0) {
      await interaction.reply({ content: '📭 The queue is empty.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🎵 Music Queue');

    if (current) {
      const status = player?.isPaused() ? '⏸️ Paused' : '▶️ Playing';
      embed.addFields({
        name: `${status}`,
        value: `**[${current.title}](${current.url})** — \`${current.duration}\``,
      });
    }

    if (queue.length > 0) {
      const shown = queue.slice(0, 10);
      const lines = shown.map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) — \`${t.duration}\``);
      embed.addFields({
        name: `Up Next — ${queue.length} song${queue.length === 1 ? '' : 's'}`,
        value: lines.join('\n'),
      });
      if (queue.length > 10) {
        embed.setFooter({ text: `…and ${queue.length - 10} more` });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
