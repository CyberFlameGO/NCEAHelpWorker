import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import {
  InteractionResponseType,
  InteractionType,
  // InteractionResponseFlags,
} from 'discord-interactions';
import * as command from '../src/commands.js';
import sinon from 'sinon';
import server from '../src/server.js';
import * as verify from 'discord-verify/.';

const base = 'https://discord.worker.nceahelp.com';
const applicationId = '1045608895307067453';

interface Body {
  [x: string]: any;
  type: number;
  data: {
    content: string;
    flags: number;
  };
}

describe('Server', () => {
  describe('GET /', () => {
    it('should return a greeting message with the Discord application ID', async () => {
      const request = new Request(new URL('/', base).toString(), { method: 'GET' });
      const env = { DISCORD_APPLICATION_ID: applicationId };

      const response = await server.fetch(request, env);
      const body = await response.text();

      expect(body).to.equal('👋 ' + applicationId);
    });
  });

  describe('POST /interactions', () => {
    let verifyDiscordRequestStub: sinon.SinonStub<any[], any>;

    beforeEach(() => verifyDiscordRequestStub = sinon.stub(verify, 'isValidRequest'));

    afterEach(() => {
      verifyDiscordRequestStub.restore();
    });

    it('should handle a PING interaction', async () => {
      const interaction = {
        type: InteractionType.PING,
      };

      const request = new Request(new URL('/interactions', base).toString(), { method: 'GET' });

      const env = {};

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, env);
      const body = await response.json() as Body;
      expect(body.type).to.equal(InteractionResponseType.PONG);
    });

    // it('should handle a revive command interaction', async () => {
    //   const interaction = {
    //     type: InteractionType.APPLICATION_COMMAND,
    //     data: {
    //       name: command.REVIVE_COMMAND.name,
    //     },
    //   };

    //   const request = {
    //     method: 'POST',
    //     url: new URL('/interactions', base),
    //   };

    //   const env = {};

    //   verifyDiscordRequestStub.resolves({
    //     isValid: true,
    //     interaction: interaction,
    //   });

    //   const response = await server.fetch(request, env);
    //   const body = await response.json();
    //   expect(body.type).to.equal(
    //     InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
    //   );
    // });

    // it('should handle a test command interaction', async () => {
    //   const interaction = {
    //     type: InteractionType.APPLICATION_COMMAND,
    //     data: {
    //       name: command.TEST_COMMAND.name,
    //     },
    //   };

    //   const request = {
    //     method: 'POST',
    //     url: new URL('/interactions', base),
    //   };

    //   const env = {
    //     DISCORD_APPLICATION_ID: '1045608895307067453',
    //   };

    //   verifyDiscordRequestStub.resolves({
    //     isValid: true,
    //     interaction: interaction,
    //   });

    //   const response = await server.fetch(request, env);
    //   const body = await response.json();
    //   expect(body.type).to.equal(
    //     InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
    //   );
    //   expect(body.data.content).to.include(
    //     'https://discord.com/oauth2/authorize?client_id=1045608895307067453&scope=applications.commands+bot&permissions=8'
    //   );
    //   expect(body.data.flags).to.equal(InteractionResponseFlags.EPHEMERAL);
    // });

    it('should handle a ping command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: command.PING_COMMAND.name,
        },
      };

      const request = new Request(new URL('/interactions', base).toString(), { method: 'GET' });

      const env = {
        DISCORD_APPLICATION_ID: applicationId,
      };

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, env);
      const body = await response.json() as Body;
      expect(body.type).to.equal(
        InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE
      );
      expect(body.data.content).to.include('Pong!');
      // expect(body.data.flags).to.equal(InteractionResponseFlags.EPHEMERAL);
    });

    it('should handle an unknown command interaction', async () => {
      const interaction = {
        type: InteractionType.APPLICATION_COMMAND,
        data: {
          name: 'unknown',
        },
      };

      const request = new Request(new URL('/interactions', base).toString(), { method: 'GET' });

      verifyDiscordRequestStub.resolves({
        isValid: true,
        interaction: interaction,
      });

      const response = await server.fetch(request, {});
      const body = await response.json() as Body;
      expect(response.status).to.equal(400);
      expect(body.error).to.equal('Unknown Type');
    });
  });

  describe('All other routes', () => {
    it('should return a "Not Found" response', async () => {
      const request = new Request(new URL('/interactions', base).toString(), { method: 'GET' });
      const response = await server.fetch(request, {});
      expect(response.status).to.equal(404);
      const body = await response.text();
      expect(body).to.equal('Not Found.');
    });
  });
});
