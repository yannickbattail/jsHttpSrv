/**
 * 
 */
var xmlEntities = function() {};

xmlEntities.entities = {
  '&quot;' : '"',
  '&amp;' : '&',
  '&apos;' : '\'',
  '&lt;' : '<',
  '&gt;' : '>'
};

xmlEntities.encode = function(input) {
  input = String(input);
  for ( var entitiy in xmlEntities.entities) {
    var chr = xmlEntities.entities[entitiy];
    entitiy = input.replace(new RegExp(chr, 'g'), entitiy);
  }
  return input;
};

xmlEntities.decode = function(input) {
  input = String(input);
  for ( var entitiy in xmlEntities.entities) {
    var chr = xmlEntities.entities[entitiy];
    entitiy = input.replace(new RegExp(entitiy, 'g'), chr);
  }
  return input;
};

libUtil.xmlEntities = xmlEntities;
