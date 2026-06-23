import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Guild,
  REST,
  Routes,
  TextChannel,
  type Interaction,
} from 'discord.js';
import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('DISCORD_TOKEN is not set');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const rest = new REST().setToken(token);

client.once('clientReady', async (c) => {
  console.log(`✅ Logged in as ${c.user.tag} (${c.user.id})`);

  const commandData = [...commands.values()].map((cmd) => cmd.data.toJSON());
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commandData });
    console.log(`✅ Registered ${commandData.length} slash commands globally`);
    console.log('   Commands: ' + [...commands.keys()].join(', '));
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

client.on('guildCreate', async (guild: Guild) => {
  console.log(`📥 Joined new server: ${guild.name} (${guild.id})`);

  const channel =
    (guild.systemChannel?.permissionsFor(guild.members.me!)?.has('SendMessages')
      ? guild.systemChannel
      : null) ??
    guild.channels.cache
      .filter(
        (c): c is TextChannel =>
          c.isTextBased() &&
          c instanceof TextChannel &&
          (c.permissionsFor(guild.members.me!)?.has('SendMessages') ?? false)
      )
      .sort((a, b) => a.position - b.position)
      .first() ??
    null;

  if (!channel) {
    console.warn(`⚠️ Could not find a channel to send welcome message in ${guild.name}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('👋 Thanks for adding SigmaMusic!')
    .setDescription(
      "I'm your new music bot — I can play any song from YouTube directly in your voice channels."
    )
    .addFields(
      {
        name: '🎵 Get started',
        value: 'Join a voice channel and use `/play <song name or URL>` to start the music!',
      },
      {
        name: '📋 All commands',
        value: [
          '`/play` — search & play from YouTube',
          '`/skip` — skip the current song',
          '`/stop` — stop & clear the queue',
          '`/queue` — see what\'s coming up',
          '`/pause` / `/resume` — pause and resume',
          '`/loop` — loop a track or the whole queue',
          '`/nowplaying` — see what\'s on',
          '`/leave` — disconnect from the channel',
        ].join('\n'),
      }
    )
    .setFooter({ text: 'Slash commands may take a few minutes to appear — hang tight!' });

  try {
    await channel.send({ embeds: [embed] });
    console.log(`✅ Sent welcome message to #${channel.name} in ${guild.name}`);
  } catch (err) {
    console.error(`❌ Failed to send welcome message in ${guild.name}:`, err);
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Error in /${interaction.commandName}:`, err);
    const payload = { content: '❌ Something went wrong executing that command.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(console.error);
    } else {
      await interaction.reply(payload).catch(console.error);
    }
  }
});

void (async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sodium = require('libsodium-wrappers') as { ready: Promise<void> };
    await sodium.ready;
    console.log('✅ libsodium initialised');
  } catch (err) {
    console.warn('⚠️ libsodium-wrappers init error:', err);
  }

  client.login(token).catch((err) => {
    console.error('❌ Failed to log in:', err);
    process.exit(1);
  });
})();
