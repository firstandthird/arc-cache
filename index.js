const cache = require('@firstandthird/memory-cache');

// defaults to 10 minutes:
const cacheReply = function(req, fn, replyCacheTTL = 60000 * 10) {
  const key = req.queryStringParameters ? 'queryStringParameters' : 'query';
  return cache.memo(`response-${req.path}`, () => {
    return fn(req);
  }, replyCacheTTL, (req[key].update === '1'));
};

module.exports = { cacheReply, cache };
