import { FastMCP } from 'fastmcp';
import { z } from 'zod';

import { wrap } from './wrap.js';

export const server = new FastMCP({
  name: 'FetchFox',
  version: '0.0.1',
  authenticate: (req) => {
    let apiKey;

    if (process.env.FETCHFOX_API_KEY) {
      apiKey = process.env.FETCHFOX_API_KEY;
    }

    if (req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      apiKey = parts[1];
    }

    if (!apiKey) {
      throw new Response(null, {
        status: 401,
        statusText: 'API key is required. Find your API key at https://fetchfox.ai/dashboard, and include it as a bearer token or in the FETCHFOX_API_KEY environment variable.',
      });
    }

    return { apiKey };
  },
});

const crawlParams = {
  pattern: z.string().describe(`A URL pattern that can include * and ** wildcards. This URL pattern defines what URLs will be searched for. The * wildcard matches any character except /, and the ** wildcard matches any character including /.

Examples:

- The pattern https://example.com/** will search for all URLs the domain example.com.
- The pattern https://example.com/books/* will find all URLs directly under /books on example.com
`),
  startUrls: z.array(z.string().url()).optional().describe(`If defined, the crawler will start at these URLs.

All starting URLs have a depth of 0, the pages they link to have a depth of 1, and so on.

If no starting URLs are provided, FetchFox will determine a random set of starting URLs.`),
  maxVisits: z.number().int().min(1).optional().describe(`The maximum number of URLs to visit before ending the crawl.`),
  maxDepth: z.number().int().min(0).optional().describe(`The maximum depth from the starting URLs to crawl. Only used if startUrls is defined.`),
  crawlStrategy: z.enum(['dfs', 'bfs', 'random']).optional().describe(`Specify how the crawler orders which URLs to visit. dfs = depth first search, bfs = breadth first search, random = pick randomly. Default is random.`)
};

const extractParams = {
  urls: z.array(z.string().url()).describe(`The URLs that are targetted for scraping. Each URL will be visited by FetchFox, and the contents of the page will be extracted into structured data based on the user provided template`),
  template: z.union([
    z.string().describe(`If template is a string, the AI will automatically determine the fields in the output object.`),
    z.object().describe(`If template is an object, the output fields will match the keys in the template.`),
  ]).describe(`Output data format. The URLs you gave will be convered into structured data based on the template.`),

  contentTransform: z.enum(['slim_html', 'full_html', 'text_only', 'json_only', 'reduce']).optional().describe(`If defined, this tells FetchFox how to reduce the size of the HTML it sees on each page it visits.

- "full_html": Keep all the HTML execept what is inside script and style tages. Use this if there are issues around missing data. This send many tokens to the LLM, so it it expensive.
- "slim_html": Keep only text, links, and images. This is default and a good safe bet and balance cost and data coverage.
- "text_only": Keep only the text on the page. A good low cost mode.
- "json_only": Keep only JSON objects on the page. Avoid using this unless you know the data you want is in JSON on the page.
- "reduce": Use AI to write JavaScript code that picks relevant parts of the page. This takes a while, so only use it if you are sure this is what you want.

The default slim_html is usually good.`),
};

const scrapeParams = { ...crawlParams, ...extractParams };
delete scrapeParams.urls;

server.addTool({
  name: 'echo',
  description: 'Echo back a message',
  parameters: z.object({
    message: z.string(),
  }),
  execute: async (args) => {
    return String(args.message);
  },
});

server.addTool({
  name: 'crawl',
  description: 'Crawl a website for URLs that based on a URL pattern',
  parameters: z.object({ ...crawlParams }),
  execute: wrap('crawl'),
});

server.addTool({
  name: 'extract',
  description: 'Scrape data from a specific URL, or a list of URLs, converting it into structured data.',
  parameters: z.object({ ...extractParams }),
  execute: wrap('extract'),
});

server.addTool({
  name: 'scrape',
  description: 'Scrape data based on a URL pattern, converting URLs that match the pattern into structured data.',
  parameters: z.object({ ...scrapeParams }),
  execute: wrap('scrape'),
});
