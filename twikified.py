"""
Serialization that uses twikifier to render.

It can render in two ways. If config['twikified.render'] is
True, the default, then rendering will be done serverside
with a nodje.js based socket server. Otherwise rendering will be
delegated to the client.

If config['twikified.serializer'] is True (the default is False)
use this code as a serialization, not just a renderer. Whether
rendering is done by the serialization server side or client side
is controlled by twikified.render.

The socket is at config['twikified.socket'], '/tmp/wst.sock' by
default. Running the server is up to the human installer at this point.

If client side rendering is used, then a bunch of javascript is
expected to be found in config['twikified.container'], defaulting
to '/bags/common/tiddlers/'. The human installer is expected to get the
right tiddlers in the right place (for now).
"""

import logging
import Cookie
import socket

import html5lib
from xml.parsers.expat import ExpatError

from tiddlyweb.control import determine_bag_from_recipe
from tiddlyweb.store import StoreError
from tiddlyweb.model.bag import Bag
from tiddlyweb.model.policy import PermissionsError
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.wikitext import render_wikitext
from tiddlyweb.util import renderable
from tiddlyweb.web.util import (escape_attribute_value, recipe_url, bag_url)

REVISION_RENDERER = 'tiddlywebplugins.wikklytextrender'


def init(config):
    """
    Establish if this plugin is to be used a a serializaiton, a renderer,
    or both (which would be weird, but is possible).
    """
    if config.get('twikified.render', True):
        config['wikitext.default_renderer'] = 'twikified'


def render(tiddler, environ):
    """
    Return tiddler.text as rendered HTML by passing it down a
    socket to the nodejs based server.js process. Transclusions
    are identified in the returned text and processed recursively.

    If there is a current user, that user is passed along the pipe
    so that private content can be retrieved by nodejs (over HTTP).
    """

    if tiddler.recipe:
        collection = recipe_url(environ, Recipe(tiddler.recipe)) + '/tiddlers'
    else:
        collection = bag_url(environ, Bag(tiddler.bag)) + '/tiddlers'

    try:
        user_cookie = environ['HTTP_COOKIE']
        cookie = Cookie.SimpleCookie()
        cookie.load(user_cookie)
        tiddlyweb_cookie = 'tiddlyweb_user=' + cookie['tiddlyweb_user'].value
    except KeyError:
        tiddlyweb_cookie = ''

    socket_path = environ['tiddlyweb.config'].get('twikified.socket',
            '/tmp/wst.sock')
    twik_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)

    try:
        twik_socket.connect(socket_path)
    except (socket.error, IOError), exc:
        output = """
<div class='error'>There was a problem rendering this tiddler.
The raw text is given below.</div>
<pre class='wikitext'>%s</pre>
""" % (escape_attribute_value(tiddler.text))
        logging.warn('twikifier socket connect failed: %s', exc)
        twik_socket.shutdown(socket.SHUT_RDWR)
        twik_socket.close()
        return output

    try:
        twik_socket.sendall('%s\x00%s\x00%s\n' % (collection,
            tiddler.text.encode('utf-8', 'replace'),
            tiddlyweb_cookie))
        twik_socket.shutdown(socket.SHUT_WR)

        output = ''
        try:
            while True:
                data = twik_socket.recv(1024)
                if data:
                    output += data
                else:
                    break
        finally:
            twik_socket.shutdown(socket.SHUT_RDWR)
            twik_socket.close()
    except (socket.error, IOError), exc:
        if exc.errno == 57:
            twik_socket.close()
        else:
            logging.warn('twikifier error during data processing: %s', exc)
            output = """
    <div class='error'>There was a problem rendering this tiddler.
    The raw text is given below.</div>
    <pre class='wikitext'>%s</pre>
    """ % (escape_attribute_value(tiddler.text))
            twik_socket.shutdown(socket.SHUT_RDWR)
            twik_socket.close()
            return output

    return _process_for_transclusion(output, tiddler, environ)


def _process_for_transclusion(output, tiddler, environ):
    """
    Process the output for transclusions.
    """
    if 'twikified.seen_titles' in environ:
        seen_titles = environ['twikified.seen_titles']
    else:
        seen_titles = []

    parser = html5lib.HTMLParser(
            tree=html5lib.treebuilders.getTreeBuilder("dom"))

    output = output.decode('utf-8', 'replace')
    try:
        dom = parser.parse('<div>' + output + '</div>')
        spans = dom.getElementsByTagName('span')
        for span in spans:
            for attribute in span.attributes.keys():
                if attribute == 'tiddler':
                    attr = span.attributes[attribute]
                    interior_title = attr.value
                    try:
                        span_class = span.attributes['class'].value
                        if span_class.startswith('@'):
                            interior_recipe = span_class[1:] + '_public'
                        else:
                            interior_recipe = ''
                    except KeyError:
                        interior_recipe = ''
                    title_semaphore = '%s:%s' % (interior_title,
                            interior_recipe)
                    if title_semaphore not in seen_titles:
                        seen_titles.append(title_semaphore)
                        interior_tiddler = Tiddler(interior_title)
                        try:
                            store = environ['tiddlyweb.store']
                            if interior_recipe:
                                recipe = store.get(Recipe(interior_recipe))
                                interior_tiddler.recipe = interior_recipe
                                interior_tiddler.bag = (
                                        determine_bag_from_recipe(
                                            recipe, interior_tiddler,
                                            environ).name)
                            else:
                                if tiddler.recipe:
                                    interior_tiddler.recipe = tiddler.recipe
                                    recipe = store.get(Recipe(tiddler.recipe))
                                    interior_tiddler.bag = (
                                            determine_bag_from_recipe(
                                                recipe, interior_tiddler,
                                                environ).name)
                                else:
                                    interior_tiddler.bag = tiddler.bag
                            interior_bag = store.get(Bag(interior_tiddler.bag))
                            interior_bag.policy.allows(
                                    environ['tiddlyweb.usersign'], 'read')
                            interior_tiddler = store.get(interior_tiddler)
                        except (StoreError, PermissionsError):
                            continue
                        if renderable(interior_tiddler, environ):
                            environ['twikified.seen_titles'] = seen_titles
                            interior_content = render_wikitext(
                                    interior_tiddler, environ)
                            interior_dom = parser.parse('<div>' +
                                    interior_content
                                    + '</div>')
                            span.appendChild(
                                    interior_dom.getElementsByTagName(
                                        'div')[0])

        output = dom.getElementsByTagName('div')[0].toxml()
    except ExpatError, exc:
        # If expat couldn't process the output, we need to make it
        # unicode as what came over the socket was utf-8 but expat
        # needs that in the first place.
        logging.warn('got expat error: %s:%s %s',
                tiddler.bag, tiddler.title, exc)
        output = output.decode('utf-8', 'replace')
    return output
