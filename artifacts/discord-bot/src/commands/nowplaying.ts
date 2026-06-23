import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { playerManager } from '../music/PlayerManager.js';
import type { Command } from '../types.js';

export const nowplayingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show what is currently playing'),

  async execute(interaction: ChatInputCommandInteraction) {
    const player = playerManager.get(interaction.guildId!);
    const track = player?.getCurrentTrack();

    if (!track) {
      await interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
      return;
    }

    const status = player?.isPaused() ? '⏸️ Paused' : '🎵 Now Playing';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(status)
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: 'Duration', value: track.duration, inline: true },
        { name: 'Requested by', value: `<@${track.requestedBy.id}>`, inline: true }
      );

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);

    await interaction.reply({ embeds: [embed] });
  },
};
