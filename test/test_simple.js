#!/usr/bin/env node

var twikifier = require('../twikifier');
var assert = require('assert');
var sys = require('sys');

var inResult = function(expect) {
    return '<html><head></head><body><div id="tiddler">' 
        + expect 
        + '</div></body></html>';
};

var formatting = [
    ["This is ''bold''.", "This is <strong>bold</strong>."],
    ["This is //italic//.", "This is <em>italic</em>."],
    ["This is ''//bolditalic//''.", "This is <strong><em>bolditalic</em></strong>."],
    ["This is __underline__.", "This is <u>underline</u>."],
    ["This is --strikethrough--.", "This is <strike>strikethrough</strike>."],
    ["This is super^^script^^.", "This is super<sup>script</sup>."],
    ["This is sub~~script~~.", "This is sub<sub>script</sub>."],
    ["This is @@highlight@@.", 'This is <span class="marked">highlight</span>.'],
    ["This is {{{''plaintext''}}}.", "This is <code>&#39;&#39;plaintext&#39;&#39;</code>."]
];

for (var i = 0; i < formatting.length; i++) {
    sys.puts(formatting[i][0]);
    assert.equal(
        twikifier.formatText(formatting[i][0]),
        inResult(formatting[i][1])
    );
}

