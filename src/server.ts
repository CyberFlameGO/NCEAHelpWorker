import { Hono } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';
import {
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKey,
} from 'discord-interactions';
import * as commands from './commands.js';
import { lookup } from './nzqa_lookup.js';
import * as discordJs from 'discord-api-types/v10';
import * as storage from './storage.js';
import * as discord from './discord.js';
import { Bindings } from './worker-configuration.js';


const router = new Hono<{ Bindings: Bindings }>();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (c) => {
  return new Response(`👋 ${c.env.DISCORD_APPLICATION_ID}`);
});

// eslint-disable-next-line no-unused-vars
router.post('/interactions', async (c) => {
  const signature = c.req.header('x-signature-ed25519')!;
  const timestamp = c.req.header('x-signature-timestamp')!;
  const body = await c.req.text();
  if (!(await verifyKey(body, signature as string, timestamp, c.env.DISCORD_PUBLIC_KEY)))
   return new Response('Invalid request', { status: 401 });
  const interaction: discordJs.APIInteraction =
    (await c.req.json()) as discordJs.APIInteraction;

  switch (interaction.type) {
    case discordJs.InteractionType.Ping: {
      // The `PING` message is used during the initial webhook handshake, and is
      // required to configure the webhook in the developer portal.
      return c.json({ type: InteractionResponseType.PONG });
    }

    case discordJs.InteractionType.ModalSubmit: {
      // The `MODAL_SUBMIT` message is sent when a user submits a modal form.

      // console.log(JSON.stringify(interaction, null, 2))
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Modal content successfully submitted!',
        },
      });
    }

    case discordJs.InteractionType.ApplicationCommand: {
      // Most user commands will come as `APPLICATION_COMMAND`.
      switch (interaction.data.name.toLowerCase()) {
        // Revive ping command - checks if a user has a role and pings a role if they do
        case commands.REVIVE_COMMAND.name.toLowerCase(): {
          if (
            interaction.member &&
            interaction.member.roles.includes('909724765026148402')
          ) {
            console.log('handling revive request');
            return c.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  "Hey there <@&879527848573042738> squad, it's time to make the chat active!",
                allowed_mentions: {
                  roles: ['879527848573042738'],
                },
              },
            });
          }
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                'You do not have the correct role necessary to perform this action. If you believe this is an error, please contact CyberFlame United#0001 (<@218977195375329281>).',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
        // Test command - for testing
        case commands.TEST_COMMAND.name.toLowerCase(): {
          return c.json({
            type: InteractionResponseType.MODAL,
            data: {
              custom_id: 'test',
              title: 'Test',
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: 'name',
                      label: 'Name',
                      style: 1,
                      min_length: 1,
                      max_length: 4000,
                      placeholder: 'Bob',
                      required: true,
                    },
                  ],
                },
              ],
            },
          });
        }
        case commands.LOOKUP_COMMAND.name.toLowerCase(): {
          if (
            interaction.data &&
            'options' in interaction.data &&
            interaction.data.options
          ) {
            const standardNumber = interaction.data
              .options[0] as discordJs.APIApplicationCommandInteractionDataNumberOption;
            const paperYear:
              | discordJs.APIApplicationCommandInteractionDataNumberOption
              | undefined = interaction.data
              .options[1] as discordJs.APIApplicationCommandInteractionDataNumberOption;
            c.executionCtx.waitUntil(
              lookup(
                interaction.application_id,
                interaction.token,
                standardNumber.value,
                paperYear?.value
              )
            );
            return c.json({
              type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            });
          } else {
            return c.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: "I'm sorry, I don't recognize that command.",
              },
            });
          }
        }

        // Ping command - for checking latency of the bot, returned as a non-ephemeral message
        case commands.PING_COMMAND.name.toLowerCase(): {
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Pong! Latency: ${
                Date.now() -
                Math.round(Number(interaction.id) / 4194304 + 1420070400000)
              }ms (rounded to nearest integer)`,
            },
          });
        }
        default:
          return c.json({ error: 'Unknown Type' }, { status: 400 });
      }
    }
  }

  console.error('Unknown Type');
  return c.json({ error: 'Unknown Type' }, { status: 400 });
});

router.get('/linked-roles', async (c) => {
  const { url, state } = discord.getOAuthUrl(c.env);

  await setSignedCookie(c, 'client_state', state, c.env.COOKIE_SECRET, {
    maxAge: 1000 * 60 * 5,
    secure: true,
  });
  return c.redirect(url);
});

async function updateMetadata(userId: discordJs.Snowflake, env: Bindings) {
  // Fetch the Discord tokens from storage
  const tokens = (await storage.getDiscordTokens(
    userId,
    env.TOKEN_STORE
  )) as storage.Tokens;

  let metadata;
  try {
    // Fetch the new metadata you want to use from an external source.
    // This data could be POST-ed to this endpoint, but every service
    // is going to be different.  To keep the example simple, we'll
    // just generate some random data.
    metadata = {
      cookieseaten: 1483,
      allergictonuts: 0, // 0 for false, 1 for true
      firstcookiebaked: '2003-12-20',
    };
  } catch (e) {
    metadata = {};
    console.error(e);
    // If fetching the profile data for the external service fails for any reason,
    // ensure metadata on the Discord side is nulled out. This prevents cases
    // where the user revokes an external app permissions, and is left with
    // stale linked role data.
  }

  // Push the data to Discord.
  await discord.pushMetadata(userId, tokens, metadata, env);
}

router.get('/oauth-callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (
      (await getSignedCookie(c, c.env.COOKIE_SECRET, 'client_state')) !== state
    )
      return c.text('state verification failed', 403);

    const tokens = await discord.getOAuthTokens(code, c.env);
    if (!tokens) return c.text('failed to fetch tokens', 500);

    const data = await discord.getUserData(tokens);
    if (!data || !data.user) return c.text('failed to fetch user data', 500);

    await storage.storeDiscordTokens(
      data.user.id,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: Date.now() + tokens.expires_in * 1000,
      },
      c.env.TOKEN_STORE
    );

    await updateMetadata(data.user.id, c.env);

    return c.text('connected! you may now close this window');
  } catch (e) {
    console.log(e);

    return c.text('oh uh, something wrong happened', 500);
  }
});

router.post('/webhooks', async (c) => {
  const signature = c.req.header('x-signature-ed25519')!;
  const timestamp = c.req.header('x-signature-timestamp')!;
  const body = await c.req.text();
  if (!(await verifyKey(body, signature as string, timestamp, c.env.DISCORD_PUBLIC_KEY)))
   return new Response('Invalid request', { status: 401 });
  const interaction = await c.req.json();

  switch (interaction["type"]) {
    case 0:
      return new Response(null, { status: 204 })

    case 1:
      switch (interaction["event"]["type"]) {
          case 'APPLICATION_AUTHORIZED':
            switch (interaction["event"].data.integration_type) {
              case 0: /*Guild Install*/ break;
              case 1: /*User Install*/ break;
              // Default case for things like website login
            }
            break;
          case 'ENTITLEMENT_CREATE': break;
          case 'QUEST_USER_ENROLLMENT': break;
       }
       return new Response(null, { status: 204 });
     default:
				return new Response('invalid request', { status: 400 });
  }
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
