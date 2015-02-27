var cheerio = require('cheerio');

function extractData(html, config) {

    var $ = cheerio.load(html);

    var items = [];

    $(config.base).each(function() {
      //fruits[i] = $(this).text();
      //console.log(elem);
      var a = $(config.url, this);
      
      var href = a.attr('href');
      var title = a.text().trim();

      if (!href || !title || href.length == 0 || title.length == 0) {
        return;
      }

      var description = "";
      var text = $(config.description, this).text().trim().split("\n");
      if (text && text.length > 0) {
        var i;
        var newText= [];
        for (i=0; i< text.length; i++) {
          var t = text[i].trim().replace(/\s+/g, ' ');
          if (t.length > 1) newText.push(t);
        }
        description = newText.join(', ');
      }

      var price = $(config.price, this).text().trim();

      //console.log(title + " - "+price+" ("+href+"): "+description)
      items.push({
        url: href,
        title: title,
        price: price,
        description: description
      });
    });
    return items;
}

module.exports = extractData;
