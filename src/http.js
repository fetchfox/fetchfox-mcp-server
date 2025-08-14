import { server } from './server.js';

server.start({
  transportType: 'httpStream',
  httpStream: {
    port: process.env.PORT || 3333,
    // stateless: true,
  },
});
