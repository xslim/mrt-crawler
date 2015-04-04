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

      if (href && title && href.length > 0 && title.length > 0) {
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

        if (price.match(/-?\d+(\.?|\,?)\d*/)) {
          price = price.replace(/,/g, '.');
          var price_num = price.match(/-?\d+(\.?|\,?)\d*/)[0];
          if (price_num && price_num > 0) {
            hash['price_num'] = price_num;
          }
        }

        // if (price.match(/^(?!0\.00)\d{1,3}(,\d{3})*(\.\d\d)?$/)) {
        //   var price_num = price.match(/^(?!0\.00)\d{1,3}(,\d{3})*(\.\d\d)?$/);
        //   console.log(price_num);
        //   if (price_num && price_num > 0) {
        //     hash['price_num'] = price_num;
        //   }
        // }

        if (description.match(/(\d+) m²/)) {
          var size = description.match(/(\d+) m²/)[1];
          //console.log('size', size);
          if (size) {
            hash['size'] = size;
          }
        }

        //console.log(hash);

        items.push(hash);
      }


    });
    return items;
}

module.exports = extractData;
