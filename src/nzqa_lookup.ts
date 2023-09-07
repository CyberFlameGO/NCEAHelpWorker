import { CheerioAPI, Cheerio, Element, load, AnyNode } from 'cheerio';
import {
  APIEmbed,
  APIEmbedField,
  RESTPostAPIInteractionFollowupJSONBody,
} from 'discord-api-types/v10';

async function follow_up(
  body: RESTPostAPIInteractionFollowupJSONBody,
  applicationId: string,
  token: string
) {
  await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}

export async function lookup(
  applicationId: string,
  token: string,
  standardNumber: number,
  paperYear?: number
): Promise<void> {
  const standardUri: string = `https://www.nzqa.govt.nz/ncea/assessment/view-detailed.do?standardNumber=${standardNumber}`;

  // EXTERNAL DATE LOGIC BEGIN
  const currentYear: number = new Date().getFullYear();
  let year: number = currentYear - 2;
  var yearDefault: boolean = true;

  if (paperYear && paperYear >= (paperYear - 3) && paperYear <= currentYear) {
    year = paperYear;
    yearDefault = false;
  }
  const examPaperData: string = `[AS${standardNumber}'s exam paper (${year}, PDF)](https://www.nzqa.govt.nz/nqfdocs/ncea-resource/exams/${year}/${standardNumber}-exm-${year}.pdf)`;
  // const answersUrl = `https://www.nzqa.govt.nz/nqfdocs/ncea-resource/exams/${year}/${standard}-ass-${year}.pdf`;
  // todo: potentially add resource booklets, and for all of these URLs run fetch and see if it returns 404 or the pdf
  let examPaperFieldName: string;
  if (yearDefault)
    examPaperFieldName = `Examination Paper (defaulting to resources for ${year} as unspecified/invalid)`;
  else
    examPaperFieldName = `Examination Paper (resources for year ${year})`;

  // EXTERNAL DATE LOGIC END

  const cacheKey: string = new URL(standardUri).toString(); // Use a valid URL for cacheKey
  const cache: Cache = caches.default;
  const cachedResponse: Response | undefined = await cache.match(cacheKey);

  if (cachedResponse) {
    console.log('Cache hit');
    const cachedJson = (await cachedResponse.json()) as RESTPostAPIInteractionFollowupJSONBody;

    // Allows for flexibility regarding external paper year
    const cachedEmbedFields: APIEmbedField[] = cachedJson.embeds![0].fields!;
    const examPaperIndex: number = cachedEmbedFields.findIndex(predicate => predicate.name.includes('Examination Paper'));
    if (examPaperIndex !== -1) {
      cachedEmbedFields[examPaperIndex].name = examPaperFieldName;
      cachedEmbedFields[examPaperIndex].value = examPaperData;
    }
    // Use cached response if it exists
    await follow_up(
      cachedJson,
      applicationId,
      token
    );
    return;
  }

  const response: Response = await fetch(standardUri, {
    cf: {
      cacheTtl: 28800, // 8 hours
      cacheEverything: true,
    },
  });
  if (!response.ok) {
    const followupData: RESTPostAPIInteractionFollowupJSONBody = {
      content: `An error occurred! Response code: ${response.status}\nIf this repetitively occurs and NZQA is not having an outage, message \`cyberflameu\`.`,
    };
    await follow_up(followupData, applicationId, token);
    return;
  }
  const data: string = await response.text();
  const $: CheerioAPI = load(data); // perhaps look at moving off cheerio to htmlrewriter

  const h3Elements: Cheerio<Element> = $('div[id="mainPage"] h3');
  const list: string[] = h3Elements
    .map((index: number, element: Element) => $(element).text())
    .get();

  const standardDetails: string[] = $('table[class="noHover"] *')
    .contents()
    .map((index: number, element: AnyNode): string =>
      element.type === 'text' ? $(element).text() : ''
    )
    .get()
    .join(' ')
    .replace(/undefined|-|website|\s\s+/g, ' ')
    .replace(/(\r\n|\n|\r)/gm, '')
    .split(' ')
    .filter((value: string) => value !== '');

  const standardFile: string[] = $(
    '#mainPage > table.tableData.noHover > tbody > tr:nth-child(2) *'
  )
    .contents()
    .map((index: number, element: AnyNode) =>
      element.type === 'text' ? $(element).text() : ''
    )
    .get()
    .join(' ')
    .replace(/undefined|-|website|\s\s+/g, ' ')
    .replace(/(\r\n|\n|\r)/gm, '')
    .split(' ')
    .filter((value: string): boolean => value !== '');

  if (standardDetails[8] === 'undefined') {
    standardDetails.splice(8, 1);
  }
  const [standardName]: string[] = list.slice(1);

  const level: string = standardDetails[7];
  const credits: string = standardDetails[5];
  const assessment: string = standardDetails[6];

  try {
    const embedJson: APIEmbed = {
      color: 0x0099ff,
      title: `Standard ${standardNumber}`,
      description: `[${standardName}](${standardUri})`,
      fields: [
        { name: 'Level', value: level, inline: true },
        { name: 'Credits', value: credits, inline: true },
        {
          name: 'Assessment',
          value: assessment.replace(' ', ''),
          inline: false,
        },
      ],
      footer: {
        text: applicationId,
        icon_url: `https://cdn.discordapp.com/avatars/${applicationId}/c8ee73d8401a7a112512ea81a87c4cbd.png`,
      },
      timestamp: new Date().toISOString(),
    };

    if (Array.isArray(standardFile)) {
      if (standardFile.includes('Achievement')) {
        const asYear: string = standardFile[2];
        const isNum: boolean = /^\d+$/.test(asYear);

        if (asYear != undefined && isNum) {
          embedJson.fields!.push({
            name: 'Achievement Standard',
            value: `[AS${standardNumber} (${asYear}, PDF)](https://www.nzqa.govt.nz/nqfdocs/ncea-resource/achievements/${asYear}/as${standardNumber}.pdf)`,
            inline: false,
          });
        } else {
          embedJson.fields!.push({
            name: 'Achievement Standard',
            value: `No File Found`,
            inline: false,
          });
        }
      } else if (standardFile.includes('Unit')) {
        embedJson.fields!.push({
          name: 'Unit Standard',
          value: `[US${standardNumber} (PDF)](https://www.nzqa.govt.nz/nqfdocs/units/pdf/${standardNumber}.pdf)`,
          inline: false,
        });
      } else {
        embedJson.fields!.push({
          name: 'Standard specification',
          value: 'No File Found',
          inline: false,
        });
      }
    }

    if (assessment === 'External') {
      embedJson.fields!.push({
        name: examPaperFieldName,
        value: examPaperData,
        inline: false,
      });

      // { name: 'Answers to Paper', value: answersUrl }
    }

    const followupData: RESTPostAPIInteractionFollowupJSONBody = {
      embeds: [embedJson],
    };

    // perhaps look at using the discord-api-methods interactionskit package for these if i end up needing to use them for something else

    await follow_up(followupData, applicationId, token);

    const cacheResponse: Response = new Response(JSON.stringify(followupData), {
      headers: {
        'content-type': 'application/json',
        'Cache-Control':
          'public, max-age=7200, stale-while-revalidate=7200, stale-if-error=86400',
      },
    });
    await cache.put(cacheKey, cacheResponse);
  } catch (error) {
    const followupData: RESTPostAPIInteractionFollowupJSONBody = {
      content:
        'Please enter a valid standard! (</lookup:1137896912020840599>)\nIf you believe this is a mistake, message `cyberflameu`.',
    };
    await follow_up(followupData, applicationId, token);
  }
  return;
}
