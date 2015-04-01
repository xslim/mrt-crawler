var Hapi = require('hapi');
var Crawler = require('simplecrawler').Crawler;
var extractData = require('./extractData')
var request = require('request')
var url = require('url')

var elasticsearch = require('elasticsearch');

var config = {};
var crawlerData = [];

var processedPaths = [];

var status = {};
function resetStatus() {
  status = {
    state: "ready",
    added: 0,
    processed: 0,
    indexed: 0,
    current: ""
  };
}

var crawler;
function setupCrawler() {
  crawler = new Crawler();

  //crawler.host = url;
  crawler.filterByDomain = true;
  crawler.downloadUnsupported = false;
  crawler.parseHTMLComments = false;
  crawler.maxDepth = 2;

  var conditionID = crawler.addFetchCondition(function(parsedURL) {
        return !parsedURL.path.match(/\.(xml|js|json|css|pdf|woff|eot|png|jpg|jpeg|ico|gif|svg|ttf)$/i);
  });

  var fc2 = crawler.addFetchCondition(function(parsedURL) {
    if (processedPaths.indexOf(parsedURL.path) >= 0) {
      //console.log('Skipping ' + parsedURL.path);
      return false;
    }
    return true;
  });

  crawler.on("crawlstart",function(){
    status.state = 'started';
    console.log("Starting crawler");
  });
  crawler.on("queueadd", function(item, url){
    //console.log("Added to queue: ", item, url);
  });
  crawler.on("fetchstart",function(queueItem){
    status.added += 1;
    //console.log("Starting request for:", queueItem.url);
    });
  crawler.on("fetchcomplete", function(queueItem, responseBuffer){
    var thisContinue = this.wait();
    status.processed += 1;

    var html = responseBuffer.toString();
    var data = extractData(html, config.data, config.baseUrl);

    //console.log(data);
    data.forEach(function(item){
      var parsedUrl = url.parse(item.url);
      processedPaths.push(parsedUrl.path);
    })


    //foundURLs.forEach(crawler.queueURL.bind(crawler));
    thisContinue();

    //crawlerData.push(data);
    indexElasticsearch(elastic_client, config.category, data, function(err){
      if (err) {
        crawlerData.push(data);
        console.log('Push bulk index Error: ', err);
      } else {
        status.indexed += 1;
      }

    });

  });
  crawler.on('complete', function () {

    status.state = "completed";
  })

  //crawler.start();
}


setupCrawler();
resetStatus();

var elastic_client;
function setupElasticsearch(options) {
  elastic_client = new elasticsearch.Client({
    host: options.host,
    apiVersion: options.version,
    log: 'warning'
  });
}

function pingElasticsearch(client, callback) {
  client.ping({
    requestTimeout: 2000,
    // undocumented params are appended to the query string
    hello: "elasticsearch!"
  }, function (error) {
    if (error) {
      console.error('elasticsearch cluster is down!');
      callback(false);
    } else {
      callback(true);
    }
  });
}

function indexElasticsearch(client, index, data, callback) {
  var type = 'url';
  var body = [];

  if (data.length == 0) {
    callback();
    return;
  }

  var i;
  for (i=0; i < data.length; i++) {
    body.push({index: {}});
    body.push(data[i]);
  }

  client.bulk({
    index: index,
    type: type,
    body: body
      //[
      // action description
      //{ index:  { _index: 'myindex', _type: 'mytype', _id: 1 } },
      // the document to index
      //]
  }, function (err, resp) {
    callback(err)
  });
}

var sOptions = {
  minimal: true,
  connections: {
    router: {
      isCaseSensitive: false,
      stripTrailingSlash: true
    }
  },
  routes: { cors: true }
};

var server = new Hapi.Server();
var port = process.env.PORT || 3000;
server.connection({ port: port});

function getNext(callback) {
  var url = "http://mrt-config.herokuapp.com/websites/next";
  //var url = 'http://localhost:3001/websites/next'
  request({url: url, method: 'GET', json: true}, function(err, resp, data){
    if (err || resp.statusCode != 200) {
      console.log('Error fetching '+url+', error: ', err);
      return;
    }

    console.log(data)
    if (!data.url || !data.elastic) {
      callback();
      return;
    }

    console.log('Updating config');
    config = data;
    if (callback) callback(data);
    //console.log(data);

  });
}

function startCrawler() {
  resetStatus();
  crawler.stop();
  //crawler.discoverResources = false;
  console.log('Adding url: ', config.url)

  // Need to do this, othervise url will not be added
  var processedUrl = url.parse(config.url);
  config.baseUrl = processedUrl.protocol + '//' + processedUrl.host;
  crawler.host = processedUrl.hostname;

  crawler.maxDepth = config.depth;

  crawler.queueURL(config.url);
  console.log(crawler.queue);
  crawler.start();
  //crawler.discoverResources = true;
}

function handleNext(req, res) {
  getNext(function(data){

    if (data) {

      setupElasticsearch(data.elastic);
      pingElasticsearch(elastic_client, function(ok){
        if (!ok) {
          res({error: 'elastic search not responding'}).code(500);
          return;
        }
        res(data);
        startCrawler();
      });

    }
  })
}

function xroute(method, path, handler) {
  return {
    method: method,
    path: path,
    config: {
      cors: true,
      handler: handler
    }
  };
}

server.route([
  xroute('GET', '/', function(req, res){ res( {status: status, config: config} ) }),
  xroute('GET', '/data', function(req, res){ res(crawlerData) }),
  xroute('GET', '/queue', function(req, res){ res(crawler.queue) }),
  xroute('GET', '/stop',  function(req, res){ crawler.stop(); res(status) }),
  xroute('GET', '/next', handleNext),

]);


server.start(function () {
  console.log('Server running at: ' + server.info.uri);
});
