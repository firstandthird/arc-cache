const MemoryCache = require('@firstandthird/memory-cache');
const cache = new MemoryCache(false);

const memo = async(key, fn, ttl, forceUpdate) => {
  const value = cache.getCacheObject(key);
  if (!forceUpdate && value) {
    if (value.expires === 0 || value.expires > new Date().getTime()) {
      return value.value;
    }
  }
  const result = await fn();
  // always set the header showing when it was cached:
  if (!result.headers) {
    result.headers = { 'x-cache': new Date().getTime() };
  } else {
    result.headers['x-cache'] = new Date().getTime();
  }
  cache.set(key, result, ttl);
  return result;
};

const cacheReply = function(fn, cacheOptions = {}) {
  const ttl = cacheOptions.ttl || (60000 * 10); // defaults to 10 minutes
  const dropQueryParam = cacheOptions.dropQueryParam || 'update';
  const skipQueryParam = cacheOptions.skipQueryParam || 'skip';
  const statsQueryParam = cacheOptions.statsQueryParam || 'cacheStats';
  // by default log does nothing
  const log = cacheOptions.log ? cacheOptions.log : () => {};
  // by default always return true:
  const shouldCache = cacheOptions.shouldCache ? cacheOptions.shouldCache : () => true;
  return async function(req) {
    // skip if disabled or shouldCache function says no:
    if (cacheOptions.enabled === false || !shouldCache(req)) {
      return fn(req);
    }
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
        statusCode: 200,
        headers: {
          'content-type': 'application/json; charset=utf8'
        },
        body: JSON.stringify(cache.getStats())
      };
    }
    // log and skip cache if requested:
    if (query[skipQueryParam]) {
      log(['cache', 'skip'], { key: memoKey, query });
      return fn(req);
    }
    // return the cached value:
    let hit = true;
    const result = await memo(
      memoKey,
      () => {
        // log misses and updates:
        hit = false;
        if (query[dropQueryParam]) {
          log(['cache', 'update'], { key: memoKey, query });
        } else {
          log(['cache', 'miss'], { key: memoKey, query });
        }
        return fn(req);
      },
      ttl,
      query[dropQueryParam] // force-update cache if true
    );
    // log if its a hit:
    if (hit) {
      log(['cache', 'hit'], { key: memoKey, query });
    }
    return result;
  };
};

module.exports = { cacheReply, cache, memo };
