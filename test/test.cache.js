const tap = require('tap');
const arcCache = require('../index.js');

tap.test('cache', async t => {
  let count = 0;
  // declare a render function:
  const render = function(request) {
    return arcCache.memo(request.query.all, () => {
      count++;
      return request.query.all;
    }, 60000, false);
  };
  const request = {
    query: {
      all: 'yes'
    }
  };
  let result = await render(request);
  t.match(result, 'yes', 'method returns value');
  t.equal(count, 1, 'method executed first time');
  result = await render(request);
  t.match(result, 'yes', 'cached method returns value');
  t.equal(count, 1, 'cached method not executed');
  request.query.all = 'no';
  result = await render(request);
  t.match(result, 'no', 'new method returns value');
  t.equal(count, 2, 'new method executes, does not conflict with previous cached method');
  t.end();
});

tap.test('cacheReply defaults', async t => {
  let count = {};
  const handler = async(req) => {
    if (count[req.path]) {
      count[req.path]++;
    } else {
      count[req.path] = 1;
    }
    return count[req.path];
  };
  const request = {
    path: 'yes',
    query: {
      all: 'yes'
    }
  };
  const options = {};
  const responseHandler = await arcCache.cacheReply(handler, options);
  let response = await responseHandler(request);
  t.equal(response, 1, 'handler returns value');
  response = await responseHandler(request);
  t.equal(response, 1, 'handler caches previous value');
  request.query.update = true;
  response = await responseHandler(request);
  t.equal(response, 2, 'handler updates when requested');
  const request2 = {
    path: 'no',
    query: {
      skip: true
    }
  };
  response = await responseHandler(request2);
  response = await responseHandler(request2);
  t.equal(response, 2, 'skip will not cache previous value ');
  const request3 = {
    path: 'no',
    query: {
      cacheStats: true
    }
  };
  response = await responseHandler(request3);
  t.match(response.body, JSON.stringify({ hits: 3, misses: 3, sets: 4, removes: 0 }), 'get cache stats when requested');
  t.match(response.headers['content-type'], 'application/json; charset=utf8');
  response = await responseHandler({
    path: 'left',
    query: {
      yes: true
    }
  });
  const samePath = await responseHandler({
    path: 'left',
    query: {
      yes: false,
      another: true
    }
  });
  t.equal(response, samePath, 'does not consider query params part of cache key by default');
  t.end();
});

tap.test('cacheReply non-defaults', async t => {
  let count = {};
  const handler = async(req) => {
    if (count[req.path]) {
      count[req.path]++;
    } else {
      count[req.path] = 1;
    }
    return count[req.path];
  };
  const request = {
    path: 'yes2',
    query: {
      all: 'yes'
    }
  };
  const options = {
    ttl: 1000,
	  dropQueryParam: 'mupdate',
    skipQueryParam: 'drip',
	  statsQueryParam: 'noway',
	  cacheQueryParams: true,
  };
  const responseHandler = await arcCache.cacheReply(handler, options);
  let response = await responseHandler(request);
  t.equal(response, 1, 'handler returns value');
  response = await responseHandler(request);
  t.equal(response, 1, 'handler caches previous value');
  request.query.mupdate = true;
  response = await responseHandler(request);
  t.equal(response, 2, 'handler mupdates when requested');
  const request2 = {
    path: 'no2',
    query: {
      drip: true
    }
  };
  response = await responseHandler(request2);
  response = await responseHandler(request2);
  t.equal(response, 2, 'drip will not cache previous value ');
  const request3 = {
    path: 'no2',
    query: {
      noway: true
    }
  };
  response = await responseHandler(request3);
  t.match(response.body, JSON.stringify({ hits: 5, misses: 6, sets: 7, removes: 0 }), 'gets cache stats when requested');
  t.match(response.headers['content-type'], 'application/json; charset=utf8');
  response = await responseHandler({
    path: 'left2',
    query: {
      yes: true
    }
  });
  const samePath = await responseHandler({
    path: 'left2',
    query: {
      yes: false,
      another: true
    }
  });
  t.notEqual(response, samePath, 'consider query params part of cache key if specified');
  let customKeyMethodCalled = false;
  const customKeyMethod = (req) => {
    customKeyMethodCalled = true;
    return req.query.cacheKey;
  };
  const weirdResponseHandler = await arcCache.cacheReply(handler, { key: customKeyMethod });
  const customRequest = {
    path: 'customKey',
    query: {
      cacheKey: 'key1'
    }
  };
  response = await weirdResponseHandler(customRequest);
  t.ok(customKeyMethodCalled, 'calls custom cache key generator');
  const sameResponse = await weirdResponseHandler(customRequest);
  customRequest.query.cacheKey = 'key2';
  const diffResponse = await weirdResponseHandler(customRequest);
  t.equal(response, sameResponse, 'customer cache key generator assigns keys');
  t.notEqual(response, diffResponse, 'customer cache key generator assigns keys');
  t.end();
});

tap.test('cacheReply enabled == false will skip caching', async t => {
  let count = {};
  const handler = async(req) => {
    if (count[req.path]) {
      count[req.path]++;
    } else {
      count[req.path] = 1;
    }
    return count[req.path];
  };
  const request = {
    path: 'yes2',
    query: {
      all: 'yes'
    }
  };
  const options = {
    enabled: false
  };
  const responseHandler = await arcCache.cacheReply(handler, options);
  let response = await responseHandler(request);
  t.equal(response, 1, 'handler returns value');
  response = await responseHandler(request);
  t.notEqual(response, 1, 'handler does not cache previous value if not enabled');
  t.end();
});
