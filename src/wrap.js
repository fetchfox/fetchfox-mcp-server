import { FetchFox } from 'fetchfox-sdk';
// import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const wrap = (name) => {
  return async (params, options) => {
    const reportProgress = (progress) => {
      if (options._meta?.progressToken) {
        options.sendNotification({
          method: 'notifications/progress',
          params: { ...progress, progressToken: options._meta.progressToken }
        });
      }
    }

    let progress = { progress: 0, total: 100 };
    const intervalId = setInterval(() => {
      reportProgress(progress);
    }, 5_000);

    const handleProgress = (data) => {
      if (data?.progress?.progress && data?.progress?.total) {
        const factor = 100 / data.progress.total;
        progress = {
          progress: Math.floor(data.progress.progress * factor),
          total: 100,
        };
        reportProgress(progress);
      }
    };

    let job;

    try {
      const fox = new FetchFox({
        host: process.env.FETCHFOX_HOST,
        apiKey: process.env.FETCHFOX_API_KEY,
      });

      console.log(`Run "${name}" on ${JSON.stringify(params).substring(0, 100000)}`);
      job = await fox[name].detach(params);
      job.on('progress', handleProgress);
      console.log(`Job started: ${job.id}`);
      const data = await job.finished();
      console.log(`Job finished: ${job.id}`);

      const output = {};
      if (['crawl', 'scrape'].includes(name)) {
        output.hits = data.results.hits || [];
      }
      if (['extract', 'scrape'].includes(name)) {
        output.items = data.results.items || [];
      }

      console.log('Returning:', output);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(output),
        }],
        structuredContent: output,
      };
    } finally {
      clearInterval(intervalId);
      job?.off('progress', handleProgress);
    }
  }
};
