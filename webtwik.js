(function() {
    var globals = createWikifier(window, $);
    var wikify = globals[0];
    var store = globals[1];
    var Tiddler = globals[2];

    var formatTiddler = function(jqtiddler) {
        var host = jqtiddler.attr('server.host');
        var recipe = jqtiddler.attr('server.recipe');
        var bag = jqtiddler.attr('server.bag');
        var title = jqtiddler.attr('title');
        var collection_uri;
        var tiddler_uri;
        if (recipe) {
            collection_uri = host
                + 'recipes/'
                + encodeURIComponent(recipe)
                + '/tiddlers.json';
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
                + '/tiddlers.json';
            tiddler_uri = host
                + 'bags/'
                + encodeURIComponent(bag)
                + '/tiddlers/'
                + encodeURIComponent(title)
                + '.json';
        }

        var loadTiddlerText = function(tiddler_div, tiddler_uri, title) {
            tiddler_div.innerHTML = "<h1>" + title + "</h1>";
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
        };

        $.ajax({
            url: collection_uri,
            type: 'GET',
            success: function(data, status, xhr) {
                twik.loadRemoteTiddlers(store, Tiddler, data);
                loadTiddlerText(jqtiddler[0], tiddler_uri, title);
            },
            error: function(xhr, error, exc) {
                jqtiddler[0].innherHTML = xhr.statusText;
            },
            dataType: 'text',
        });
    };

    $('.tiddler').each(function(index) {
        formatTiddler($(this));
    });

})();
