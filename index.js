// const cache = require('@firstandthird/memory-cache');
const FunctionCache = require('@firstandthird/function-cache');
const cache = new FunctionCache(false);

// defaults to 10 minutes:
// const cacheReply = function(req, fn, replyCacheTTL = 60000 * 10) {
//   // architect version 6 uses different keys:
//   const key = req.queryStringParameters ? 'queryStringParameters' : 'query';
//   return cache.memo(`response-${req.path}`, () => {
//     return fn(req);
//   }, replyCacheTTL, (req[key].update === '1'));
// };

const cacheReply = function(fn, cacheOptions = {}) {
  // architect version 6 uses different keys:
  const ttl = cacheOptions.ttl || (60000 * 10);
  const dropQueryParam = cacheOptions.dropQueryParam || 'update';
  const skipQueryParam = cacheOptions.skipQueryParam || 'skip';
  const statsQueryParam = cacheOptions.statsQueryParam || 'stats';
  const keyMethod = cacheOptions.key || (req => {
    const queryKey = req.queryStringParameters ? 'queryStringParameters' : 'query';
    const query = req[queryKey];
    return cacheOptions.cacheQueryParams ? `response-${req.path}-${JSON.stringify(query)}`: `response-${req.path}`;
  });
  return async function(req) {
    const queryKey = req.queryStringParameters ? 'queryStringParameters' : 'query';
    const query = req[queryKey];
    const memoKey = keyMethod(req);
    // return cache stats if requested:
    if (query[statsQueryParam]) {
      return cache.cache.getStats();
    }
    // skip cache altogether if requested:
    if (query[skipQueryParam]) {
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
