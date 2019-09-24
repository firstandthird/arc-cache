const tap = require('tap');
const arcCache = require('../index.js');

tap.test('cacheReply log method', async t => {
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
  let tagList = [];
  let dataList = [];
  const options = {
    log: (tags, data) => {
      tagList = tags;
      dataList = data;
    }
  };
  const responseHandler = await arcCache.cacheReply(handler, options);
  let response = await responseHandler(request);
  t.match(tagList, ['cache', 'miss']);
  t.match(dataList, { key: 'response-yes', query: { all: 'yes' } });
  response = await responseHandler(request);
  t.match(tagList, ['cache', 'hit']);
  t.match(dataList, { key: 'response-yes', query: { all: 'yes' } });
  request.query.update = true;
  response = await responseHandler(request);
  t.match(tagList, ['cache', 'update']);
  t.match(dataList, { key: 'response-yes', query: { all: 'yes' } });
  const request2 = {
    path: 'no',
    query: {
      skip: true
    }
  };
  response = await responseHandler(request2);
  t.match(tagList, ['cache', 'skip']);
  t.match(dataList, { key: 'response-no', query: { skip: true } });
  t.end();
});
