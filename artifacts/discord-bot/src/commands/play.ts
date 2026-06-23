import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';
import play from 'play-dl';
import { playerManager } from '../music/PlayerManager.js';
import type { Track } from '../music/Track.js';
import type { Command } from '../types.js';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Live';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Song name or YouTube URL').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    let member: GuildMember | null = null;
    if (interaction.member instanceof GuildMember) {
      member = interaction.member;
    } else if (interaction.guild) {
      member =
        interaction.guild.members.cache.get(interaction.user.id) ??
        (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
    }

    const voiceChannel = member?.voice?.channel ?? null;

    if (!voiceChannel) {
      await interaction.reply({ content: '❌ You need to be in a voice channel first!', ephemeral: true });
      return;
    }

    // Check bot permissions in the target voice channel
    const botMember = interaction.guild?.members.me;
    const botPerms = botMember ? voiceChannel.permissionsFor(botMember) : null;
    console.log(`[Voice] Bot perms in #${voiceChannel.name}: Connect=${botPerms?.has('Connect')}, Speak=${botPerms?.has('Speak')}, Admin=${botPerms?.has('Administrator')}`);

    if (botPerms && !botPerms.has('Connect') && !botPerms.has('Administrator')) {
      await interaction.reply({
        content: `❌ I don't have permission to join **${voiceChannel.name}**. Please give me the **Connect** and **Speak** permissions in that channel (or grant me Administrator).`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString('query', true);

    try {
      let url: string;
      let title: string;
      let duration = 'Unknown';
      let thumbnail: string | undefined;

      const isUrl = play.yt_validate(query) === 'video';

      if (isUrl) {
        const info = await play.video_info(query);
        const v = info.video_details;
        url = v.url;
        title = v.title ?? 'Unknown';
        duration = formatDuration(v.durationInSec ?? 0);
        thumbnail = v.thumbnails[0]?.url;
      } else {
        const results = await play.search(query, { source: { youtube: 'video' }, limit: 1 });
        if (!results.length) {
          await interaction.editReply('❌ No results found.');
          return;
        }
        const v = results[0];
        url = v.url;
        title = v.title ?? 'Unknown';
        duration = formatDuration(v.durationInSec ?? 0);
        thumbnail = v.thumbnails[0]?.url;
      }

      const track: Track = { title, url, duration, thumbnail, requestedBy: interaction.user };

      const player = playerManager.getOrCreate(interaction.guildId!);
      if (!player.isConnected()) {
        await player.join(voiceChannel);
      }
      await player.addTrack(track);

      const queue = player.getQueue();
      const isNowPlaying = player.getCurrentTrack()?.url === url;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(isNowPlaying ? '🎵 Now Playing' : '➕ Added to Queue')
        .setDescription(`**[${title}](${url})**`)
        .addFields(
          { name: 'Duration', value: duration, inline: true },
          { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: true }
        );

      if (!isNowPlaying) {
        embed.addFields({ name: 'Position in Queue', value: `#${queue.length}`, inline: true });
      }

      if (thumbnail) embed.setThumbnail(thumbnail);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[play] Error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await interaction.editReply(`❌ Failed to play: ${msg}`);
    }
  },
};
