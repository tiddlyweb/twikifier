"use strict";

var twikify = {};

var opts = require("tav").set({
    collection: {
        note: "Remote Tiddler Collection URI",
        value: null
    }
}, "wikify some tiddlywiki text");


// require the jsdom and jquery libraries, via NODE_PATH
// (probably /usr/local/lib/node if you are using npm)
var jsdom = require("jsdom");
var jquery = require("jQuery");
var fs = require("fs");
var http = require("http");
var url = require("url");

// reference our local libraries
var createWikifier = require("../dist/twikifier.js").createWikifier;
var twik = require("../src/twik.js");


// read data to create text and pass to formatText
var createText = function(window, wikify, file) {
    var text = "";

    file.on("data", function(chunk) {
        text += chunk;
    });

    file.on("end", function() {
        console.log(twik.formatText(window, wikify, text));
    });
};

// open a file stream
var runFile = function(window, wikify, filename) {
    var stream = fs.createReadStream(filename, { "encoding": "utf8" });
    createText(window, wikify, stream);
};

// open stdin
var runStdin = function(window, wikify) {
    var stdin = process.openStdin();
    stdin.setEncoding("utf8");
    createText(window, wikify, stdin);
};

// determine if we are reading from stdin or file stream, have received the filename from another node file
var processdata = function(window, wikify, filename) {
    if(filename) {
        runFile(window, wikify, filename);
    } else {
        var arglength = opts.args.length;
        if (arglength) {
            for (var i = 0; i < arglength ; i++) {
                runFile(window, wikify, opts.args[i]);
            }
        } else {
            runStdin(window, wikify);
        }
    }
};

// make the game go
twikify.run = function(passedUri, filename) {
    var uri = passedUri ? passedUri : opts.collection;
    // create a window in which we host a dom
    var window = jsdom.jsdom(
        "<html><head></head><body><div id='tiddler'></div></body></html>"
    ).createWindow();

    // jquery-ize the window
    var jQuery = jquery.create(window);
    // Create formatter for the window.
    var globals = createWikifier(window, jQuery, {container: uri});
    var wikify = globals[0];
    var store = globals[1];
    var Tiddler = globals[2];

    if (uri) {
        var parsed_uri = url.parse(uri);

        var options = {
            hostname: parsed_uri.hostname,
            port: parsed_uri.port ? parsed_uri.port : 80,
            path: "?fat=1",
            method: "GET",
            headers: { "accept": "application/json" }
        };

        var request = http.request(options, function (response) {
            response.setEncoding("utf8");
            var data = "";
            response.on("data", function(chunk) {
                data += chunk;
            });
            response.on("end", function() {
                twik.loadRemoteTiddlers(store, Tiddler, uri, data);
                processdata(window, wikify, filename);
            });
        });

        request.on("error", function(error) {
            console.log("There was a problem with the request: " + error.message);
        });

        request.end();
    } else {
        processdata(window, wikify, filename);
    }
};

if (exports !== "undefined") {
    exports.run = twikify.run;
}

if (module.parent === null) {
    twikify.run();
}