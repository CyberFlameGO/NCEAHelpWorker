import * as commands from './commands.js';
import dotenv from 'dotenv';
import process from 'node:process';
import { ApplicationRoleConnectionMetadataType } from 'discord-api-types/v10';

/**
 * Registers role connection/command metadata with Discord - runs separately to the bot.
 */

dotenv.config({ path: '.dev.vars' });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;

if (!token) {
  throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!applicationId) {
  throw new Error(
    'The DISCORD_APPLICATION_ID environment variable is required.'
  );
}

async function register(url, body) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
    },
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (response.ok) {
    console.log('Register success!');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error('Error during registration');
    let errorText = `Error registering: \n ${response.url}: ${response.status} ${response.statusText}`;
    try {
      const error = await response.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch (err) {
      console.error('Error reading body from request:', err);
    }
    console.error(errorText);
  }
}

// supported types: number_lt=1, number_gt=2, number_eq=3 number_neq=4, datetime_lt=5, datetime_gt=6, boolean_eq=7, boolean_neq=8
const metadata = [
  {
    key: 'cookieseaten',
    name: 'Cookies Eaten',
    description: 'Cookies Eaten Greater Than',
    type: ApplicationRoleConnectionMetadataType.IntegerGreaterThanOrEqual,
  },
  {
    key: 'allergictonuts',
    name: 'Allergic To Nuts',
    description: 'Is Allergic To Nuts',
    type: ApplicationRoleConnectionMetadataType.BooleanEqual,
  },
  {
    key: 'bakingsince',
    name: 'Baking Since',
    description: 'Days since baking their first cookie',
    type: ApplicationRoleConnectionMetadataType.DatetimeGreaterThanOrEqual,
  },
];

const cmds = Object.values(commands);

const commandEndpoint = `https://discord.com/api/v10/applications/${applicationId}/commands`;
const metadataEndpoint = `https://discord.com/api/v10/applications/${applicationId}/role-connections/metadata`;

await register(commandEndpoint, cmds);
await register(metadataEndpoint, metadata);
