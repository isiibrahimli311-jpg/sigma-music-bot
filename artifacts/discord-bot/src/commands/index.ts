import { Collection } from 'discord.js';
import type { Command } from '../types.js';
import { leaveCommand } from './leave.js';
import { loopCommand } from './loop.js';
import { shuffleCommand } from './shuffle.js';
import { volumeCommand } from './volume.js';
import { nowplayingCommand } from './nowplaying.js';
import { pauseCommand } from './pause.js';
import { playCommand } from './play.js';
import { queueCommand } from './queue.js';
import { resumeCommand } from './resume.js';
import { skipCommand } from './skip.js';
import { stopCommand } from './stop.js';

export const commands = new Collection<string, Command>([
  [playCommand.data.name, playCommand],
  [skipCommand.data.name, skipCommand],
  [stopCommand.data.name, stopCommand],
  [queueCommand.data.name, queueCommand],
  [pauseCommand.data.name, pauseCommand],
  [resumeCommand.data.name, resumeCommand],
  [loopCommand.data.name, loopCommand],
  [shuffleCommand.data.name, shuffleCommand],
  [volumeCommand.data.name, volumeCommand],
  [nowplayingCommand.data.name, nowplayingCommand],
  [leaveCommand.data.name, leaveCommand],
]);
