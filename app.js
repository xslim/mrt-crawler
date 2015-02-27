var Hapi = require('hapi');
var Crawler = require('simplecrawler').Crawler;
var extractData = require('./extractData')


var config = {};

var status = {};
function resetStatus() {
  status = {
    state: "",
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

  crawler.on("fetchstart",function(queueItem){
    status.added += 1;
    //console.log("Starting request for:",queueItem.url);
    });
  crawler.on("fetchcomplete", function(queueItem, responseBuffer){
    status.processed += 1;

    var html = responseBuffer.toString();
    var data = extractData(html, config.data);
  });
  crawler.on('complete', function () {
    status.state = "completed";
  })

  //crawler.start();
}


setupCrawler();
resetStatus();


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

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply(status);
    }
});


server.route({
    method: 'GET',
    path: '/data',
    handler: function (request, reply) {
        reply(data);
    }
});


server.route({
    method: 'GET',
    path: '/config',
    handler: function (request, reply) {
        reply(config);
    }
});

server.start(function () {
  server.log('info', 'Server running at: ' + server.info.uri);
});

