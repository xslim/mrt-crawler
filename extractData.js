var cheerio = require('cheerio');

function extractData(html, config, baseUrl) {

    var $ = cheerio.load(html);

    var items = [];
    
    var category = '';
    if (config.category) {
        category = $(config.category).text().trim();
    }

    $(config.base).each(function() {
      //fruits[i] = $(this).text();
      //console.log(elem);
      var a = $(config.url, this);
      
      var href = a.attr('href');
      var title = a.text().trim();
      
      var img = '';
      if (config.img) {
          var imgTag = $(config.img, this);
          img = imgTag.attr('src');
      }

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

      if (baseUrl && href.lastIndexOf('/', 0) === 0) {
        href = baseUrl + href;
      }

      //console.log(title + " - "+price+" ("+href+"): "+description)
      var hash = {
        url: href,
        title: title,
        price: price,
        description: description
      };
      
      if (category && category.length > 0) {
          hash['category'] = category;
      }
      
      if (img && img.length > 0) {
          hash['img'] = img;
      }
      
      items.push(hash);
    });
    return items;
}

module.exports = extractData;
