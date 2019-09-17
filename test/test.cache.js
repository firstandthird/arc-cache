const tap = require('tap');
const arcCache = require('../index.js');

tap.test('cache', async t => {
  let count = 0;
  // declare a render function:
  const render = function(request) {
    return arcCache.cache.memo(request.query.all, () => {
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
    queryStringParameters: {
      all: 'yes'
    }
  };
  const options = {};
  const responseHandler = await arcCache.cacheReply(handler, options);
  let response = await responseHandler(request);
  t.equal(response, 1, 'handler returns value');
  response = await responseHandler(request);
  t.equal(response, 1, 'handler caches previous value');
  request.queryStringParameters.update = true;
  response = await responseHandler(request);
  t.equal(response, 2, 'handler updates when requested');
  const request2 = {
    path: 'no',
    queryStringParameters: {
      skip: true
    }
  };
  response = await responseHandler(request2);
  response = await responseHandler(request2);
  t.equal(response, 2, 'skip will not cache previous value ');
  const request3 = {
    path: 'no',
    queryStringParameters: {
      stats: true
    }
  };
  response = await responseHandler(request3);
  t.match(response, { hits: 3, misses: 3, sets: 4, removes: 0 }, 'get cache stats when requested');
  response = await responseHandler({
    path: 'left',
    queryStringParameters: {
      yes: true
    }
  });
  const samePath = await responseHandler({
    path: 'left',
    queryStringParameters: {
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
    queryStringParameters: {
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
  request.queryStringParameters.mupdate = true;
  response = await responseHandler(request);
  t.equal(response, 2, 'handler mupdates when requested');
  const request2 = {
    path: 'no2',
    queryStringParameters: {
      drip: true
    }
  };
  response = await responseHandler(request2);
  response = await responseHandler(request2);
  t.equal(response, 2, 'drip will not cache previous value ');
  const request3 = {
    path: 'no2',
    queryStringParameters: {
      noway: true
    }
  };
  response = await responseHandler(request3);
  t.match(response, { hits: 5, misses: 6, sets: 7, removes: 0 }, 'gets cache stats when requested');
  response = await responseHandler({
    path: 'left2',
    queryStringParameters: {
      yes: true
    }
  });
  const samePath = await responseHandler({
    path: 'left2',
    queryStringParameters: {
      yes: false,
      another: true
    }
  });
  t.notEqual(response, samePath, 'consider query params part of cache key if specified');
  let customKeyMethodCalled = false;
  const customKeyMethod = (req) => {
    customKeyMethodCalled = true;
    return req.queryStringParameters.cacheKey;
  };
  const weirdResponseHandler = await arcCache.cacheReply(handler, { key: customKeyMethod });
  const customRequest = {
    path: 'customKey',
    queryStringParameters: {
      cacheKey: 'key1'
    }
  };
  response = await weirdResponseHandler(customRequest);
  t.ok(customKeyMethodCalled, 'calls custom cache key generator');
  const sameResponse = await weirdResponseHandler(customRequest);
  customRequest.queryStringParameters.cacheKey = 'key2';
  const diffResponse = await weirdResponseHandler(customRequest);
  t.equal(response, sameResponse, 'customer cache key generator assigns keys');
  t.notEqual(response, diffResponse, 'customer cache key generator assigns keys');
  t.end();
});
