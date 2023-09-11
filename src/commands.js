/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export const REVIVE_COMMAND = {
  name: 'revive',
  description:
    'Revival ping command, executable by members of the Promotions Team',
};

export const TEST_COMMAND = {
  name: 'test',
  description: 'This command serves no purpose.',
};

export const PING_COMMAND = {
  name: 'ping',
  description: 'Check latency stats of the bot.',
};

export const LOOKUP_COMMAND = {
  description: 'Get detailed information on a standard!',
  name: 'lookup',
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'standard_number',
      description: 'Standard number to look up information for.',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'exam_year',
      description:
        '(If external) Year to link paper for - if unspecified defaults to paper from two years ago.',
    },
  ],
};
