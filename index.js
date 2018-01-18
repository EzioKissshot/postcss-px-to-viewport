'use strict';

var postcss = require('postcss');
var objectAssign = require('object-assign');

// excluding regex trick: http://www.rexegg.com/regex-best-trick.html
// Not anything inside double quotes
// Not anything inside single quotes
// Not anything inside url()
// Any digit followed by px
// !singlequotes|!doublequotes|!url()|pixelunit
var pxRegex = /"[^"]+"|'[^']+'|url\([^\)]+\)|(\d*\.?\d+)px/ig;

/**
  Actually forked repo from evrone only handled vw unit, it will broken when using vh
  So first we give two option: 1. all convert to vw 2. vw for width and vh for height/line-height. To fit my requirement. 
  vh for height will make when actual viewport height and width's ratio change a lot, the page can have a consistent experience
*/
var defaults = {
  viewportWidth: 320,
  viewportHeight: 568,
  unitPrecision: 5,
  vhForHeightProps: true,
  selectorBlackList: [],
  minPixelValue: 1,
  mediaQuery: false
};

module.exports = postcss.plugin('postcss-px-to-viewport', function (options) {

  var opts = objectAssign({}, defaults, options);
  var pxReplace = createPxReplace(opts);

  return function (css) {

    css.walkDecls(function (decl, i) {
      // This should be the fastest test and will remove most declarations
      if (decl.value.indexOf('px') === -1) return;

      if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

      // TODO: maybe more precise match
      var isUseVh = opts.vhForHeightProps && (decl.prop.search(/height/i)!==-1)
      decl.value = decl.value.replace(pxRegex, pxReplace(isUseVh));
    });

    if (opts.mediaQuery) {
      css.walkAtRules('media', function (rule) {
        if (rule.params.indexOf('px') === -1) return;
        rule.params = rule.params.replace(pxRegex, pxReplace(false));
      });
    }

  };
});

function createPxReplace(opts) {
  return function (isUseVh) {
    return function (m, $1) {
      if (!$1) return m;
      var pixels = parseFloat($1);
      if (pixels <= opts.minPixelValue) return m;
      return isUseVh ? 
      (toFixed((pixels / opts.viewportHeight * 100), opts.unitPrecision) + 'vh') :
      (toFixed((pixels / opts.viewportWidth * 100), opts.unitPrecision) + 'vw');
    };
  }
}

function toFixed(number, precision) {
  var multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return Math.round(wholeNumber / 10) * 10 / multiplier;
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== 'string') return;
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1;
    return selector.match(regex);
  });
}
