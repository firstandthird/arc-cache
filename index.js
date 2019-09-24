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
  cache.set(key, result, ttl);
  return result;
};

const cacheReply = function(fn, cacheOptions = {}) {
  const ttl = cacheOptions.ttl || (60000 * 10); // defaults to 10 minutes
  const dropQueryParam = cacheOptions.dropQueryParam || 'update';
  const skipQueryParam = cacheOptions.skipQueryParam || 'skip';
  const statsQueryParam = cacheOptions.statsQueryParam || 'cacheStats';
  // by default always return true:
  const shouldCache = cacheOptions.shouldCache ? cacheOptions.shouldCache : () => true;
  return async function(req) {
    if (!shouldCache(req)) {
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
    // skip cache altogether if requested or explicitly disabled:
    if (query[skipQueryParam] || cacheOptions.enabled === false) {
      if (cacheOptions.log) {
        cacheOptions.log(['cache', 'skip'], { key: memoKey, query });
      }
      return fn(req);
    }
    // return the cached value:
    let miss = false;
    const result = await memo(
      memoKey,
      () => {
        // log misses:
        if (cacheOptions.log && !query[dropQueryParam]) {
          miss = true;
          cacheOptions.log(['cache', 'miss'], { key: memoKey, query });
        }
        return fn(req);
      },
      ttl,
      query[dropQueryParam] // force-update cache if true
    );
    // log if update or hit:
    if (cacheOptions.log) {
      if (query[dropQueryParam]) {
        cacheOptions.log(['cache', 'update'], { key: memoKey, query });
      } else if (!miss) {
        cacheOptions.log(['cache', 'hit'], { key: memoKey, query });
      }
    }
    return result;
  };
};

module.exports = { cacheReply, cache, memo };
