(function() {

    var wikifiers = {};

    var formatTiddler = function(jqtiddler) {
        var server_host = jqtiddler.attr('server.host');
        var host = server_host ? server_host : '/';
        var recipe = jqtiddler.attr('server.recipe');
        var bag = jqtiddler.attr('server.bag');
        var title = jqtiddler.attr('title');
        var collection_uri;
        var tiddler_uri;
        if (recipe) {
            collection_uri = host
                + 'recipes/'
                + encodeURIComponent(recipe)
                + '/tiddlers';
            tiddler_uri = host
                + 'recipes/'
                + encodeURIComponent(recipe)
                + '/tiddlers/'
                + encodeURIComponent(title)
                + '.json';
        } else {
            collection_uri = host
                + 'bags/'
                + encodeURIComponent(bag)
                + '/tiddlers';
            tiddler_uri = host
                + 'bags/'
                + encodeURIComponent(bag)
                + '/tiddlers/'
                + encodeURIComponent(title)
                + '.json';
        }

        var useCache = false;
        var globals, wikify, store, Tiddler;
        if (wikifiers[collection_uri] === undefined) {
            globals = createWikifier(window, $, {container: collection_uri});
            wikifiers[collection_uri] = globals;
        } else {
            globals = wikifiers[collection_uri];
            useCache = true;
        }
        wikify = globals[0];
        store = globals[1];
        Tiddler = globals[2];

        var loadTiddlerText = function(tiddler_div, tiddler_uri, title) {
            pre_element = $(tiddler_div).find('pre').first();
            text = unescape(pre_element.text());
            pre_element.remove()
            console.log('text', text);
            if (text) {
                wikify(text, tiddler_div, null, null);
            } else {
                $.ajax({
                    url: tiddler_uri,
                    type: 'GET',
                    success: function(data ,status, xhr) {
                        wikify(data.text, tiddler_div, null, null);
                    },
                    errror: function(xhr, error, exc) {
                        tiddler_div.innherHTML = xhr.statusText;
                    },
                });
            }
        };

        if (useCache) {
            loadTiddlerText(jqtiddler[0], tiddler_uri, title);
        } else {
            $.ajax({
                url: collection_uri + '.json?fat=1',
                type: 'GET',
                success: function(data, status, xhr) {
                    twik.loadRemoteTiddlers(store, Tiddler, collection_uri, data);
                    loadTiddlerText(jqtiddler[0], tiddler_uri, title);
                },
                error: function(xhr, error, exc) {
                    jqtiddler[0].innherHTML = xhr.statusText;
                },
                dataType: 'text',
            });
        }
    };

    $('.tiddler').each(function(index) {
        formatTiddler($(this));
    });

})();
