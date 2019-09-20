// const cache = require('@firstandthird/memory-cache');
const FunctionCache = require('@firstandthird/function-cache');
const cache = new FunctionCache(false);


const cacheReply = function(fn, cacheOptions = {}) {
  const ttl = cacheOptions.ttl || (60000 * 10); // defaults to 10 minutes
  const dropQueryParam = cacheOptions.dropQueryParam || 'update';
  const skipQueryParam = cacheOptions.skipQueryParam || 'skip';
  const statsQueryParam = cacheOptions.statsQueryParam || 'stats';
  return async function(req) {
    const queryKey = req.queryStringParameters ? 'queryStringParameters' : 'query';
    const query = req[queryKey] || {};
    // method for generating cache keys:
    const keyMethod = cacheOptions.key || (keyRequest => {
      return cacheOptions.cacheQueryParams ? `response-${keyRequest.path}-${JSON.stringify(query)}` : `response-${keyRequest.path}`;
    });
    const memoKey = keyMethod(req);
    // return cache stats if requested:
    if (query[statsQueryParam]) {
      return {
        headers: {
          'content-type': 'application/json; charset=utf8'
        },
        body: JSON.stringify(cache.cache.getStats())
      };
    }
    // skip cache altogether if requested or explicitly disabled:
    if (query[skipQueryParam] || cacheOptions.enabled === false) {
      return fn(req);
    }
    // return the cached value:
    return cache.memo(
      memoKey,
      () => fn(req),
      ttl,
      query[dropQueryParam] // force-update cache if true
    );
  };
};

module.exports = { cacheReply, cache };
