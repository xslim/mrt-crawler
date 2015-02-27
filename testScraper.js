#!/usr/bin/env node

var request = require('request');
var fs = require("fs");

var extractData = require('./extractData')

var args = process.argv.slice(2);

var config_path = args[0];
console.log(config_path)


var config = JSON.parse(fs.readFileSync("./"+config_path, "utf8"));

console.log("Config: ", config);


request(config.url, function (error, response, body) {
  if (error || response.statusCode != 200) {
    console.log(error);
    return;
  }

  var data = extractData(body, config.data);
  console.log(data);
})

