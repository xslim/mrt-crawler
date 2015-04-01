#!/usr/bin/env node

var request = require('request');
var cheerio = require('cheerio')
var fs = require("fs");


var args = process.argv.slice(2);

var ws = args[0];
var sel = args[1];
console.log("ws: " + ws + ", sel: "+sel);


request(ws, function (error, response, body) {
  if (error || response.statusCode != 200) {
    console.log(error);
    return;
  }

  var $ = cheerio.load(body);
  var data = $(sel);

  debugger;

  //console.log(data);
  console.log(data.text());
})

