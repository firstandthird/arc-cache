const tap = require('tap');
const arcCache = require('../index.js');

tap.test('cacheReply x-cache header', async t => {
  let count = 0;
  const handler = async(req) => {
    count++;
    return {
      headers: {},
      body: count
    }
  };
  const request = {
    path: 'yes',
    query: {
      all: 'yes'
    }
  };
  const responseHandler = await arcCache.cacheReply(handler);
  let response = await responseHandler(request);
  response = await responseHandler(request);
  t.ok(response.headers['x-cache']);
  t.end();
});
