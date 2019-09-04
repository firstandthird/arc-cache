const tap = require('tap');
const arcCache = require('../index.js');

tap.test('cache arc6', async t => {
  let count = 0;
  // declare a render function:
  const render = function(request) {
    return arcCache.cache.memo(request.queryStringParameters.all, () => {
      count++;
      return request.queryStringParameters.all;
    }, 60000, false);
  };
  const request = {
    queryStringParameters: {
      all: 'yes'
    }
  };
  let result = await render(request);
  t.match(result, 'yes', 'method returns value');
  t.equal(count, 1, 'method executed first time');
  result = await render(request);
  t.match(result, 'yes', 'cached method returns value');
  t.equal(count, 1, 'cached method not executed');
  request.queryStringParameters.all = 'no';
  result = await render(request);
  t.match(result, 'no', 'new method returns value');
  t.equal(count, 2, 'new method executes, does not conflict with previous cached method');
  t.end();
});

tap.test('cacheReply arc6', async t => {
  let count = 0;
  // declare a request handler:
  const handler = function(request) {
    count++;
    return request.path;
  };
  const request = {
    path: 'yes',
    queryStringParameters: {
      all: 'yes'
    }
  };
  const r1 = await arcCache.cacheReply(request, handler);
  t.match(r1, 'yes', 'handler returns value');
  t.equal(count, 1, 'handler executed first time');

  const r2 = await arcCache.cacheReply(request, handler);
  t.match(r2, 'yes', 'cached method returns value');
  t.equal(count, 1, 'cached method not executed');
  request.queryStringParameters.all = 'no';

  request.path = 'no';
  const r3 = await arcCache.cacheReply(request, handler);
  t.match(r3, 'no', 'new method returns value');
  t.equal(count, 2, 'new method executes, does not conflict with previous cached method');

  request.path = 'yes';
  request.queryStringParameters.update = '1';
  const r4 = await arcCache.cacheReply(request, handler);
  t.match(r4, 'yes', 'handler returns value');
  t.equal(count, 3, 'handler executed first time');
  t.end();
});
