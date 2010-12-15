# What

This is a first pass at creating node.js-based wikifier for wikitext
formatted as TiddlyWiki text.

Rather than creating new code this code simply assembles the required
parts from the TiddlyWiki
[core code repository](http://svn.tiddlywiki.org/Trunk/core/js/) along
with the necessary bits of additional JavaScript. This means that as
the TiddlyWiki core changes this code automatically keeps up to date.

By using jsdom and htmlparser with node, it is possible to simulate the
browser environment that the wikifier would normally run in, and create
some HTML output.

# How

(The below is for OS X but should transliterate to other environments.)

Install node.js and its package manager npm. If you are using brew that
goes like this:

    brew install node npm

One you have npm, install jsdom, htmlparser and jquery:

    npm install jsdom htmlparser jquery

Make sure you set `NODE_PATH`:

    export NODE_PATH=/usr/local/lib/node

In the repo directory run:

    make test

This will get all the necessary TiddlyWiki code and concatenate it into
`twikifier.js` and then run that file as a node script. To experiment more
make changes to `TwikifierBase.js` or `Test.js` and then run `make test` again.

# Why

TiddlyWeb and friends use [WikklyText](http://wikklytext.com/) to do sever-side
rendering of TiddlyWiki text to HTML. It works, but not great. It has long been
thought that a transcoding of the TiddlyWiki wikifier would a) work better,
b) be easier to extend and modify.

Also see the next section.

# Comments

In order to get the TiddlyWiki wikifier to work standalone, a great deal
of the TiddlyWiki code is required. Have a look at `TWREMOTES` in the
`Makefile` and the comments in `TwikifierBase.js`. The general overview
comment is that TiddlyWiki is non-functional: meaning its modules and methods
are tightly coupled with others, have many side effects and make use of 
data from globals rather than passed in parameters. This means that independent
code reuse is nigh on impossible.

That this is true is neither surprising, nor damning: TiddlyWiki was originally
built as a single file application. However since there is code in
there that could be useful if extracted and abstracted, hopefully this work
can point out some of the problems.

I tried to write down a simple dependency tree that explains how each
chunk of javascript requires another, but delineating the reasons got to be
too much so instead: What follows has less explanation than it could.

`twikifier` functionality currently lives in `Test.js` and `TwikifierBase.js`.

`Test.js` requires global `wikify()` in `Wikifier.js`.

`Wikifier.js` requires the global `formatter`, a `Formatter` from `FormatterHelpers.js`.

`FormatterHelpers.js` requires the global `config`, from `Config.js`, which requires the `navigator` global, which `twikifier` stubs in.

A `Formatter` needs formatters, which are in `config` and defined in `Formatter.js`.

`Formatter.js` requires `FormatterHelper.js`, creating a cycle.

`Wikifier.js` requires global `createTiddlyText()`, from `Dom.js`.

`Wikifier.js` requires global `createTiddlyElement()`, from `Dom.js`.

`Formatter.js`, to format links, requires global `createTiddlyLink()` from `Utilities.js`.

`Utilities.js` requires the `pushUnique` modification to the `Array` prototype. This is found in `BasicTypes.js`.

`Formatter.js`, `FormatterHelpers.js`, `Utilities.js` all make use of a `store` global. A store, is a `TiddlyWiki` class, from `TiddlyWiki.js`.

`TiddlyWiki.js` calls `instanceof Tiddler` (4 times) and `new Tiddler` (twice), thus requiring `Tiddler.js`.

`Utilities.js` has `getTiddlyLinkInfo`, which requires `Lingo.js` for messages.
(`Lingo.js` requires `Config.js` and `Utilities.js` (for merge()).)

Presenting messages requires adding `format()` to the `String` prototype, thus requiring `Strings.js`.

This gets us to a working formatter, but not macros.

Adding `Macros.js` adds (limited, not yet tested) support for macros. `Macros.js` requires `Config.js`.

The difficulty here is not so much that there are a bunch of interdependencies,
but rather that the interdependencies are in the global scope and because
the files are simply building blocks for a single file, there are no clues
like import statements, namespaces, etc.

# Next

While the existing code will do basic rendering, to be truly useful
in a [TiddlyWeb](http://tiddlyweb.com/) situation, twikifier
needs two things:

* To present a web service or local socket that takes an input (a text
  string, a tiddler bag/title combo?) and returns the generated HTML.
* A Store class which satisfies the store methods that are called
  throughout Config, Formatter*, Lingo, Macros, Wikifier etc. One way 
  to do this would be to talk HTTP to the TiddlyWeb server, but there
  are auth issues. The "store" then would be a recipe or bag collection
  from the server.

# Who

twikifier is written by Chris Dent and is Copyright 2010, Peermore Limited
using a New BSD License.
