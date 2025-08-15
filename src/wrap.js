import { FetchFox } from 'fetchfox-sdk';

export const wrap = (name) => {
  return async (args, { log, reportProgress, session }) => {
    const fox = new FetchFox({
      host: process.env.FETCHFOX_HOST,
      apiKey: session.apiKey,
    });

    log.info(`FetchFox run ${name}`);

    let progress = { progress: 0, total: 100 };
    const intervalId = setInterval(() => {
      reportProgress(progress);
    }, 5_000);

    let done = false;

    try {
      const job = await fox[name].detach(args);

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
  }
}
