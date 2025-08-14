import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import * as fox from 'fetchfox-sdk';

fox.configure({
  host: 'https://dev.api.fetchfox.ai',
});

export const server = new FastMCP({
  name: 'FetchFox',
  version: '0.0.1',
});

server.addTool({
  name: 'add',
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.addTool({
  name: 'extract',
  description: 'Scraper function to extract data from a specific URL, or a list of URLs, converting it into structured data.',
  parameters: z.object({
    urls: z.array(z.string().url()),
    template: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info('FetchFox extract:', args);

    let progress = { progress: 0, total: 100 };
    const intervalId = setInterval(() => {
      reportProgress(progress);
    }, 5_000);

    let done = false;

    try {
      const job = await fox.extract.detach(args);

      job.on('progress', (data) => {
        if (done) {
          return;
        }

        if (data?.progress?.progress && data?.progress?.total) {
          const factor = 100 / data.progress.total;
          progress = {
            progress: Math.floor(data.progress.progress * factor),
            total: 100,
          };
          reportProgress(progress);
        }
      });

      const data = await job.finished();
      done = true;
      return JSON.stringify(data);

    } finally {
      clearInterval(intervalId);
    }
  },
});
