(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

(function () {
  var doc = document;
  var cleanWidgets = function cleanWidgets() {
    var widgets = void 0;
    var i = void 0;
    var j = void 0;
    if (doc.getElementsByClassName) {
      widgets = doc.getElementsByClassName('trustpilot-widget');
    } else if (doc.querySelectorAll) {
      widgets = doc.querySelectorAll('.trustpilot-widget');
    } else {
      var arrayOfElements = [];
      var regularExpression = new RegExp('(^| )trustpilot-widget( |$)');
      var allElements = doc.body.getElementsByTagName('*');
      for (i = 0, j = allElements.length; i < j; i++) {
        if (regularExpression.test(allElements[i].className)) {
          arrayOfElements.push(allElements[i]);
        }
      }
      widgets = arrayOfElements;
    }

    for (i = 0; i < widgets.length; ++i) {
      var widget = widgets[i];
      while (widget.firstChild && widget.firstChild.tagName !== 'IFRAME') {
        widget.removeChild(widget.firstChild);
      }
    }
  };

  if (doc.readyState !== 'loading') {
    cleanWidgets(); // when injected into config page dom is already loaded
  }
  if (doc.addEventListener) {
    doc.addEventListener('DOMContentLoaded', cleanWidgets);
  } else {
    window.attachEvent('onload', cleanWidgets);
  }

  var widgetIFrameOrigin = '#{WidgetRoot}';

  var scriptTag = doc.createElement('script');
  scriptTag.src = widgetIFrameOrigin + '/bootstrap/v5/tp.widget.bootstrap.min.js';
  scriptTag.async = true;
  doc.querySelector('head').appendChild(scriptTag);
})();

},{}]},{},[1]);
