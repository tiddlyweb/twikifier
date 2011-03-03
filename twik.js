// utility funcions for twikify and twikifier related things
//
var twik = {};

twik.formatText = function(window, wikify, text) {
    // create a browser window
    var place = window.document.getElementById('tiddler');;

    // wikify the tiddler text.
    // XXX This should be functional, returning a string,
    // not building up the dom in place.
    wikify(text, place, null, null);

    return window.document.innerHTML;
}

twik.loadRemoteTiddlers = function(store, Tiddler, uri, jsonTiddlers) {
    var tiddlers = JSON.parse(jsonTiddlers);
    for (var i = 0; i < tiddlers.length ; i++) {
        var t = new Tiddler(tiddlers[i].title);
        t.text = tiddlers[i].text;
        t.tags = tiddlers[i].tags;
        t.modifier = tiddlers[i].modifier;
        t.modified = Date.convertFromYYYYMMDDHHMM(tiddlers[i].modified)
        t.created = Date.convertFromYYYYMMDDHHMM(tiddlers[i].created)
        t.fields = tiddlers[i].fields;
        store.addTiddler(t);
    }
    storeURL = new Tiddler('SiteUrl');
    storeURL.text = uri + '/';
    store.addTiddler(storeURL);
}


if (typeof exports != "undefined") {
    exports.formatText = twik.formatText;
    exports.loadRemoteTiddlers = twik.loadRemoteTiddlers;
}


