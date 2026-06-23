import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

function volumeBar(percent: number): string {
  const filled = Math.round(percent / 10);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

function volumeEmoji(percent: number): string {
  if (percent === 0) return '🔇';
  if (percent <= 50) return '🔈';
  if (percent <= 100) return '🔉';
  return '🔊';
}

export const volumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Check or set the playback volume')
    .addIntegerOption((opt) =>
      opt
        .setName('level')
        .setDescription('Volume level (0–200, default 100)')
        .setMinValue(0)
        .setMaxValue(200)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);

    if (!player?.isConnected()) {
      await interaction.reply({ content: "❌ I'm not in a voice channel.", ephemeral: true });
      return;
    }

    const level = interaction.options.getInteger('level');

    if (level === null) {
      const current = player.getVolume();
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${volumeEmoji(current)} Current Volume`)
        .setDescription(`**${current}%**\n\`${volumeBar(current)}\``);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    player.setVolume(level);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${volumeEmoji(level)} Volume set to ${level}%`)
      .setDescription(`\`${volumeBar(level)}\``);

    await interaction.reply({ embeds: [embed] });
  },
};
