function createSpaceLink(place, spaceName, title, alt) {
  var link, a;
  // XXX this needs to come from config or parameters
  link = serverOptions.host;

  // assumes a http URI without user:pass@ prefix
  link = link.replace("http://", "http://" + spaceName.toLowerCase() + ".");

  if (title) {
    a = createExternalLink(place, link + "/" +
      encodeURIComponent(title), alt || title);
  } else {
    a = createExternalLink(place, link, alt || spaceName);
  }
  jQuery(a).addClass('tiddlySpaceLink').attr('tiddler', title);
  jQuery(a).attr('tiddlyspace', spaceName);
  return a;
}