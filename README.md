# What

This is a node.js-based wikifier for TiddlyWiki formatted wikitext.

Rather than creating new code this code simply assembles the required
parts from the TiddlyWiki
[core code repository](http://svn.tiddlywiki.org/Trunk/core/js/) along
with the necessary bits of additional JavaScript. This means that as
the TiddlyWiki core changes this code automatically keeps up to date.

By using jsdom and htmlparser with node, it is possible to simulate the
browser environment that the wikifier would normally run in, and create
some HTML output.

# How

(The below is for OS X but should transliterate to other environments.
It has also been tested on Ubuntu 12.04)

Install node.js and its package manager npm. If you are using brew that
goes like this:

    brew install node npm

Once you have npm, install grunt with:

    npm install -g grunt-cli

Then install the project dependencies:

    npm install

In the repo directory run:

    grunt

This will get all the necessary TiddlyWiki code and concatenate it into
`dist/twikifier.js`. The grunt test task is run after this and runs all
the files in the `test/files` directory against twikifier via
`test/twikify/js`.

The task also creates a distributable node application in `bin/server.js`.

## Testing

From the test directory, you can try your own wikitext by piping data
into twikify on STDIN:

    node twikify.js --collection=<url for tiddler collection> \
        < /tmp/mysampledata.txt

or by giving the names of multiple files on the command line:

    node twikify.js --collection=<url for tiddler collection> \
        /tmp/mysampledata.txt /tmp/someotherdata.txt

`<url for tiddler collection>` should be replaced with the url of a
collection of tiddlers, in JSON, as found in TiddlyWeb. Things like:

    http://cdent-test7.tiddlyspace.com/bags/cdent-test7_public/tiddlers
    http://cdent-test7.tiddlyspace.com/recipes/cdent-test7_public/tiddlers

As the tool develops there will be other interfaces.

# Testing the NPM Package Works

From the repo directory run:

    npm pack

This will create a zipped tarball.  Install this tarball as follows:

    npm install -g twikifier-x.y.z.tgz

If all is well, `twikifier` will be available in your path. Run this to
check twikifier works.

# Releasing the NPM Package

Run:

    grunt release

See [this link](https://npmjs.org/package/grunt-release#readme) for how
this works.

# Use with TiddlyWeb and Tiddlyspace

Install the TiddlyWeb plugin:

    pip install -U tiddlywebplugins.twikified

Add the following to tiddlywebconfig.py:

    'wikitext.default_renderer': 'tiddlywebplugins.twikified'

Install this package via NPM then run the twikifier server:

    npm install -g twikifier
    twikifier /tmp/wst.sock

Then start TiddlyWeb/Tiddlyspace

If you have connection problems after a restart, remove `/tmp/wst.sock`
and try again.

To permantly run twikifier, see the next section.

## Start-up Script

To have twikifier automatically run on start-up and to give more control
over starting and stopping it:

Copy the file `scripts/twikifier` to `/etc/init.d/`

Test it can start and stop:

        sudo /etc/init.d/twikifier start
        sudo /etc/init.d/twikifier stop
        sudo /etc/init.d/twikifier restart
        
Enable the script to start-up automatically on boot:

        update-rc.d twikifier defaults

Credit goes to https://github.com/chovy/node-startup for this.

###Socket File Location

By default, twikifier expects the socket file to live in
`/var/run/twikifier`. Create this folder, making sure the user running
twikifier can read/write:

    mkdir /var/run/twikifier
    chown user.user /var/run/twikifier

To use another location, add the absolute path as an argument to
twikifier in the start-up script.

# Why

TiddlyWeb and friends use [WikklyText](http://wikklytext.com/) to do sever-
side rendering of TiddlyWiki text to HTML. It works, but not great. It
has long been thought that a transcoding of the TiddlyWiki wikifier
would a) work better, b) be easier to extend and modify.

Also see [NOTES](/NOTES.md).

# Who

twikifier was written by Chris Dent and is Copyright 2011-2013, Peermore
Limited using a New BSD License. Thanks to Ben Paddock for packaging
things for the npm world.
