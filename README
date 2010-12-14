# What

This is a first pass at creating node.js-based wikifier for wikitext
formatted as TiddlyWiki text.

Rather than creating new code this code simply assembles the required
parts from the TiddlyWiki
[core code repository](http://svn.tiddlywiki.org/Trunk/core/js/) along
with the necessary bits of additional JavaScript. This means that as
the TiddlyWiki core changes this code automatically keeps up to date.

# How

(The below is for OS X but should transliterate to other environments.)

Install node.js and its package manager npm. If you are using brew that
goes like this:

    brew install node npm

One you have npm, install jsdom, htmlparser and jquery:

    npm install jsdom htmlparser jquery

Make sure you set `NODE_PATH`:

    export NODE_PATH=/usr/local/lib/node

In this repo's directory run:

    make test

This will get all the necessary TiddlyWiki code and concatenate it into
`twikifier.js` and then run that file as a node script. To experiment more
make changes to `TwikifierBase.js` or `Test.js` and then run `make test` again.
