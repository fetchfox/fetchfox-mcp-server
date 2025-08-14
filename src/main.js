import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import * as fox from 'fetchfox-sdk';

fox.configure({
  host: 'https://dev.api.fetchfox.ai',
})

const server = new FastMCP({
  name: 'FetchFox',
  version: '0.0.1',
});

server.addTool({
  name: 'extract',
  description: 'Scraper function to extract data from a specific URL, or a list of URLs, converteing it into structured data.',
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

    try {
      const job = await fox.extract.detach(args);

      job.on('progress', (data) => {
        progress = data?.progress;
        log.info('FetchFox progress:', progress);
        reportProgress(progress);
      });

      const data = await job.finished();
      return JSON.stringify(data);

    } finally {
      clearInterval(intervalId);
    }
  },
});

server.start({
  transportType: 'stdio',
});
