import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { wrap } from './wrap.js';

const extractParams = {
  urls: z.array(z.string().url()).describe(`The URLs that are targetted for scraping. Each URL will be visited by FetchFox, and the contents of the page will be extracted into structured data based on the user provided template`),
  template: z.string().describe(`Data output format. The URLs you provided will be turned into structured data based on the template.

This can be a natural language string like "Find the name and email of the employee", or a stringified JSON dictionary, like {"name": "Name of the employee", "email": "Email address of the employee", "reports": "List of names of direct reports"}.

If you know the specific fields you wants, uses the JSON dictionary approach so that the response format is predictable.`),

};

const crawlParams = {
  pattern: z.string().describe(`A URL pattern that can include * and ** wildcards. This URL pattern defines what URLs will be searched for. The * wildcard matches any character except /, and the ** wildcard matches any character including /.

Examples:

- The pattern https://example.com/** will search for all URLs the domain example.com.
- The pattern https://example.com/books/* will find all URLs directly under /books on example.com
`),
  startUrls: z.array(z.string().url()).optional().describe(`(optional): If defined, the crawler will start at these URLs.

All starting URLs have a depth of 0, the pages they link to have a depth of 1, and so on.

If no starting URLs are provided, FetchFox will determine a random set of starting URLs.`),

  maxVisits: z.number().int().min(1).optional().describe(`(optional): The maximum number of URLs to visit before ending the crawl.

It is a good idea to limit this to 100-500 or so, unless you are confident you want to run a really large scrape.`),
  maxDepth: z.number().int().min(0).optional().describe(`(optional): The maximum depth from the starting URLs to crawl. Only used if startUrls is defined.

To find only URLs linked from the starting URLs, set maxDepth = 0. This is a common setting to do something like scrape all the detail pages linked from a listing page.`),
};

const scrapeParams = {
  ...crawlParams,
  ...extractParams,
  maxExtracts: z.number().int().min(1).optional().describe(`(optional): The maximum number of extractions to run. If not provided, every URL found will be passed along for extraction.

It is a good idea to limit this to around 100 or so unless you are confident you want torun a really large scrape.`),
};
delete scrapeParams.urls;


const crawlOutput = {
  hits: z.array(z.string().url()).describe(`URLs matching the pattern`),
};

const extractOutput = {
  items: z.array(z.object({}).passthrough()).describe(`Structured data ouput.`)
};

const scrapeOutput = { ...crawlOutput, ...extractOutput };

export const server = new McpServer({
  name: 'FetchFox',
  version: '0.0.1',
});

server.registerTool(
  'echo',
  {
    title: 'Echo Message Tool',
    description: 'Echo back a message',
    inputSchema: {
      message: z.string(),
    },
  },
  async ({ message }) => ({
    content: [{ type: 'text', text: String('Echo: ' + message) }]
  })
);

server.registerTool(
  'crawl',
  {
    title: 'Web Crawling Tool',
    description: `Find URLs based on a URL pattern.

Use this tool when you want to find URLs based on a URL pattern, and you don't need to convert them into structured data.

Unlike extract and scrape, crawl does not convert into structured data.

This tool can be thought of as a web scraping tool that finds URLs.`,
    inputSchema: crawlParams,
    outputSchema: crawlOutput,
  },
  wrap('crawl')
);

server.registerTool(
  'extract',
  {
    title: 'Web Data Extraction Tool',
    description: `Convert URL(s) into structured data.

Use this tool when you already have one or more specific URLs, and you want to convert those URLs into structured data.

Unlike crawl and scrape, extact works on a list of URL(s). It does not look for new URLs.

This tool can be thought of as a web scraping tool for a specific set of URLs.`,
    inputSchema: extractParams,
    outputSchema: extractOutput,
  },
  wrap('extract')
);

server.registerTool(
  'scrape',
  {
    title: 'Web Scraping Tool',
    description: `Find URLs based on a URL pattern, and convert all of those URLs into structured data.

This tool is a combiantion of FetchFox's crawl and extract. It first crawls for URLs based on the URL pattern provided, and then it converts the URLs it found into structured data.

Use this tool when you want to go to many pages on a site, and convert those pages into structured data.

Compared to crawl, scrape does an extra step of converting the URLs it found into data.
Compated to extract, scrape works on a URL pattern, not a list of URLs.

This tool can be thought of as a web scraping tool for a URL pattern.`,
    inputSchema: scrapeParams,
    outputSchema: scrapeOutput,
  },
  wrap('scrape'),
);
