(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  require.reset = function() {
    modules = {};
    cache = {};
    aliases = {};
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var result = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  require.brunch = true;
  require._cache = cache;
  globals.require = require;
})();
require.register("app/controller.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = controller;

var _pipeline = require("../lib/pipeline");

var _pipeline2 = _interopRequireDefault(_pipeline);

var _exception = require("../lib/utils/exception");

var _exception2 = _interopRequireDefault(_exception);

var _draw = require("./draw");

var _draw2 = _interopRequireDefault(_draw);

var _error = require("../lib/error");

var _error2 = _interopRequireDefault(_error);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Controller
 * @return {Object} Not really, just testing
 */
/** 
 * @module app/controller
 */

// import sketchFsm from "../lib/sketchFsm";
function controller() {

  document.getElementById("bGeneration").addEventListener("click", function () {
    var container = document.getElementById("autoimg");
    cleanup(container);
    var error_container = document.getElementById("autospec").getElementsByTagName("textarea")[1];
    error_container.value = "";
    var aml = document.getElementById("autospec").getElementsByTagName("textarea")[0].value;
    var fsm = (0, _pipeline2.default)(aml);
    if ((0, _exception2.default)(fsm)) {
      error_container.value = (0, _error2.default)(fsm);
    } else {
      log.warn("dagre graph");
      fsm.layout();
      (0, _draw2.default)(fsm, "#autoimg");
    }
  });
}

function cleanup(container) {
  var child = void 0;
  while (child = container.firstChild) {
    container.removeChild(child);
  }
}

});

;require.register("app/draw.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _d = require("d3");

var _d2 = _interopRequireDefault(_d);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = draw;


var stateDimensions = function stateDimensions(statesG) {
  var minRadius = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var text = statesG.append("text").html(function (d) {
    return d.label();
  });

  var data = text.data();
  var nodes = text[0];

  for (var i = 0, bbox; i < data.length; i++) {
    bbox = nodes[i].getBBox();
    data[i].width(Math.max(minRadius * 2, bbox.width)).height(Math.max(minRadius * 2, bbox.height));
    nodes[i].remove();
  }
};

var gatherLines = function gatherLines(lines, x) {
  var dy = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  if (lines.length === 1) {
    return lines[0].join(", ");
  }
  return lines.map(function (l, i) {
    var end = i < lines.length - 1 ? "," : "";
    if (i == 0) {
      return "<tspan x=" + x + " dy=" + dy + ">" + l.join(", ") + end + "</tspan>";
    }
    return "<tspan x=" + x + " dy=\"8pt\">" + l.join(", ") + end + "</tspan>";
  }).join("");
};

var edgeDimensions = function edgeDimensions(edgesG, maxWidth) {
  var minRadius = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
  var padRadius = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

  var text = edgesG.append("text");

  var data = text.data();
  var nodes = text[0];

  for (var i = 0, node, labels, lines; i < data.length; i++) {
    node = nodes[i];
    labels = data[i].symbols.map(function (a) {
      return a.label;
    });
    lines = [];
    for (var j = 0; j < labels.length; j++) {
      node.innerHTML = labels[j];
      var k = 1;
      while (node.getBBox().width < maxWidth && j + k < labels.length) {
        node.innerHTML = node.innerHTML + ", " + labels[j + k];
        k++;
      }
      lines.push(labels.slice(j, j + k));
      j = j + k - 1;
    }
    data[i].lines = lines;
    node.innerHTML = gatherLines(data[i].lines, 0);

    var _node$getBBox = node.getBBox();

    var width = _node$getBBox.width;
    var height = _node$getBBox.height;

    data[i].width(Math.max(minRadius * 2, width + padRadius * 2)).height(Math.max(minRadius * 2, height + padRadius * 2));
    node.remove();
  }
};

var lineGenerator = _d2.default.svg.line().x(function (d) {
  return d.x;
}).y(function (d) {
  return d.y;
}).interpolate("bundle").tension(0.7);

var sq = function sq(x) {
  return x * x;
};

var sign = function sign(b) {
  return (b | 0) * 2 - 1;
};

var intersection = function intersection(h, w, xA, yA, x0, y0) {
  return {
    x: x0 + sign(xA > x0) * Math.sqrt(0.5 / (sq(1 / w) + sq((yA - y0) / (h * (xA - x0))))),
    y: y0 + sign(yA > y0) * Math.sqrt(0.5 / (sq(1 / h) + sq((xA - x0) / (w * (yA - y0)))))
  };
};

var applyOffset = function applyOffset(offset, x, y, x0, y0) {
  var r = offset / Math.sqrt(sq(x - x0) + sq(y - y0));
  return {
    x: x + (x - x0) * r,
    y: y + (y - y0) * r
  };
};

var fixIntersections = function fixIntersections(edges) {
  var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

  var from = void 0,
      to = void 0,
      points = void 0,
      start = void 0,
      end = void 0,
      newStart = void 0,
      newEnd = void 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = edges[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var e = _step.value;

      from = e.from;
      to = e.to;
      points = e.points();
      start = points[0];
      end = points[points.length - 1];
      newStart = intersection(from.height(), from.width(), start.x, start.y, from.x(), from.y());
      newEnd = intersection(to.height(), to.width(), end.x, end.y, to.x(), to.y());
      points.splice(1, 0, newStart);
      points.splice(points.length - 1, 0, applyOffset(offset, newEnd.x, newEnd.y, to.x(), to.y()));
      e.points(points);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
};

function draw(fsm, container, cfg) {

  // Gather width and height from labels
  // Layout
  // Draw
  cleanup(container);

  var svg = _d2.default.select(container).append("svg");

  var defs = svg.append("defs");

  var arrowWidth = 8;
  var arrowHeight = 6;

  defs.append("marker").attr({
    "id": "arrow",
    "refX": 0,
    "refY": arrowHeight / 2,
    "markerWidth": arrowWidth,
    "markerHeight": arrowHeight,
    "markerUnits": "userSpaceOnUse",
    "orient": "auto"
  }).append("path").attr("d", "M0,0 L0," + arrowHeight + " L" + arrowWidth + "," + arrowHeight / 2 + " z").attr("class", "arrowHead");

  var g = svg.append("g");
  svg.call(_d2.default.behavior.zoom().on("zoom", zoom(g)));

  var states = Array.from(fsm.states.all());
  var edges = Array.from(fsm.edges.all());

  var edgesG = g.selectAll(".edge").data(edges).enter().append("g").attr("class", "edge");

  var statesG = g.selectAll(".state").data(states).enter().append("g").attr("class", "state");

  stateDimensions(statesG, 12);
  edgeDimensions(edgesG, 20, 4, 2);

  fsm.layout();

  fixIntersections(edges, arrowWidth);

  drawEllipses(statesG);

  // statesG.filter((d) => d.initial);

  showControlPoints(edges, g);

  edgesG.append("text").attr("x", function (d) {
    return d.x();
  }).attr("y", function (d) {
    return d.y();
  }).attr("text-anchor", "middle").attr("dominant-baseline", function (d) {
    return d.lines.length > 1 ? "text-before-edge" : "central";
  }).html(function (d) {
    return gatherLines(d.lines, d.x(), -d.height() / 2);
  });

  statesG.append("text").attr("x", function (d) {
    return d.x();
  }).attr("y", function (d) {
    return d.y();
  }).attr("text-anchor", "middle").attr("dominant-baseline", "central").html(function (d) {
    return d.label();
  });

  edgesG.append("path").attr("d", function (d) {
    var points = d.points();
    points.splice(0, 1);
    points.splice(points.length - 1, 1);
    return lineGenerator(points);
  }).attr("marker-end", "url(#arrow)");
}

var drawEllipses = function drawEllipses(statesG) {
  statesG.append("ellipse").attr("rx", function (d) {
    return d.width() / Math.sqrt(2);
  }).attr("ry", function (d) {
    return d.height() / Math.sqrt(2);
  }).attr("cx", function (d) {
    return d.x();
  }).attr("cy", function (d) {
    return d.y();
  });
};

var zoom = function zoom(g) {
  return function () {
    g.attr("transform", "translate(" + _d2.default.event.translate + ")scale(" + _d2.default.event.scale + ")");
  };
};

var showControlPoints = function showControlPoints(edges, svg) {

  var points = Array.prototype.concat.apply([], edges.map(function (e) {
    return e.points();
  }));
  svg.selectAll(".point").data(points).enter().append("circle").attr("class", "point").attr("r", 1.5).attr("cx", function (d) {
    return d.x;
  }).attr("cy", function (d) {
    return d.y;
  }).style("fill", "#FF7777");

  svg.selectAll(".state").append("rect").attr("x", function (d) {
    return d.x() - d.width() / 2;
  }).attr("y", function (d) {
    return d.y() - d.height() / 2;
  }).attr("width", function (d) {
    return d.width();
  }).attr("height", function (d) {
    return d.height();
  }).style("fill", "#55CCFF");

  svg.selectAll(".edge").append("rect").attr("x", function (d) {
    return d.x() - d.width() / 2;
  }).attr("y", function (d) {
    return d.y() - d.height() / 2;
  }).attr("width", function (d) {
    return d.width();
  }).attr("height", function (d) {
    return d.height();
  }).style("fill", "#AAFFAA");
};

var cleanup = function cleanup(container) {
  if (container === undefined) {
    return;
  }
  container = _d2.default.select(container);
  var child = void 0;
  while (child = container.firstChild) {
    container.removeChild(child);
  }
};

});

require.register("app/errors.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = main;

var _check = require("../lib/utils/check");

var _pipeline = require("../lib/pipeline");

var _pipeline2 = _interopRequireDefault(_pipeline);

var _error = require("../lib/error");

var _error2 = _interopRequireDefault(_error);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errors = ["ALDToken", "existingId", "wrongType", "unknownProp", "syntax", "unknownId", "fsmType", "MBToken"];

function main() {
  var container = document.getElementsByClassName("container")[0];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var e = _step.value;

      var row = document.createElement("div");
      row.id = "error-" + e;
      row.classList.add("row", "bottom");
      container.appendChild(row);
      var autospec = document.createElement("div");
      autospec.classList.add("autospec", "one-half", "column");
      var textarea = document.createElement("textarea");
      var path = "errors/" + e + ".aml";
      textarea.readonly = true;
      autospec.appendChild(textarea);
      row.appendChild(autospec);
      var errorLog = document.createElement("div");
      errorLog.classList.add("errorlog", "one-half", "column");
      row.appendChild(errorLog);
      populate(textarea, errorLog, path);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function populate(textarea, errorLog, path) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      textarea.value = xhttp.responseText;
      var fsm = (0, _pipeline2.default)(textarea.value);
      if (!(0, _check.exception)(fsm)) {
        log.error("Waiting for an error from " + path);
        log.error(fsm);
        return;
      }
      var errorTA = document.createElement("textarea");
      errorTA.value = (0, _error2.default)((0, _error.firstError)(fsm));
      errorLog.appendChild(errorTA);
    }
  };
  xhttp.open("GET", path, true);
  xhttp.send();
}

});

;require.register("app/examples.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = main;

var _check = require("../lib/utils/check");

var _pipeline = require("../lib/pipeline");

var _pipeline2 = _interopRequireDefault(_pipeline);

var _draw = require("./draw");

var _draw2 = _interopRequireDefault(_draw);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var figures = ["1-1", "1-2", "2-1-a", "2-1-b", "2-1-c", "2-2-a", "2-2-b", "2-2-c", "2-4"];

function main() {
  var container = document.getElementsByClassName("container")[0];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = figures[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var f = _step.value;

      var row = document.createElement("div");
      row.id = "figure" + f;
      row.classList.add("row", "bottom");
      container.appendChild(row);
      var autospec = document.createElement("div");
      autospec.classList.add("autospec", "one-half", "column");
      var textarea = document.createElement("textarea");
      var path = "figures/figure" + f + ".aml";
      textarea.readonly = true;
      autospec.appendChild(textarea);
      row.appendChild(autospec);
      var autoimg = document.createElement("div");
      autoimg.classList.add("autoimg", "one-half", "column");
      row.appendChild(autoimg);
      populate(textarea, autoimg, path);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function populate(textarea, autoimg, path) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      textarea.value = xhttp.responseText;
      var fsm = (0, _pipeline2.default)(textarea.value);
      if ((0, _check.exception)(fsm)) {
        log.debug(fsm.message);
        return;
      }
      (0, _draw2.default)(fsm, autoimg);
    }
  };
  xhttp.open("GET", path, true);
  xhttp.send();
}

});

;require.register("app/index.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = main;

var _controller = require("./controller");

var _controller2 = _interopRequireDefault(_controller);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function main() {
  defaultText("example.aml");
  (0, _controller2.default)();
}

function defaultText(file) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      document.getElementById("autospec").getElementsByTagName("textarea")[0].value = xhttp.responseText;
    }
  };
  xhttp.open("GET", file, true);
  xhttp.send();
}

});

;require.register("app/layout.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = layout;
function layout() {

  var automata = {
    type: "finite",
    alphabet: [],
    states: [],
    transitions: []
  };

  var accessor = {};

  accessor.automata = function (x) {
    if (!arguments.length) return automata;
    automata = x;
    x.transitions.forEach(function (t) {
      if (typeof t.source == "number") t.source = x.states[t.source];
      if (typeof t.target == "number") t.target = x.states[t.target];
      if (typeof t.symbol == "number") t.symbol = x.alphabet[t.symbol];
    });
    return accessor;
  };

  accessor.lay = function () {
    automata.states.forEach(function (s, i) {
      s.x = 50 + i % 3 * 120;
      s.y = 50 + (i / 3 | 0) * 120;
    });
    return accessor;
  };

  return accessor;
}

});

;require.register("lib/error.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = stringifyError;
exports.firstError = firstError;

var _check = require("./utils/check");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function stringifyError(e) {
  var _treat;

  var error = firstError(e);
  // for(let prop of Object.keys(exception)) {
  //   log.debug(prop);
  //   log.debug(exception[prop]);
  // }
  var treat = (_treat = {}, _defineProperty(_treat, _check.exception.ALDToken, function (e) {
    var _translate = translate(e.type);

    var name = _translate.name;
    var undefinedArticle = _translate.undefinedArticle;

    return "Le bloc " + (undefinedArticle + name) + " " + e.value + " redéfini en " + printLoc(e.loc2) + " est déjà défini en " + printLoc(e.loc1);
  }), _defineProperty(_treat, _check.exception.existingId, function (e) {
    var _translate2 = translate(e.type);

    var name = _translate2.name;
    var undefinedArticle = _translate2.undefinedArticle;

    return "L'identifiant " + (undefinedArticle + name) + " " + e.value + " redéfini en " + printLoc(e.loc2) + " est déjà défini en " + printLoc(e.loc1);
  }), _defineProperty(_treat, _check.exception.wrongType, function (e) {
    return "La valeur déclarée en " + printLoc(e.loc) + " doit être de type " + e.type;
  }), _defineProperty(_treat, _check.exception.unknownProp, function (e) {
    return "L'attribut " + e.propertyName + " défini en " + printLoc(e.loc) + " n'est pas supporté";
  }), _defineProperty(_treat, _check.exception.syntax, treatSyntaxException), _defineProperty(_treat, _check.exception.unknownId, function (e) {
    return "Identifiant " + e.value + " utilisé en " + printLoc(e.loc) + " inconnu.";
  }), _defineProperty(_treat, _check.exception.fsmType, function (e) {
    return e.type + " (" + printLoc(e.loc) + ") n'est pas un type d'automate valide.";
  }), _defineProperty(_treat, _check.exception.MBToken, function (e) {
    var _translate3 = translate(e.type);

    var name = _translate3.name;
    var undefinedArticle = _translate3.undefinedArticle;

    return "Le bloc " + (undefinedArticle + name) + " est manquant.";
  }), _defineProperty(_treat, "default", function _default(e) {
    return log.debug("UNHANDLED ERROR " + e.name + "\n " + e.message);
  }), _treat);
  return error.name + " : " + error.dispatch(treat);
}

function firstError(e) {
  var _e$dispatch;

  return e.dispatch((_e$dispatch = {}, _defineProperty(_e$dispatch, _check.exception.array, function (e1) {
    return firstError(e1.exceptions.filter(function (e2) {
      return e2 != null;
    })[0]);
  }), _defineProperty(_e$dispatch, _check.exception.object, function (e1) {
    return firstError(e1.exceptions[Object.keys(e1.exceptions)[0]]);
  }), _defineProperty(_e$dispatch, "default", function _default(e1) {
    return e1;
  }), _e$dispatch));
}

// TODO
// Use a real localisation framework
function translate(type) {
  switch (type) {
    case "states":
      return {
        name: "états",
        undefinedArticle: "des "
      };
    case "symbols":
      return {
        name: "symboles",
        undefinedArticle: "des "
      };
    case "transitions":
      return {
        name: "transitions",
        undefinedArticle: "des "
      };
    case "state":
      return {
        name: "état",
        undefinedArticle: "d'"
      };
    case "symbol":
      return {
        name: "symbole",
        undefinedArticle: "de "
      };
    case "transition":
      return {
        name: "transition",
        undefinedArticle: "de "
      };
    default:
      throw new Error("Cannot translate " + type + ".");
  };
}

function printLoc(loc) {
  return "0:0";
  // return loc.start.line + ":" + loc.start.column;
}

function treatSyntaxException(e) {
  var expected = e.expected.map(function (ex) {
    if (ex.value === "[ \\t\\n\\r]") {
      return "espace, tabuluation, saut de ligne, retour chariot";
    }
    return ex;
  }).join("\n");
  return "Erreur de syntaxe en " + printLoc(e.location) + ". " + e.found + " trouvé.\n    Tokens autorisés : " + expected;
}

});

;require.register("lib/fsm.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @module lib/fsm
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @requires lib/utils/iterator
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @requires lib/utils/descriptor
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

exports.default = fsm;

var _iterator4 = require("./utils/iterator");

var utilsIterator = _interopRequireWildcard(_iterator4);

var _check = require("./utils/check");

var _check2 = _interopRequireDefault(_check);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @param {?module:lib/fsm~Cfg} cfg
 */
function fsm(cfg) {
  return new Fsm(cfg);
}

var checks = {};

/**
 * A function that augments a class.
 *
 * It should not mutate its argument and return a new constructor that
 * implements a compatible interface.
 * @callback Mixin
 * @param {Class} inputClass
 * @return {Class} outputClass
 * @global
 */

var identity = function identity(x) {
  return x;
};

// FIXME
// checks.Mixin = check().defaults(identity).instanceOf(Function);
checks.Mixin = (0, _check2.default)().instanceOf(Function);

/**
 * An object literal that holds data meant to be digested by a constructor.
 * @typedef Descriptor
 * @type mdn:Object
 * @global
 */

/**
 * Mixins to be applied on the inner classes of a finite state machine.
 *
 * Each inner class is replaced by the output of the corresponding mixin.
 * This is used to augment the functionalities before instanciation.
 * Make sure to keep every method defined.
 * @typedef Mixins
 * @property {Mixin} symbols
 * The mixin that will be applied on {@link module:fsm~Fsm~Symbol}.
 * @property {Mixin} states
 * The mixin that will be applied on {@link module:fsm~Fsm~State}.
 * @property {Mixin} transitions
 * The mixin that will be applied on {@link module:fsm~Fsm~Transition}.
 */
checks.FsmMixins = (0, _check2.default)().object({
  symbols: checks.Mixin,
  states: checks.Mixin,
  transitions: checks.Mixin
});

/**
 * Descriptors defining the default values for each inner class
 *
 * When passing a descriptor through the `add` method,
 * it checks for every property defined in the respective default
 * descriptor. If the value of such property is missing, it is replaced
 * by the one in the default descriptor.
 * @typedef Defaults
 * @type Descriptor
 * @property {Descriptor} symbols
 * Default descriptor for the symbols.
 * @property {Descriptor} states
 * Default descriptor for the states.
 * @property {Descriptor} transitions
 * Default descriptor for the transitions.
 */
// checks.FsmDefaults = check().object({
//   symbols: checks.descriptor,
//   states: checks.descriptor,
//   transitions: checks.descriptor
// });

/**
 * Descriptor for the data of a finite state machine
 *
 * Each property should hold an array of descriptors that will be passed
 * to the respective `add` method at instanciation.
 * The `from`, `to` and `by` fields of the transitions' descriptors should
 * hold the indexes of the corresponding state or symbol in the other arrays.
 * @typedef FsmDescriptor
 * @type Descriptor
 * @property {Array.<Descriptor>} symbols
 * An array of descriptors used to create the symbols.
 * @property {Array.<Descriptor>} states
 * An array of descriptors used to create the states.
 * @property {Array.<Descriptor>} transitions
 * An array of descriptors used to create the transitions. Beware of the
 * `from`, `to` and `by` properties.
 */
// checks.FsmDescriptor = check().object({
// });
// cfg = check().definition({
//   mixins: check().definition({
//     symbols: checks.mixin,
//     states: checks.mixin,
//     transitions: checks.mixin
//   }),
//   descriptor: check().definition({
//     symbols: check().array((a) => Symbol.add(a)),
//     states: check().array((s) => State.add(s)),
//     transitions: check().array(checks.transitionNum),
//   })
// });

/**
 * A configuration object for a finite state machine
 * @typedef Cfg
 * @type Object
 * @property {Mixins} mixins
 * Used to extend the functionalities of the finite state machine.
 * @property {FsmDescriptor} descriptor - The initial data.
 */
checks.Cfg = (0, _check2.default)().object({
  mixins: checks.FsmMixins
});

/**
 * @constructor
 * @param {module:lib/fsm~Cfg} cfg={}
 * @protected
 */
function Fsm(cfg) {

  // Data

  // symbols: Map of:
  //   - keys: symbols ; let `a` be the key
  //   - values: objects with:
  //     - transitions: Set of transitions, where `by = a`
  // states: Map of:
  //  - keys: states ; let `k` be the key
  //  - values: objects with:
  //    - initial: boolean
  //    - final: boolean
  //    - pred : Map of:
  //      - keys: symbols ; let `a` be the key
  //      - values: Set of transitions, where `to = k` and `by = a`
  //    - succ: Map of:
  //      - keys: states ; let `s` be the key
  //      - values: Map of:
  //        - keys: symbols ; let `a` be the key
  //        - values: transition, where `to = s`, `from = k` and `by = a`
  // transitions: Map of:
  //   - keys: transitions
  //   - values: objects with:
  //     - from: state
  //     - to: state
  //     - by: symbol

  cfg = checks.Cfg.resolve(cfg);

  var data = {
    symbols: new Map(),
    states: new Map(),
    transitions: new Map()
  };

  var struct = this;

  // API

  /**
   * @class
   * @memberof module:lib/fsm~Fsm
   * @inner
   * @protected
   */

  var _Symbol = function () {
    function _Symbol() {
      _classCallCheck(this, _Symbol);
    }

    _createClass(_Symbol, [{
      key: "struct",

      /**
       * The accessor of the finite state machine owning the symbol.
       * @type {module:lib/fsm} 
       * @readonly
       */
      get: function get() {
        return struct;
      }
      /**
       * Iterates on the symbols owned by the finite state machine.
       * @return {Iterator.<module:lib/fsm~Fsm~Symbol>} an iterator of every symbol
       */

    }], [{
      key: "all",
      value: function all() {
        return getSymbols(data);
      }
      /**
       * Creates a symbol, adds it to the finite state machine and returns it.
       *
       * The symbol has the prototype of the calling class.
       * @return {module:lib/fsm~Fsm~Symbol} the newly created symbol
       */

    }, {
      key: "add",
      value: function add() {
        return addSymbol({}, new AugmentedSymbol(arguments), data);
      }
      /**
       * Removes a symbol and its associated transitions. Chainable.
       *
       * If there is no such symbol, the function silently fails and still
       * returns the accessor.
       * @param {module:lib/fsm~Fsm~Symbol} symbol - symbol to remove
       * @return {module:lib/fsm} the accessor of the finite state machine
       */

    }, {
      key: "remove",
      value: function remove(symbol) {
        symbol = checks.Symbol.remove.resolve(symbol);
        if ((0, _check.exception)(symbol)) return symbol;
        removeSymbol(symbol, data);
        return struct;
      }
    }]);

    return _Symbol;
  }();

  ;

  /**
   * @class
   * @memberof module:lib/fsm~Fsm
   * @inner
   * @protected
   */

  var State = function () {
    function State() {
      _classCallCheck(this, State);
    }

    _createClass(State, [{
      key: "struct",

      /**
       * The accessor of the finite state machine owning the symbol
       * @type {module:lib/fsm} 
       * @readonly
       */
      get: function get() {
        return struct;
      }
      /**
       * Whether the state is initial
       * @type {boolean} 
       * @readonly
       */

    }, {
      key: "initial",
      get: function get() {
        return data.states.get(this).initial;
      }
      /**
       * Whether the state is terminal
       * @type {boolean} 
       * @readonly
       */

    }, {
      key: "terminal",
      get: function get() {
        return data.states.get(this).terminal;
      }
      /**
       * @return {Iterator.<module:lib/fsm~Fsm~State>} every state
       */

    }], [{
      key: "all",
      value: function all() {
        return getStates(data);
      }
      /**
       * Removes a state and the associated transitions
       * @param {module:lib/fsm~Fsm~State} state - state to remove
       * @return {module:lib/fsm} the finite state machine
       */

    }, {
      key: "remove",
      value: function remove(state) {
        // state = checks.State.remove.resolve(state); TODO
        if ((0, _check.exception)(state)) return state;
        removeState(state, data);
        return struct;
      }
      /**
       * Creates and adds a state
       * @param {?Object} descriptor state descriptor
       * @param {?boolean} descriptor.initial false if omitted
       * @param {?boolean} descriptor.terminal false if omitted
       * @return {module:lib/fsm~Fsm~Transition} the newly created state
       */

    }, {
      key: "add",
      value: function add(descriptor) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        // descriptor = checks.State.add.resolve(descriptor); TODO
        descriptor = Object.assign({}, descriptor);
        if ((0, _check.exception)(descriptor)) return descriptor;
        return addState(descriptor, new AugmentedState(arguments), data);
      }
    }]);

    return State;
  }();

  ;

  /**
   * @class
   * @memberof module:lib/fsm~Fsm
   * @inner
   * @protected
   */

  var Transition = function () {
    function Transition() {
      _classCallCheck(this, Transition);
    }

    _createClass(Transition, [{
      key: "struct",

      /**
       * The accessor of the finite state machine that owns the transition
       * @type {module:lib/fsm} 
       * @readonly
       */
      get: function get() {
        return struct;
      }
      /**
       * The source of the transition
       * @type {module:lib/fsm~Fsm~State} 
       * @readonly
       */

    }, {
      key: "from",
      get: function get() {
        return data.transitions.get(this).from;
      }
      /**
       * The target of the transition
       * @type {module:lib/fsm~Fsm~State} 
       * @readonly
       */

    }, {
      key: "to",
      get: function get() {
        return data.transitions.get(this).to;
      }
      /**
       * The symbol of the transition
       * @type {module:lib/fsm~Fsm~State} 
       * @readonly
       */

    }, {
      key: "by",
      get: function get() {
        return data.transitions.get(this).by;
      }
      /**
       * @return {Iterator.<module:lib/fsm~Fsm~Transition>} every transition
       */

    }], [{
      key: "all",
      value: function all() {
        return getTransitions(data);
      }
      /**
       * Get a transition
       * @function
       * @param {Object} descriptor
       * @param {!module:lib/fsm~Fsm~State} descriptor.from source
       * @param {!module:lib/fsm~Fsm~State} descriptor.to target
       * @param {!module:lib/fsm~Fsm~Symbol} descriptor.by symbol
       * @return {module:lib/fsm~Fsm~Transition}
       * @throws {TypeError} Will throw if the descriptor is invalid
       */

    }, {
      key: "get",
      value: function get(descriptor) {
        // descriptor = checks.Transition.get.resolve(descriptor); TODO
        descriptor = Object.assign({}, descriptor);
        if ((0, _check.exception)(descriptor)) return descriptor;
        return getTransition(descriptor.from, descriptor.to, descriptor.by, data);
      }
      /**
       * Creates and adds a transition
       *
       * If an equivalent transition already exists, the function returns it
       * (thus failing silently)
       * @param {Object} descriptor
       * @param {!module:lib/fsm~Fsm~State} descriptor.from source
       * @param {!module:lib/fsm~Fsm~State} descriptor.to target
       * @param {!module:lib/fsm~Fsm~Symbol} descriptor.by symbol
       * @return {module:lib/fsm~Fsm~Transition} the newly created transition
       */

    }, {
      key: "add",
      value: function add(descriptor) {
        // descriptor = checks.Transition.add.resolve(descriptor); TODO
        descriptor = Object.assign({}, descriptor);
        if ((0, _check.exception)(descriptor)) return descriptor;
        return addTransition(descriptor, new AugmentedTransition(arguments), data);
      }
      /**
       * Removes a transition
       * @param {module:lib/fsm~Fsm~Transition} transition - transition to remove
       * @return {module:lib/fsm} the finite state machine
       */

    }, {
      key: "remove",
      value: function remove(transition) {
        // transition = checks.Transition.remove.resolve(transition); TODO
        if ((0, _check.exception)(transition)) return transition;
        removeTransition(transition);
        return struct;
      }
      /**
       * Creates an iterator of transitions that match the selector attributes
       * @param {Object} selector
       * @param {?module:lib/fsm~Fsm~State} selector.from source
       * @param {?module:lib/fsm~Fsm~State} selector.to target
       * @param {?module:lib/fsm~Fsm~Symbol} selector.by symbol
       * @return {Iterator.<module:lib/fsm~Fsm~Transition>} the selected transitions
       */

    }, {
      key: "select",
      value: function select(selector) {
        // selector = checks.Transition.select.resolve(selector); TODO
        selector = Object.assign({}, selector);
        if ((0, _check.exception)(selector)) return selector;
        var args = [];
        var getter = getTransitions;
        if (selector.from != null) {
          getter = getter.from;
          args.push(selector.from);
        }
        if (selector.to != null) {
          getter = getter.to;
          args.push(selector.to);
        }
        if (selector.by != null) {
          getter = getter.by;
          args.push(selector.by);
        }
        args.push(data);
        return getter.apply(null, args);
      }

      /**
       * Creates nested iterators
       * The transitions are first split by their source state, then their target
       * states
       * @return {Iterator.<Iterator.<Iterator.<module:lib/fsm~Fsm~Transition>>>} the collection
       */

    }, {
      key: "groups",
      value: function groups() {
        return getTransitions.groups(data);
      }
    }]);

    return Transition;
  }();

  ;

  var AugmentedSymbol = cfg.mixins.symbols(_Symbol);
  var AugmentedState = cfg.mixins.states(State);
  var AugmentedTransition = cfg.mixins.transitions(Transition);

  /**
   * @type {Class}
   */
  this.symbols = AugmentedSymbol;
  /**
   * @type {Class}
   */
  this.states = AugmentedState;
  /**
   * @type {Class}
   */
  this.transitions = AugmentedTransition;
};

// Logic

// Conventions:
//   - `a` is a symbol ; `as` is a collection of symbols
//   - `s` is a state ; `ss` is a collection of states
//   - `t` is a transition ; `ts` is a collection of transitions
//   - `sf` is a source state (state from)
//   - `st` is a target state (state to)

var addSymbol = function addSymbol(o, symbol, data) {
  o.tran = new Set();
  data.symbols.set(symbol, o);
  return symbol;
};

var addState = function addState(o, state, data) {
  o.succ = new Map();
  o.pred = new Map();
  data.states.set(state, o);
  return state;
};

var addTransition = function addTransition(o, transition, data) {
  var succ = data.states.get(o.from).succ;
  var as = succ.get(o.to);
  if (as == null) {
    as = new Map();
    succ.set(o.to, as);
  }
  var t = as.get(o.by);
  // TODO transition already exists
  if (t == null) {
    t = transition;
    as.set(o.by, t);
    var pred = data.states.get(o.to).pred;
    var ts = pred.get(o.by);
    if (ts == null) {
      ts = new Set();
      pred.set(o.by, ts);
    }
    ts.add(t);
    data.symbols.get(o.by).tran.add(t);
    data.transitions.set(t, o);
  };
  return t;
};

var getTransition = function getTransition(sf, st, a, data) {
  var as = data.states.get(sf).succ.get(st);
  if (as == null) return null;
  return as.get(a);
};

var getSymbols = function getSymbols(data) {
  return data.symbols.keys();
};

var getStates = function getStates(data) {
  return data.states.keys();
};

var getTransitions = function getTransitions(data) {
  return data.transitions.keys();
};

getTransitions.groups = function () {
  return utilsIterator.apply(data.states.entries(), function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var sf = _ref2[0];
    var map1 = _ref2[1];

    var iter = utilsIterator.apply(map1.entries(), function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2);

      var st = _ref4[0];
      var map2 = _ref4[1];

      var subiter = map2.values();
      subiter.to = st;
      return subiter;
    });
    iter.from = sf;
    return iter;
  });
};

getTransitions.from = function (sf) {
  return utilsIterator.flatten(data.states.get(sf).succ.values(), function (map) {
    return map.values();
  });
};

getTransitions.to = function (st) {
  return states.get(st).pred.values();
};

getTransitions.by = function (a) {
  return symbols.get(a).transitions.values();
};

getTransitions.from.to = function (sf, st) {
  return states.get(sf).succ.get(st).values();
};

getTransitions.to.by = function (st, a) {
  return states.get(st).pred.get(a).values();
};

getTransitions.from.by = function (sf, a) {
  return utilsIterator.flatten(states.get(sf).succ.values(), function (map) {
    var t = map.get(a);
    if (t == null) {
      return utilsIterator.empty();
    }
    return utilsIterator.wrap(t);
  });
};

getTransitions.from.to.by = function (sf, st, a, data) {
  var t = getTransition(sf, st, a, data);
  if (t == null) {
    return utilsIterator.empty();
  }
  return utilsIterator.wrap(t);
};

var removeSymbol = function removeSymbol(a, data) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = getTransitions.by(a)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var t = _step.value;

      var o = data.transitions.get(t);
      data.states.get(o.from).succ.get(o.from).delete(a);
      data.states.get(o.to).pred.delete(a);
      data.transitions.delete(t);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  data.symbols.delete(a);
};

var removeState = function removeState(s, data) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = getTransitions.to(s)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var t = _step2.value;

      var o = data.transitions.get(t);
      data.states.get(o.to).succ.delete(s);
      data.symbols.get(o.by).transitions.delete(t);
      data.transitions.delete(t);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = getTransitions.from(s)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var _t = _step3.value;

      var _o = data.transitions.get(_t);
      data.states.get(_o.from).pred.get(_o.by).delete(_t);
      data.symbols.get(_o.by).transitions.delete(_t);
      data.transitions.delete(_t);
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  data.states.delete(s);
};

var removeTransition = function removeTransition(t, data) {
  var o = data.transitions.get(t);
  if (o != null) {
    data.states.get(o.from).succ.get(o.to).delete(o.by);
    data.states.get(o.to).pred.get(o.by).delete(t);
    data.symbols.get(o.by).transitions.delete(t);
    data.transitions.delete(t);
  }
};

});

require.register("lib/parser/grammar.peg", function(exports, require, module) {
"use strict";
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.default = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleIndices = { start: 0 },
        peg$startRuleIndex   = 0,

        peg$consts = [
          function(t, attrs, a) { 
              setAttrs(desc, attrs);
              setLocations(loc, attrs);
              if(desc.data.transitions == null) {
                  throw exception.create(exception.MBToken, "transitions");
              }
              return {desc, loc};
            },
          "finite automaton",
          { type: "literal", value: "finite automaton", description: "\"finite automaton\"" },
          function(t) {
                  desc.type = t;
                  loc.type = location();
              },
          "states",
          { type: "literal", value: "states", description: "\"states\"" },
          function(t, attrs, s) { 
              if(desc.data.states == null) {
                desc.data.states = s.data ;
                loc.data.states = s.location;
                desc.defaults.states = {};
                loc.defaults.states = {};
                setAttrs(desc.defaults.states, attrs);
                setLocations(loc.defaults.states, attrs);
                loc.defaults.states[locationToken] = location();
              } else {
                  throw new exception.create(exception.ALDToken, "states", loc.defaults.states[locationToken], location());
              }
            },
          "symbols",
          { type: "literal", value: "symbols", description: "\"symbols\"" },
          function(t, attrs, s) {
              if(desc.data.symbols == null) {
                desc.data.symbols = s.data;
                loc.data.symbols = s.location;
                desc.defaults.symbols = {};
                loc.defaults.symbols = {};
                setAttrs(desc.defaults.symbols, attrs);
                setLocations(loc.defaults.symbols, attrs);
                loc.defaults.symbols[locationToken] = location();
              } else {
                  throw new exception.create(exception.ALDToken, "symbols", loc.defaults.symbols[locationToken], location());
              }
            },
          "transitions",
          { type: "literal", value: "transitions", description: "\"transitions\"" },
          function(attrs, t) {
              if(desc.data.transitions == null) {
                desc.data.transitions = t.data;
                loc.data.transitions = t.location;
                desc.defaults.transitions = {};
                loc.defaults.transitions = {};
                setAttrs(desc.defaults.transitions, attrs);
                setLocations(loc.defaults.transitions, attrs);
                loc.defaults.transitions[locationToken] = location();
              } else {
                  throw new exception.create(exception.ALDToken, "transitions", loc.defaults.transitions[locationToken], location());
              }
            },
          function(states) {
                return {
                  data: states.map((s) => s.data),
                  location: states.map((s) => s.location)
                }
            },
          function(symbols) {
              return {
                  data: symbols.map((s) => s.data),
                  location: symbols.map((s) => s.location)
              }
            },
          function(transitions) {
              let data = new Array();
              let location = new Array();
              for(var i = 0; i < transitions.length; i++) {
                  for(var j = 0; j < transitions[i].data.to.length; j++) {
                      data.push(setAttrs({
                          from: transitions[i].data.from,
                          by: transitions[i].data.by,
                          to: transitions[i].data.to[j].data
                      }, transitions[i].data.attrs));
                      location.push(setLocations({
                          from: transitions[i].location.from,
                          by: transitions[i].location.by,
                          to: transitions[i].data.to[j].location
                      }, transitions[i].data.attrs));
                  }
              }
              return {data, location}
            },
          function(id, attrs) {
              return {
                  data: setAttrs({id: id.data}, attrs),
                  location: setLocations({
                      id: location(),
                  }, attrs)
              };
            },
          function(id, attrs) {
              return {
                  data: setAttrs({id: id.data}, attrs),
                  location: setLocations({
                      id: location(),
                  }, attrs),
              }
            },
          "->",
          { type: "literal", value: "->", description: "\"->\"" },
          function(from, by, to, attrs) {
              return {
                  data: {from: from.data, by: by.data, to: to.data, attrs},
                  location: {from: from.location, by:  by.location, to:  to.location, attrs}
              };
            },
          ",",
          { type: "literal", value: ",", description: "\",\"" },
          function(i, l) {
                  return {
                      data: new Array(i).concat(l.data),
                      location : new Array(location()).concat(l.location)
                  }
              },
          function(i) { 
                  return {
                      data: new Array(i),
                      location: location()
                  };
              },
          "[",
          { type: "literal", value: "[", description: "\"[\"" },
          "]",
          { type: "literal", value: "]", description: "\"]\"" },
          function(attrs) { return {
                data: attrs.map((a) => a.data),
                location: attrs.map((a) => a.location)
              }; },
          "=",
          { type: "literal", value: "=", description: "\"=\"" },
          function(name, value) { 
                let obj = {}, loc = {};
                obj[name.data] = (value === "true");
                loc[name.data] = name.location;
                return {
                  data: obj,
                  location: loc
                };
              },
          function(name, color) { 
                  let obj = {}, loc = {}; 
                  obj[name.data] = color; 
                  loc[name.data] = name.location;
                  return {
                      data: obj,
                      location: loc
                  };
              },
          function(name, value) { 
                  let obj = {}, loc = {}; 
                  obj[name.data] = value;
                  loc[name.data] = name.location;
                  return {
                      data: obj,
                      location: loc
                  };
              },
          function(name, value) { 
                  let obj = {}, loc = {}; 
                  obj[name.data] = parseFloat(value); 
                  loc[name.data] = name.location;
                  return {
                      data: obj,
                      location: loc
                  };
              },
          function(name) { 
                  let obj = {}, loc = {}; 
                  obj[name.data] = true; 
                  loc[name.data] = name.location;
                  return {
                      data: obj,
                      location: loc
                  };
              },
          /^[a-zA-Z_0-9]/,
          { type: "class", value: "[a-zA-Z_0-9]", description: "[a-zA-Z_0-9]" },
          function(id) {
                  return {
                      data: id,
                      location: location()
                  }
              },
          /^[^"]/,
          { type: "class", value: "[^\\\"]", description: "[^\\\"]" },
          "\"",
          { type: "literal", value: "\"", description: "\"\\\"\"" },
          function(str) { return str; },
          "#",
          { type: "literal", value: "#", description: "\"#\"" },
          function(color) { return color },
          ".",
          { type: "literal", value: ".", description: "\".\"" },
          /^[0-9]/,
          { type: "class", value: "[0-9]", description: "[0-9]" },
          /^[a-fA-F0-9]/,
          { type: "class", value: "[a-fA-F0-9]", description: "[a-fA-F0-9]" },
          "true",
          { type: "literal", value: "true", description: "\"true\"" },
          "false",
          { type: "literal", value: "false", description: "\"false\"" },
          "{",
          { type: "literal", value: "{", description: "\"{\"" },
          "}",
          { type: "literal", value: "}", description: "\"}\"" },
          /^[ \t\n\r]/,
          { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" }
        ],

        peg$bytecode = [
          peg$decode("%;!/J#;;/A$;/.\" &\"/3$;\"/*$8$: $##! )($'#(#'#(\"'#&'#"),
          peg$decode("%%2!\"\"6!7\"/\"!&,)/' 8!:#!! )"),
          peg$decode("%;9/5#;#/,$;:/#$+#)(#'#(\"'#&'#"),
          peg$decode("$;$0#*;$&"),
          peg$decode(";%.) &;&.# &;'"),
          peg$decode("%2$\"\"6$7%/\\#;;/S$;/.\" &\"/E$;9/<$;(/3$;:/*$8&:&&#%#!)(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%2'\"\"6'7(/\\#;;/S$;/.\" &\"/E$;9/<$;)/3$;:/*$8&:)&#%#!)(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%2*\"\"6*7+/[#;;/R$;/.\" &\"/D$;9/;$;*/2$;:/)$8&:,&\"#!)(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%$;+0#*;+&/' 8!:-!! )"),
          peg$decode("%$;,0#*;,&/' 8!:.!! )"),
          peg$decode("%$;-0#*;-&/' 8!:/!! )"),
          peg$decode("%;1/@#;;/7$;/.\" &\"/)$8#:0#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;1/@#;;/7$;/.\" &\"/)$8#:1#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;1/\x87#;;/~$;1/u$;;/l$22\"\"6273/]$;;/T$;./K$;;/B$;/.\" &\"/4$;;/+$8*:4*$)'#!)(*'#()'#(('#(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;1/A#25\"\"6576/2$;./)$8#:7#\"\" )(#'#(\"'#&'#./ &%;1/' 8!:8!! )"),
          peg$decode("%29\"\"697:/P#$;00#*;0&/@$2;\"\"6;7</1$;;/($8$:=$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;1/\\#;;/S$2>\"\"6>7?/D$;;/;$;8/2$;;/)$8&:@&\"%!)(&'#(%'#($'#(#'#(\"'#&'#.\u0116 &%;1/\\#;;/S$2>\"\"6>7?/D$;;/;$;4/2$;;/)$8&:A&\"%!)(&'#(%'#($'#(#'#(\"'#&'#.\xCD &%;1/\\#;;/S$2>\"\"6>7?/D$;;/;$;3/2$;;/)$8&:B&\"%!)(&'#(%'#($'#(#'#(\"'#&'#.\x84 &%;1/\\#;;/S$2>\"\"6>7?/D$;;/;$;5/2$;;/)$8&:C&\"%!)(&'#(%'#($'#(#'#(\"'#&'#.; &%;1/1#;;/($8\":D\"!!)(\"'#&'#"),
          peg$decode("%%$4E\"\"5!7F/,#0)*4E\"\"5!7F&&&#/\"!&,)/' 8!:G!! )"),
          peg$decode("$4H\"\"5!7I0)*4H\"\"5!7I&"),
          peg$decode("%2J\"\"6J7K/G#%;2/\"!&,)/7$2J\"\"6J7K/($8#:L#!!)(#'#(\"'#&'#"),
          peg$decode("%%%2M\"\"6M7N/\x8C#%%;7/P#;7/G$;7/>$;7/5$;7/,$;7/#$+&)(&'#(%'#($'#(#'#(\"'#&'#.? &%;7/5#;7/,$;7/#$+#)(#'#(\"'#&'#/\"!&,)/#$+\")(\"'#&'#/\"!&,)/' 8!:O!! )"),
          peg$decode("%%$;60#*;6&/W#%2P\"\"6P7Q/9#$;6/&#0#*;6&&&#/#$+\")(\"'#&'#.\" &\"/#$+\")(\"'#&'#/\"!&,)"),
          peg$decode("4R\"\"5!7S"),
          peg$decode("4T\"\"5!7U"),
          peg$decode("2V\"\"6V7W.) &2X\"\"6X7Y"),
          peg$decode("%;;/;#2Z\"\"6Z7[/,$;;/#$+#)(#'#(\"'#&'#"),
          peg$decode("%;;/;#2\\\"\"6\\7]/,$;;/#$+#)(#'#(\"'#&'#"),
          peg$decode("$4^\"\"5!7_0)*4^\"\"5!7_&")
        ],

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleIndices)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleIndex = peg$startRuleIndices[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$decode(s) {
      var bc = new Array(s.length), i;

      for (i = 0; i < s.length; i++) {
        bc[i] = s.charCodeAt(i) - 32;
      }

      return bc;
    }

    function peg$parseRule(index) {
      var bc    = peg$bytecode[index],
          ip    = 0,
          ips   = [],
          end   = bc.length,
          ends  = [],
          stack = [],
          params, i;

      while (true) {
        while (ip < end) {
          switch (bc[ip]) {
            case 0:
              stack.push(peg$consts[bc[ip + 1]]);
              ip += 2;
              break;

            case 1:
              stack.push(void 0);
              ip++;
              break;

            case 2:
              stack.push(null);
              ip++;
              break;

            case 3:
              stack.push(peg$FAILED);
              ip++;
              break;

            case 4:
              stack.push([]);
              ip++;
              break;

            case 5:
              stack.push(peg$currPos);
              ip++;
              break;

            case 6:
              stack.pop();
              ip++;
              break;

            case 7:
              peg$currPos = stack.pop();
              ip++;
              break;

            case 8:
              stack.length -= bc[ip + 1];
              ip += 2;
              break;

            case 9:
              stack.splice(-2, 1);
              ip++;
              break;

            case 10:
              stack[stack.length - 2].push(stack.pop());
              ip++;
              break;

            case 11:
              stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));
              ip += 2;
              break;

            case 12:
              stack.push(input.substring(stack.pop(), peg$currPos));
              ip++;
              break;

            case 13:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1]) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 14:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] === peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 15:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] !== peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 16:
              if (stack[stack.length - 1] !== peg$FAILED) {
                ends.push(end);
                ips.push(ip);

                end = ip + 2 + bc[ip + 1];
                ip += 2;
              } else {
                ip += 2 + bc[ip + 1];
              }

              break;

            case 17:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (input.length > peg$currPos) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 18:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 19:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length).toLowerCase() === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 20:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 21:
              stack.push(input.substr(peg$currPos, bc[ip + 1]));
              peg$currPos += bc[ip + 1];
              ip += 2;
              break;

            case 22:
              stack.push(peg$consts[bc[ip + 1]]);
              peg$currPos += peg$consts[bc[ip + 1]].length;
              ip += 2;
              break;

            case 23:
              stack.push(peg$FAILED);
              if (peg$silentFails === 0) {
                peg$fail(peg$consts[bc[ip + 1]]);
              }
              ip += 2;
              break;

            case 24:
              peg$savedPos = stack[stack.length - 1 - bc[ip + 1]];
              ip += 2;
              break;

            case 25:
              peg$savedPos = peg$currPos;
              ip++;
              break;

            case 26:
              params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
              for (i = 0; i < bc[ip + 3]; i++) {
                params[i] = stack[stack.length - 1 - params[i]];
              }

              stack.splice(
                stack.length - bc[ip + 2],
                bc[ip + 2],
                peg$consts[bc[ip + 1]].apply(null, params)
              );

              ip += 4 + bc[ip + 3];
              break;

            case 27:
              stack.push(peg$parseRule(bc[ip + 1]));
              ip += 2;
              break;

            case 28:
              peg$silentFails++;
              ip++;
              break;

            case 29:
              peg$silentFails--;
              ip++;
              break;

            default:
              throw new Error("Invalid opcode: " + bc[ip] + ".");
          }
        }

        if (ends.length > 0) {
          end = ends.pop();
          ip = ips.pop();
        } else {
          break;
        }
      }

      return stack[0];
    }


        const init = require("./init.js");
        const setAttrs = init.setAttrs;
        const setLocations = init.setLocations;
        const locationToken = init.locationToken;
        const exception = init.exception;

        let desc = {
          defaults: {},
          data: {}
        }

        let loc = {
          defaults: {},
          data: {}
        };



    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})()
});

;require.register("lib/parser/index.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _grammar = require("./grammar");

var _grammar2 = _interopRequireDefault(_grammar);

var _check = require("../utils/check");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_check.exception.syntax = _check.exception.register("SyntaxException", function (expected, found, location) {
  this.expected = expected;
  this.found = found;
  this.location = location;
});

function parse(aml) {
  var l = void 0;
  try {
    l = _grammar2.default.parse(aml);
  } catch (err) {
    if (err instanceof _grammar2.default.SyntaxError) {
      return _check.exception.create(_check.exception.syntax, err.expected, err.found, err.location);
    } else {
      return err;
    }
  }
  return l;
}

exports.default = { parse: parse };

});

require.register("lib/parser/init.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.locationToken = exports.exception = exports.setLocations = exports.setAttrs = undefined;

var _check = require("../utils/check");

var locationToken = Symbol("location token");

function setAttrs(obj, attrs) {
  if (attrs != null) {
    for (var i = 0; i < attrs.data.length; i++) {
      Object.assign(obj, attrs.data[i]);
    }
  }
  return obj;
}

function setLocations(obj, attrs) {
  if (attrs != null) {
    for (var i = 0; i < attrs.location.length; i++) {
      Object.assign(obj, attrs.location[i]);
    }
  }
  return obj;
}

_check.exception.ALDToken = _check.exception.register("AlreadyDefinedException", function (type, loc1, loc2) {
  this.type = type;
  this.loc1 = loc1;
  this.loc2 = loc2;
});

_check.exception.MBToken = _check.exception.register("MissingBlockException", function (type) {
  this.type = type;
});

exports.setAttrs = setAttrs;
exports.setLocations = setLocations;
exports.exception = _check.exception;
exports.locationToken = locationToken;

});

require.register("lib/pipeline.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checks = undefined;
exports.default = pipeline;

var _check = require("./utils/check");

var _check2 = _interopRequireDefault(_check);

var _sketchFsm = require("./sketchFsm");

var _sketchFsm2 = _interopRequireDefault(_sketchFsm);

var _parser = require("./parser");

var _parser2 = _interopRequireDefault(_parser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var steps = {};

function pipeline(aml) {
  var l = _parser2.default.parse(aml);
  log.warn(l);
  if ((0, _check.exception)(l)) {
    return l;
  }
  var desc = makePipeline().deepCompose(steps.config).deepCompose(steps.redundancy).deepCompose(steps.inference).compose(steps.gather).deepCompose(steps.indexes).resolve(l.desc);
  log.warn(desc);
  if ((0, _check.exception)(desc)) {
    return desc;
  }
  return (0, _sketchFsm2.default)(desc);
}

function makePipeline() {
  var p = (0, _check2.default)().object();
  p.resolve = resolve;
  return p;
}

_check.exception.existingId = _check.exception.register("ExistingId", function (value, type) {
  this.type = type;
  this.value = value;
  this.message = "ExistingId: Id " + value + " of " + type + " already in use";
});
_check.exception.unknownId = _check.exception.register("UnknownId");
_check.exception.fsmType = _check.exception.register("WrongFsmType", function (type) {
  this.type = type;
  this.message = "WrongFsmType:       " + type + " is not a valid finite state machine type";
});

var symbolsIds = new Map();
var statesIds = new Map();
var symbolsIndexes = new Map();
var statesIndexes = new Map();
var symbolIndex = 0;
var stateIndex = 0;

function cleanup() {
  symbolsIds.clear();
  statesIds.clear();
  symbolsIndexes.clear();
  statesIndexes.clear();
  symbolIndex = 0;
  stateIndex = 0;
};

function resolve() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  var result = this.constructor.prototype.resolve.apply(this, args);
  cleanup();
  return result;
};

var color = (0, _check2.default)().ofType("string"); // TODO
color.opt = (0, _check2.default)().optional().compose(color);
var bool = (0, _check2.default)().ofType("boolean");
bool.opt = (0, _check2.default)().optional().compose(bool);
var integer = (0, _check2.default)().ofType("number"); // TODO
integer.opt = (0, _check2.default)().optional().compose(integer);

var fsmType = (0, _check2.default)().defaults("finite-state-machine");

var tagsSymbol = (0, _check2.default)().object({
  color: color.opt,
  bold: bool.opt,
  italic: bool.opt
});

var tagsState = (0, _check2.default)().object({
  color: color.opt,
  "border-color": color.opt,
  "text-color": color.opt,
  "background-color": color.opt,
  bold: bool.opt,
  italic: bool.opt,
  width: integer.opt,
  height: integer.opt
});

var tagsTransition = (0, _check2.default)().object({
  "text-color": color.opt,
  bold: bool.opt,
  italic: bool.opt
});

steps.gather = (0, _check2.default)().object({
  data: (0, _check2.default)().object({
    symbols: (0, _check2.default)().add(function () {
      return symbolsIds.values();
    }),
    states: (0, _check2.default)().add(function () {
      return statesIds.values();
    })
  })
}, true, ["symbols", "states", "transitions"]);

steps.indexes = (0, _check2.default)().object({
  data: (0, _check2.default)().object({
    symbols: (0, _check2.default)().iterable((0, _check2.default)().add(function (a) {
      symbolsIndexes.set(a.id, symbolIndex++);
      if (a.label === undefined) {
        a.label = a.id;
      }
      delete a.id;
      return a;
    })),
    states: (0, _check2.default)().iterable((0, _check2.default)().add(function (s) {
      statesIndexes.set(s.id, stateIndex++);
      if (s.label === undefined) {
        s.label = s.id;
      }
      delete s.id;
      return s;
    })),
    transitions: (0, _check2.default)().iterable((0, _check2.default)().add(function (t) {
      t.from = statesIndexes.get(t.from);
      t.to = statesIndexes.get(t.to);
      t.by = symbolsIndexes.get(t.by);
      return t;
    }))
  })
});

steps.config = (0, _check2.default)().object({
  type: fsmType,
  color: color.opt,
  bold: bool.opt,
  italic: bool.opt,
  defaults: (0, _check2.default)().object({
    symbols: (0, _check2.default)().object({}, true).deepCompose(tagsSymbol),
    states: (0, _check2.default)().object({}, true).deepCompose(tagsState),
    transitions: (0, _check2.default)().object({}, true).deepCompose(tagsTransition)
  }, true),
  data: (0, _check2.default)().object({}, true, ["symbols", "states", "transitions"])
}, true);

steps.redundancy = (0, _check2.default)().object({
  data: (0, _check2.default)().object({
    symbols: (0, _check2.default)().iterable((0, _check2.default)().object({
      id: (0, _check2.default)().add(function (id, a) {
        if (symbolsIds.has(id)) {
          return _check.exception.create(_check.exception.existingId, id, "symbol");
        }
        symbolsIds.set(id, a);
        return id;
      })
    })),
    states: (0, _check2.default)().iterable((0, _check2.default)().object({
      id: (0, _check2.default)().add(function (id, s) {
        if (statesIds.has(id)) {
          return _check.exception.create(_check.exception.existingId, id, "state");
        }
        statesIds.set(id, s);
        return id;
      })
    }))
  })
});

steps.inference = (0, _check2.default)().object({
  data: (0, _check2.default)().object({
    transitions: (0, _check2.default)().iterable((0, _check2.default)().object({
      from: (0, _check2.default)().add(function (from) {
        if (!statesIds.has(from)) {
          statesIds.set(from, { id: from });
        }
        return from;
      }),
      to: (0, _check2.default)().add(function (to) {
        if (!statesIds.has(to)) {
          statesIds.set(to, { id: to });
        }
        return to;
      }),
      by: (0, _check2.default)().add(function (by) {
        if (!symbolsIds.has(by)) {
          symbolsIds.set(by, { id: by });
        }
        return by;
      })
    }))
  })
});

steps.strictness = (0, _check2.default)().object({
  data: (0, _check2.default)().object({
    transitions: (0, _check2.default)().iterable((0, _check2.default)().object({
      from: (0, _check2.default)().add(function (from) {
        if (!statesIds.has(from)) {
          return _check.exception.create(_check.exception.unknownId, from, "state");
        }
        return from;
      }),
      to: (0, _check2.default)().add(function (to) {
        if (!statesIds.has(to)) {
          return _check.exception.create(_check.exception.unknownId, to, "state");
        }
        return to;
      }),
      by: (0, _check2.default)().add(function (by) {
        if (!symbolsIds.has(by)) {
          return _check.exception.create(_check.exception.unknownId, by, "symbols");
        }
        return by;
      })
    }))
  })
});

var checks = exports.checks = {
  color: color,
  bool: bool,
  integer: integer
};

});

require.register("lib/sketchFsm.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

exports.default = sketchFsm;

var _check = require("./utils/check");

var _check2 = _interopRequireDefault(_check);

var _fsm = require("./fsm");

var _fsm2 = _interopRequireDefault(_fsm);

var _pipeline = require("./pipeline");

var _dagre = require("dagre");

var _dagre2 = _interopRequireDefault(_dagre);

var _precedence = require("./utils/precedence");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function sketchFsm(cfg) {
  return new Fsm(cfg);
}

function Fsm(cfg) {

  var data = {
    color: cfg.color,
    bold: cfg.color,
    italic: cfg.color
  };

  data.symbols = new WeakMap();
  data.states = new WeakMap();
  data.transitions = new WeakMap();
  data.edges = new Map();

  data.symbols.labels = new Map();
  data.states.labels = new Map();
  data.ids = new Set();

  _pipeline.checks.symbolLabel = (0, _check2.default)().mandatory().ofType("string").add(function (l) {
    if (data.symbols.labels.has(l)) {
      return (0, _check.exception)(_check.exception.existingLabel);
    }
    return l;
  });

  var symbolsMixin = function symbolsMixin(FsmSymbol) {
    var _Symbol = function (_FsmSymbol) {
      _inherits(_Symbol, _FsmSymbol);

      function _Symbol() {
        _classCallCheck(this, _Symbol);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(_Symbol).apply(this, arguments));
      }

      _createClass(_Symbol, [{
        key: "label",
        get: function get() {
          return data.symbols.get(this).label;
        }
      }, {
        key: "description",
        get: function get() {
          var a = data.symbols.get(this);
          var d = {};
          var _arr = ["label", "color", "bold", "italic"];
          for (var _i = 0; _i < _arr.length; _i++) {
            var prop = _arr[_i];
            d[prop] = a[prop];
          }
          return d;
        }
      }], [{
        key: "add",
        value: function add(descriptor) {
          descriptor = (0, _check2.default)().object(_defineProperty({
            label: _pipeline.checks.symbolLabel,
            color: _pipeline.checks.color.opt,
            bold: _pipeline.checks.bool.opt
          }, "bold", _pipeline.checks.bool.opt)).resolve(descriptor);
          if ((0, _check.exception)(descriptor)) {
            return descriptor;
          }
          var symbol = _get(Object.getPrototypeOf(_Symbol), "add", this).call(this);
          if ((0, _check.exception)(symbol)) {
            return symbol;
          }
          data.symbols.set(symbol, descriptor);
          return symbol;
        }
      }]);

      return _Symbol;
    }(FsmSymbol);

    addAccessors(_Symbol.prototype, "symbols", data, {
      color: { check: _pipeline.checks.color },
      bold: { check: _pipeline.checks.bool, default: false },
      italic: { check: _pipeline.checks.bool, default: false }
    });
    return _Symbol;
  };

  _pipeline.checks.stateLabel = (0, _check2.default)().mandatory().ofType("string").add(function (l) {
    if (data.states.labels.has(l)) {
      return (0, _check.exception)(_check.exception.existingLabel);
    }
    return label;
  });

  var statesMixin = function statesMixin(FsmState) {
    var State = function (_FsmState) {
      _inherits(State, _FsmState);

      function State() {
        _classCallCheck(this, State);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(State).apply(this, arguments));
      }

      _createClass(State, [{
        key: "description",
        get: function get() {
          var s = data.states.get(this);
          var d = {};
          var properties = ["label", "x", "y", "width", "height", "color", "border-color", "text-color", "background-color", "bold", "italic"];
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var prop = _step.value;

              d[prop] = s[prop];
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          d.initial = _get(Object.getPrototypeOf(State.prototype), "initial", this);
          d.terminal = _get(Object.getPrototypeOf(State.prototype), "terminal", this);
          return d;
        }
      }], [{
        key: "add",
        value: function add(descriptor) {
          // TODO check
          descriptor = Object.assign({}, descriptor);
          var state = FsmState.add({
            initial: descriptor.initial,
            terminal: descriptor.terminal
          });
          if ((0, _check.exception)(state)) {
            return state;
          }
          data.states.set(state, descriptor);
          // TODO cleanup
          var id = randomId(data);
          data.states.get(state).id = id;
          return state;
        }
      }]);

      return State;
    }(FsmState);

    addAccessors(State.prototype, "states", data, {
      label: { check: _pipeline.checks.string, precedence: [], default: "" },
      x: { check: _pipeline.checks.integer, precedence: [function () {
          return data.states.get(this).x;
        }, function () {
          return data.states.get(this).computedX;
        }, function () {
          return 0;
        }], default: 0 },
      y: { check: _pipeline.checks.integer, precedence: [function () {
          return data.states.get(this).y;
        }, function () {
          return data.states.get(this).computedY;
        }, function () {
          return 0;
        }], default: 0 },
      border_color: { check: _pipeline.checks.color, precedence: [function () {
          return data.states.get(this).color;
        }, function () {
          return data.defaults.states["border-color"];
        }, function () {
          return data.defaults.states.color;
        }, function () {
          return data.color;
        }] },
      text_color: { check: _pipeline.checks.color, precedence: [function () {
          return data.states.get(this).color;
        }, function () {
          return data.defaults.states["text-color"];
        }, function () {
          return data.defaults.states.color;
        }, function () {
          return data.color;
        }] },
      background_color: { check: _pipeline.checks.color },
      bold: { check: _pipeline.checks.bool, default: false },
      italic: { check: _pipeline.checks.bool, default: false },
      height: { check: _pipeline.checks.integer, precedence: [/*TODO*/function () {
          return 60;
        }] },
      width: { check: _pipeline.checks.integer, precedence: [/*TODO*/function () {
          return 60;
        }] }
    });
    return State;
  };

  var transitionsMixin = function transitionsMixin(FsmTransition) {
    var Transition = function (_FsmTransition) {
      _inherits(Transition, _FsmTransition);

      function Transition() {
        _classCallCheck(this, Transition);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Transition).apply(this, arguments));
      }

      _createClass(Transition, [{
        key: "description",
        get: function get() {
          var t = data.transitions.get(this);
          var d = {};
          var _arr2 = ["text-color", "bold", "italic"];
          for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
            var prop = _arr2[_i2];
            d[prop] = t[prop];
          }
          d.from = _get(Object.getPrototypeOf(Transition.prototype), "from", this);
          d.to = _get(Object.getPrototypeOf(Transition.prototype), "to", this);
          d.by = _get(Object.getPrototypeOf(Transition.prototype), "by", this);
          return d;
        }
      }], [{
        key: "add",
        value: function add(descriptor) {
          // TODO check
          descriptor = Object.assign({}, descriptor);
          var transition = _get(Object.getPrototypeOf(Transition), "add", this).call(this, {
            from: descriptor.from,
            to: descriptor.to,
            by: descriptor.by
          });
          if ((0, _check.exception)(transition)) {
            return transition;
          }
          data.transitions.set(transition, descriptor);
          // TODO cleanup - add edge
          var fromDesc = void 0,
              sameFrom = void 0,
              edge = void 0;
          fromDesc = data.states.get(transition.from);
          sameFrom = fromDesc.edges;
          if (sameFrom === undefined) {
            sameFrom = new Map();
            fromDesc.edges = sameFrom;
          }
          edge = sameFrom.get(transition.to);
          if (edge === undefined) {
            edge = new Edge();
            sameFrom.set(transition.to, edge);
            data.edges.set(edge, {
              from: transition.from,
              to: transition.to,
              transitions: new Set([transition])
            });
          } else {
            data.edges.get(edge).transitions.add(transition);
          }
          return transition;
        }
      }]);

      return Transition;
    }(FsmTransition);

    addAccessors(Transition.prototype, "transitions", data, {
      text_color: { check: _pipeline.checks.color, precedence: [function () {
          return data.symbols.get(this.by).color;
        }, function () {
          return data.defaults.transitions.color;
        }, function () {
          return data.defaults.symbols.color;
        }, function () {
          return data.color;
        }], default: false },
      bold: { check: _pipeline.checks.bool, precedence: [function () {
          return data.symbols.get(this.by).bold;
        }, function () {
          return data.defaults.transitions.bold;
        }, function () {
          return data.defaults.symbols.bold;
        }, function () {
          return data.bold;
        }], default: false },
      italic: { check: _pipeline.checks.bool, precedence: [function () {
          return data.symbols.get(this.by).italic;
        }, function () {
          return data.defaults.transitions.italic;
        }, function () {
          return data.defaults.symbols.italic;
        }, function () {
          return data.italic;
        }], default: false }
    });
    return Transition;
  };

  // TODO sort symbols

  var Edge = function () {
    function Edge() {
      _classCallCheck(this, Edge);
    }

    _createClass(Edge, [{
      key: "symbols",
      get: function get() {
        return Array.from(data.edges.get(this).transitions, function (t) {
          return t.by;
        });
      }
    }, {
      key: "from",
      get: function get() {
        return data.edges.get(this).from;
      }
    }, {
      key: "to",
      get: function get() {
        return data.edges.get(this).to;
      }
    }], [{
      key: "all",
      value: function all() {
        return data.edges.keys();
      }
    }]);

    return Edge;
  }();

  addAccessors(Edge.prototype, "edges", data, {
    height: { check: _pipeline.checks.integer, precedence: [], default: 0 },
    width: { check: _pipeline.checks.integer, precedence: [], default: 0 },
    points: { check: (0, _check2.default)().iterable(), precedence: [function () {
        return copyPoints(data.edges.get(this).points);
      }, function () {
        return copyPoints(data.edges.get(this).computedPoints);
      }] },
    x: { check: _pipeline.checks.integer, precedence: [function () {
        return data.edges.get(this).x;
      }, function () {
        return data.edges.get(this).computedX;
      }], default: 0 },
    y: { check: _pipeline.checks.integer, precedence: [function () {
        return data.edges.get(this).y;
      }, function () {
        return data.edges.get(this).computedY;
      }], default: 0 },
    label: { check: (0, _check2.default)().iterable(), precedence: [function () {
        return data.edges.get(this).label;
      }, function () {
        return Array.from(data.edges.get(this).transitions, function (t) {
          return t.by.label;
        }).join(", ");
      }] }
  });

  function computeLayout() {
    var graph = new _dagre2.default.graphlib.Graph({
      directed: true
    }).setGraph({
      marginx: 30,
      marginy: 30,
      nodesep: 30,
      ranksep: 30,
      edgesep: 20,
      rankdir: "LR"
    });
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = data.fsm.states.all()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var s = _step2.value;

        graph.setNode(data.states.get(s).id, {
          width: s.width(),
          height: s.height(),
          // label: s.label(),
          state: s
        });
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = Edge.all()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var e = _step3.value;

        var edgeData = data.edges.get(e);
        graph.setEdge(data.states.get(edgeData.from).id, data.states.get(edgeData.to).id, {
          width: e.width(),
          height: e.height(),
          // label: e.label,
          // labelpos: "c",
          edge: e
        });
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3.return) {
          _iterator3.return();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    _dagre2.default.layout(graph);
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = graph.nodes()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var n = _step4.value;

        n = graph.node(n);
        var stateData = data.states.get(n.state);
        stateData.computedX = n.x;
        stateData.computedY = n.y;
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4.return) {
          _iterator4.return();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
      for (var _iterator5 = graph.edges()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
        var _e = _step5.value;

        _e = graph.edge(_e.v, _e.w);
        var _edgeData = data.edges.get(_e.edge);
        var points = _e.points.slice();
        _edgeData.computedPoints = points;
        var labelPos = points[(points.length - 1) / 2];
        _edgeData.computedX = labelPos.x;
        _edgeData.computedY = labelPos.y;
      }
    } catch (err) {
      _didIteratorError5 = true;
      _iteratorError5 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion5 && _iterator5.return) {
          _iterator5.return();
        }
      } finally {
        if (_didIteratorError5) {
          throw _iteratorError5;
        }
      }
    }

    return this;
  };

  data.fsm = (0, _fsm2.default)({
    mixins: {
      symbols: symbolsMixin,
      states: statesMixin,
      transitions: transitionsMixin
    }
  });

  this.symbols = data.fsm.symbols;
  this.states = data.fsm.states;
  this.transitions = data.fsm.transitions;
  this.edges = Edge;
  this.layout = computeLayout;

  var importError = fromTree(cfg.data, this);

  if ((0, _check.exception)(importError)) {
    return importError;
  }
}

var randomHash = function randomHash() {
  return Math.random().toString(36).substring(2);
};

var randomId = function randomId(data) {
  var id = void 0;
  do {
    id = randomHash();
  } while (data.ids.has(id));
  data.ids.add(id);
  return id;
};

var fromTree = function fromTree(descriptor, struct) {
  var errors = {};
  var labels = new Set();
  var hasErrors = false;

  var symbols = (0, _check2.default)().iterable((0, _check2.default)().add(function (a) {
    var symbol = struct.symbols.add(a);
    if (!(0, _check.exception)(symbol)) {
      labels.add(symbol.label);
    }
    return symbol;
  })).resolve(descriptor.symbols);

  if ((0, _check.exception)(symbols)) {
    var dummyDescriptor = {};
    errors.symbols = symbols;
    symbols = symbols.output;
    for (var i = 0, dummySymbol; i < symbols.length; i++) {
      if (symbols[i] === undefined) {
        do {
          dummyDescriptor.label = randomHash();
        } while (labels.has(dummyDescriptor.label));
        // TODO bypass it
        dummySymbol = struct.symbols.add(dummyDescriptor);
        // Assuming this doesn't fail
        if ((0, _check.exception)(dummySymbol)) {
          throw dummySymbol;
        }
        symbols[i] = dummySymbol;
      }
    }
    hasErrors = true;
  }

  var states = (0, _check2.default)().iterable((0, _check2.default)().add(function (s) {
    return struct.states.add(s);
  })).resolve(descriptor.states);

  if ((0, _check.exception)(states)) {
    var _dummyDescriptor = {};
    errors.states = states;
    states = states.output;
    for (var _i3 = 0, dummyState; _i3 < states.length; _i3++) {
      // TODO bypass it
      dummyState = struct.states.add(_dummyDescriptor);
      // Assuming this doesn't fail
      if ((0, _check.exception)(dummyState)) {
        throw dummyState;
      }
      states[_i3] = dummyState;
    }
    hasErrors = true;
  }

  var transitions = (0, _check2.default)().iterable((0, _check2.default)().add(function (t) {
    var d = Object.assign({}, t);
    d.from = states[t.from];
    d.to = states[t.to];
    d.by = symbols[t.by];
    return struct.transitions.add(d);
  })).resolve(descriptor.transitions);

  if ((0, _check.exception)(transitions)) {
    errors.transitions = transitions;
    transitions = transitions.output;
    hasErrors = true;
  }

  if (hasErrors) {
    return (0, _check2.default)().object({
      symbols: (0, _check2.default)(),
      states: (0, _check2.default)(),
      transitions: (0, _check2.default)()
    }).resolve(errors);
  }
};

var copyPoints = function copyPoints(points) {
  if (points == null) {
    return points;
  }
  return points.map(function (p) {
    return Object.assign({}, p);
  });
};

var addAccessors = function addAccessors(proto, kind, data, object) {
  var arg = void 0;
  var _iteratorNormalCompletion6 = true;
  var _didIteratorError6 = false;
  var _iteratorError6 = undefined;

  try {
    for (var _iterator6 = Object.keys(object)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
      var method = _step6.value;

      arg = object[method];
      makeAccessor(proto, kind, method.replace("_", "-"), method, arg.check, data, arg.precedence, arg.default);
    }
  } catch (err) {
    _didIteratorError6 = true;
    _iteratorError6 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion6 && _iterator6.return) {
        _iterator6.return();
      }
    } finally {
      if (_didIteratorError6) {
        throw _iteratorError6;
      }
    }
  }
};

var makeAccessor = function makeAccessor(proto, kind, prop, method, check, data, callbacks, defaults) {
  if (callbacks === undefined) {
    callbacks = [function () {
      return data.defaults[kind][prop];
    }, function () {
      return data[prop];
    }];
  }
  if (defaults !== undefined) {
    callbacks.push(function () {
      return defaults;
    });
  }
  callbacks.unshift(function () {
    return data[kind].get(this)[prop];
  });
  proto[method] = function (arg) {
    if (arg === undefined) {
      return (0, _precedence.lazy)(this, callbacks);
    }
    arg = check.resolve(arg);
    if ((0, _check.exception)(arg)) return arg;
    data[kind].get(this)[prop] = arg;
    return this;
  };
};

});

require.register("lib/style.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fsmStyle;
function fsmStyle(fsm) {

  var states = new WeakMap();
  var transitions = new WeakMap();
  var symbols = new WeakMap();

  var stateStyle = function stateStyle(s) {
    return states.get(s);
  };
  var transitionStyle = function transitionStyle(t) {
    return transitions.get(t);
  };
  var symbolStyle = function symbolStyle(a) {
    return symbols.get(a);
  };

  var defaultStateStyle = {};
  var defaultTransitionStyle = {};
  var defaultSymbolStyle = {};

  Object.defineProperties(fsm.statePrototype, {});

  Object.defineProperties(fsm.transitionPrototype, {});

  Object.defineProperties(fsm.symbolPrototype, {});

  var stateBuilder = fsm.state;
  fsm.state = function (content) {
    var builder = stateBuilder(content);
    var style = Object.assign({}, defaultStateStyle);

    return builder;
  };

  var transitionBuilder = fsm.transition;
  fsm.transition = function (content) {
    var builder = transitionBuilder(content);
    var style = Object.assign({}, defaultTransitionStyle);

    return builder;
  };

  var symbolBuilder = fsm.symbol;
  fsm.symbol = function (content) {
    var builder = symbolBuilder(content);
    var style = Object.assign({}, defaultSymbolStyle);

    return builder;
  };

  return fsm;
};

});

require.register("lib/tree.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fsmToTree = exports.fsmFromTree = undefined;

var _sketchFsm = require("./sketchFsm");

var _sketchFsm2 = _interopRequireDefault(_sketchFsm);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fsmFromTree = exports.fsmFromTree = function fsmFromTree(input) {
  var struct = (0, _sketchFsm2.default)();

  input.states.forEach(function (s) {
    if (s.initial == null) s.initial = false;
    if (s.terminal == null) s.terminal = false;
    struct.states.add(s);
  });

  input.symbols.forEach(function (a) {
    struct.symbols.add(a);
  });

  var states = Array.from(struct.states.all());
  var symbols = Array.from(struct.symbols.all());
  input.transitions.forEach(function (t) {
    t.from = states[t.from];
    t.to = states[t.to];
    t.by = symbols[t.by];
    struct.transitions.add(t);
  });

  return struct;
};

var fsmToTree = exports.fsmToTree = function fsmToTree(struct) {

  var output = {
    type: "finite-state-machine",
    symbols: [],
    states: [],
    transitions: []
  };
  var indexes = {
    symbols: new Map(),
    states: new Map()
  };

  var i = 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = struct.symbols.all()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var a = _step.value;

      output.symbols.push(a.description);
      indexes.symbols.set(a, i++);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  i = 0;
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = struct.states.all()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var s = _step2.value;

      output.states.push(s.description);
      indexes.states.set(s, i++);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  ;

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = struct.transitions.all()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var t = _step3.value;

      var td = t.description;
      td.from = indexes.states.get(t.from);
      td.to = indexes.states.get(t.to);
      td.by = indexes.states.get(t.by);
      output.transitions.push(td);
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  ;

  return output;
};

});

require.register("lib/utils/check.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exception = exports.default = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @module lib/utils/descriptor
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @requires lib/utils/exception
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _exception = require("./exception");

var _exception2 = _interopRequireDefault(_exception);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Creates a new check builder
 */
function check() {
  return new Check();
}

exports.default = check;
exports.exception = _exception2.default;


var queueAccessor = Symbol("queue property name");

var identityBypass = function identityBypass(x) {
  return x;
};
identityBypass.bypass = true;

var emptyArrayDescriptor = function emptyArrayDescriptor() {
  emptyArrayDescriptor.d.value = [];
  return emptyArrayDescriptor.d;
};

emptyArrayDescriptor.d = {
  enumerable: false,
  writable: false,
  configurable: false
};

var Check = function () {
  function Check() {
    _classCallCheck(this, Check);

    Object.defineProperty(this, queueAccessor, emptyArrayDescriptor());
  }

  _createClass(Check, [{
    key: "optional",
    value: function optional() {
      this[queueAccessor].push(identityBypass);
      return this;
    }
  }, {
    key: "defaults",
    value: function defaults(defaultValue) {
      var checkDefaults = function checkDefaults() {
        return defaultValue;
      };
      checkDefaults.bypass = true;
      this[queueAccessor].push(checkDefaults);
      return this;
    }
  }, {
    key: "inMap",

    /**
     * @return {Any|CheckError<notMember>}
     */
    value: function inMap(map) {
      var checkInMap = function checkInMap(value) {
        if (map.has(value)) {
          return value;
        }
        return _exception2.default.create(_exception2.default.notMember, value, map);
      };
      this[queueAccessor].push(checkInMap);
      return this;
    }
  }, {
    key: "inSet",


    /**
     * @return {Any|CheckError<notMember>}
     */
    value: function inSet(map) {
      var checkInSet = function checkInSet(value) {
        if (map.has(value)) {
          return value;
        }
        return _exception2.default.create(_exception2.default.notMember, value, map);
      };
      this[queueAccessor].push(checkInSet);
      return this;
    }
  }, {
    key: "inArray",

    /**
     * @return {Any|CheckError<notMember>}
     */
    value: function inArray(array) {
      var checkInArray = function checkInArray(value) {
        if (array.includes(value)) {
          return value;
        }
        return _exception2.default.create(_exception2.default.notMember, value, array);
      };
      this[queueAccessor].push(checkInArray);
      return this;
    }
  }, {
    key: "ofType",


    /**
     * @return {Any|CheckError<wrongType>}
     */
    value: function ofType(type) {
      var checkOfType = function checkOfType(value) {
        if ((typeof value === "undefined" ? "undefined" : _typeof(value)) === type) {
          return value;
        }
        return _exception2.default.create(_exception2.default.wrongType, value, type);
      };
      this[queueAccessor].push(checkOfType);
      return this;
    }
  }, {
    key: "instanceOf",


    /**
     * @return {Any|CheckError<wrongClass>}
     */
    value: function instanceOf(constructor) {
      var checkInstanceOf = function checkInstanceOf(value) {
        if (value instanceof constructor) {
          return value;
        }
        return _exception2.default.create(_exception2.default.wrongClass, value, constructor);
      };
      this[queueAccessor].push(checkInstanceOf);
      return this;
    }
  }, {
    key: "iterable",


    /**
     * @return {Any|CheckError<array>|CheckError<notIterable>}
     */
    value: function iterable(check) {
      var checkIterable = function checkIterable(value) {
        for (var _len = arguments.length, parents = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          parents[_key - 1] = arguments[_key];
        }

        value = value || [];
        var exceptions = [];
        var output = [];
        if (value[Symbol.iterator] == null) {
          return _exception2.default.create(_exception2.default.wrongType, value, "iterable");
        }
        if (checkIterable.check === undefined) {
          return value;
        }
        var i = 0;
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = value[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _checkIterable$check;

            var v = _step.value;

            var c = (_checkIterable$check = checkIterable.check).resolve.apply(_checkIterable$check, [v, output].concat(parents));
            if ((0, _exception2.default)(c)) {
              exceptions[i] = c;
            } else {
              output[i] = c;
            }
            i++;
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        if (exceptions.length > 0) {
          exceptions.length = i;
          output.length = i;
          return _exception2.default.create(_exception2.default.array, value, checkIterable.check, exceptions, output);
        }
        return output;
      };
      checkIterable.iterable = true;
      checkIterable.check = check;
      this[queueAccessor].push(checkIterable);
      return this;
    }
  }, {
    key: "object",

    /**
     * @return {Any|CheckError<object>}
     */
    value: function object(definition) {
      var fireUnknown = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
      var order = arguments[2];

      definition = definition || {};
      order = order || [];
      var checkObject = function checkObject(value) {
        for (var _len2 = arguments.length, parents = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          parents[_key2 - 1] = arguments[_key2];
        }

        value = value || {};
        var output = {};
        var exceptions = {};
        var c = void 0;
        order = order.concat(Object.keys(checkObject.definition).filter(function (prop) {
          return !order.includes(prop);
        }));
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = order[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _checkObject$definiti;

            var prop = _step2.value;

            if (checkObject.definition[prop] === undefined) {
              continue;
            }
            c = (_checkObject$definiti = checkObject.definition[prop]).resolve.apply(_checkObject$definiti, [value[prop], output].concat(parents));
            if ((0, _exception2.default)(c)) {
              exceptions[prop] = c;
            } else {
              output[prop] = c;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = Object.keys(value)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _prop = _step3.value;

            if (checkObject.definition[_prop] === undefined) {
              if (checkObject.fireUnknown) {
                exceptions[_prop] = _exception2.default.create(_exception2.default.unknownProp, value, checkObject.definition, _prop);
              } else {
                output[_prop] = value[_prop];
              }
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }

        if (Object.keys(exceptions).length > 0) {
          return _exception2.default.create(_exception2.default.object, value, checkObject.definition, exceptions, output);
        }
        return output;
      };
      checkObject.object = true;
      checkObject.definition = definition;
      checkObject.order = order;
      checkObject.fireUnkown = fireUnknown;
      this[queueAccessor].push(checkObject);
      return this;
    }
  }, {
    key: "mandatory",


    /**
     * @return {Any|CheckError<missingValue>}
     */
    value: function mandatory() {
      var checkMandatory = function checkMandatory(value) {
        if (value == null) {
          return _exception2.default.create(_exception2.default.missingValue, value);
        }
        return value;
      };
      this[queueAccessor].push(checkMandatory);
      return this;
    }
  }, {
    key: "compose",
    value: function compose(check) {
      var queue = this[queueAccessor];
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = check[queueAccessor][Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var f = _step4.value;

          if (f.object === true) {
            this.object(Object.assign(f.definition), f.fireUnknown, f.order);
          } else if (f.iterable === true) {
            this.iterable(new Check().compose(f.check));
          } else {
            queue.push(f);
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return this;
    }
  }, {
    key: "deepCompose",


    // TODO merge orders
    value: function deepCompose(append) {
      var queue = this[queueAccessor];
      var appendQueue = append[queueAccessor];
      if (appendQueue.length <= 0) {
        return this;
      }
      if (queue.length <= 0) {
        this.compose(append);
        return this;
      }
      var tip = queue[queue.length - 1];
      var toCompose = appendQueue[0];
      if (tip.object === true && toCompose.object === true) {
        var newDef = Object.assign({}, tip.definition);
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = Object.keys(toCompose.definition)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var prop = _step5.value;

            if (newDef[prop] === undefined) {
              newDef[prop] = check().compose(toCompose.definition[prop]);
            } else {
              newDef[prop] = check().compose(newDef[prop]).deepCompose(toCompose.definition[prop]);
            }
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }

        tip.definition = newDef;
        return this;
      }
      if (tip.iterable === true && toCompose.iterable === true) {
        tip.check = check().compose(tip.check).deepCompose(toCompose.check);
        return this;
      }
      return this.compose(append);
    }
  }, {
    key: "add",
    value: function add(f) {
      this[queueAccessor].push(f);
      return this;
    }
  }, {
    key: "resolve",
    value: function resolve(value) {
      for (var _len3 = arguments.length, parents = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        parents[_key3 - 1] = arguments[_key3];
      }

      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this[queueAccessor][Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var f = _step6.value;

          if ((0, _exception2.default)(value)) {
            return value;
          }
          if (f.bypass && value == null) {
            return f.call.apply(f, [undefined, value].concat(parents));
          }
          value = f.call.apply(f, [undefined, value].concat(parents));
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6.return) {
            _iterator6.return();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      return value;
    }
  }, {
    key: "hold",
    value: function hold() {
      return this.resolve.bind(this);
    }
  }]);

  return Check;
}();

});

require.register("lib/utils/exception.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = exception;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Check if the argument is of a registered exception type.
 * @param {mdn:Object} object - the object to check
 * @return {mdn:Boolean} whether the object is a registered exception
 */
function exception(object) {
  return object == null ? false : registry.has(object[tokenAccessor]);
}

/**
 * The registry of every registered type of exception.
 * The keys are tokens that uniquely identifies a type of exception
 * and the values are the constructors used to instanciate them
 */
var registry = new Map();

/**
 * A symbol to access the token property of the created exceptions.
 */
var tokenAccessor = Symbol("token property name");

/**
 * A helper function to efficiently use property descriptors in
 * {@link mdn:Object.defineProperty}.
 */
function propertyDescriptor(value) {
  propertyDescriptor.d.value = value;
  return propertyDescriptor.d;
}

propertyDescriptor.d = {
  enumerable: false,
  configurable: false,
  writable: false
};

/**
 * A default constructor for an exception
 */
function Exception(value) {
  this.name = this.constructor.name;
  this.value = value;
}

var depthAccessor = Symbol("depth property name");
var incDepthAccessor = Symbol("increment depth property name");

var properties = {
  token: {
    get: function get() {
      return this[tokenAccessor];
    },
    configurable: false,
    enumerable: false
  },
  onIt: {
    value: function value(handler) {
      return handler.call(undefined, this);
    },
    writable: false,
    configurable: false,
    enumerable: false
  },
  dispatch: {
    value: function value(handlers) {
      if (!registry.has(this[tokenAccessor])) {
        throw new Error("Not a recognized exception");
      }
      var handler = handlers[this[tokenAccessor]];
      if (handler == null) {
        handler = handlers.default;
        if (handler == null) {
          throw this;
        }
      }
      return this.onIt(handler);
    },
    writable: false,
    configurable: false,
    enumerable: false
  }
};

var messageProperty = {
  get: function get() {
    return this.name + " raised";
  },
  configurable: true,
  enumerable: true
};

var incDepthProperty = {
  value: function value() {
    this[depthAccessor]++;
  },
  configurable: false,
  enumerable: true,
  writable: false
};

Object.defineProperties(Exception.prototype, properties);
Object.defineProperty(Exception.prototype, "message", messageProperty);
Object.defineProperty(Exception.prototype, incDepthAccessor, incDepthProperty);

/**
 * Registers a new type of exception.
 * @param {mdn:String} name - The name of the new type
 * @param {Class} superClass - An optional constructor that will be extended
 * @return {Symbol} The token of the newly created type of exception
 */
exception.register = function (name) {
  var superClass = arguments.length <= 1 || arguments[1] === undefined ? Exception : arguments[1];

  var newExceptionClass = function (_superClass) {
    _inherits(newExceptionClass, _superClass);

    function newExceptionClass() {
      var _Object$getPrototypeO;

      _classCallCheck(this, newExceptionClass);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(newExceptionClass)).call.apply(_Object$getPrototypeO, [this].concat(args)));

      _this.name = name;
      _this[depthAccessor] = 0;
      return _this;
    }

    return newExceptionClass;
  }(superClass);
  var token = Symbol(name);
  if (superClass !== Exception) {
    Object.defineProperties(newExceptionClass.prototype, properties);
    // if(!("message" in newExceptionClass.prototype)) {
    //   Object.defineProperty(newExceptionClass.prototype, "message", messageProperty);
    // }
    if (!(incDepthAccessor in newExceptionClass.prototype)) {
      Object.defineProperty(newExceptionClass.prototype, incDepthAccessor, incDepthProperty);
    }
  }
  Object.defineProperty(newExceptionClass.prototype, tokenAccessor, propertyDescriptor(token));
  registry.set(token, newExceptionClass);
  return token;
};

/**
 * Creates an exception of a given type
 * @param {Symbol} The token
 * @param ...args The arguments to pass to the exception constructor
 * @return {Exception} The newly created exception
 * @throws Error When the supplied token does not match a registered type of 
 * exception
 */
exception.create = function (token) {
  for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  var exceptionClass = registry.get(token);
  if (exceptionClass === undefined) {
    throw new Error("Not a recognized exception");
  }
  return new (Function.prototype.bind.apply(exceptionClass, [null].concat(args)))();
};

/**
 * A collection of exceptions
 */

var ObjectExceptions = function () {
  function ObjectExceptions(descriptor, definition, exceptions, output) {
    _classCallCheck(this, ObjectExceptions);

    this.value = descriptor;
    this.definition = definition;
    this.exceptions = exceptions;
    this.output = output;
    this[incDepthAccessor]();
    this[depthAccessor] = 0;
  }

  _createClass(ObjectExceptions, [{
    key: "onProperties",
    value: function onProperties(objectCallbacks) {
      var results = {};
      var callback, exception;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(this.exceptions)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var prop = _step.value;

          callback = objectCallbacks[prop];
          exception = this.exceptions[prop];
          if (callback == null) {
            throw exception;
          }
          results[prop] = callback.call(undefined, exception);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return results;
    }
  }, {
    key: "onEachProperty",
    value: function onEachProperty(callback) {
      var results = {};
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(this.exceptions)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var prop = _step2.value;

          exports.default = exception = this.exceptions[prop];
          results[prop] = callback.call(undefined, exception, prop);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return results;
    }
  }, {
    key: "message",
    get: function get() {
      var m = this.name + ": exceptions on the following properties: ";
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = Object.keys(this.exceptions)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var prop = _step3.value;

          m += "\n";
          m += "  ".repeat(this.exceptions[prop][depthAccessor]);
          m += prop + ": " + this.exceptions[prop].message;
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return m;
    }
  }]);

  return ObjectExceptions;
}();

Object.defineProperty(ObjectExceptions.prototype, incDepthAccessor, propertyDescriptor(function () {
  this[depthAccessor]++;
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = Object.keys(this.exceptions)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var prop = _step4.value;

      this.exceptions[prop][incDepthAccessor]();
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4.return) {
        _iterator4.return();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }
}));

/**
 * A collection of exceptions
 */

var ArrayExceptions = function () {
  function ArrayExceptions(value, definition, exceptions, output) {
    _classCallCheck(this, ArrayExceptions);

    this.value = value;
    this.definition = definition;
    this.output = output;
    this.exceptions = exceptions;
    this[incDepthAccessor]();
    this[depthAccessor]--;
  }

  _createClass(ArrayExceptions, [{
    key: "onEach",
    value: function onEach(callback) {
      var results = [];
      for (var err, i = 0; i < this.exceptions.length; i++) {
        err = this.exceptions[i];
        if (err !== undefined) {
          results[i] = callback.call(undefined, err, i);
        }
      }
      return results;
    }
  }, {
    key: "message",
    get: function get() {
      var m = this.name + ": exceptions on the following indexes: ";
      this.exceptions.forEach(function (err, i) {
        if (err != null) {
          m += "\n";
          m += "  ".repeat(err[depthAccessor]);
          m += "index " + i + ": " + err.message;
        }
      });
      return m;
    }
  }]);

  return ArrayExceptions;
}();

Object.defineProperty(ArrayExceptions.prototype, incDepthAccessor, propertyDescriptor(function () {
  this[depthAccessor]++;
  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = this.exceptions[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var e = _step5.value;

      if (e !== undefined) {
        e[incDepthAccessor]();
      }
    }
  } catch (err) {
    _didIteratorError5 = true;
    _iteratorError5 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion5 && _iterator5.return) {
        _iterator5.return();
      }
    } finally {
      if (_didIteratorError5) {
        throw _iteratorError5;
      }
    }
  }
}));

var NotMember = function () {
  function NotMember(value, collection) {
    _classCallCheck(this, NotMember);

    this.value = value;
    this.collection = collection;
  }

  _createClass(NotMember, [{
    key: "message",
    get: function get() {
      return this.name + ": not a member of the supplied collection";
    }
  }]);

  return NotMember;
}();

var WrongType = function () {
  function WrongType(value, type) {
    _classCallCheck(this, WrongType);

    this.value = value;
    this.type = type;
  }

  _createClass(WrongType, [{
    key: "message",
    get: function get() {
      return this.name + ": should be of type " + this.type;
    }
  }]);

  return WrongType;
}();

var WrongClass = function () {
  function WrongClass(value, classConstructor) {
    _classCallCheck(this, WrongClass);

    this.value = value;
    this.classConstructor = classConstructor;
  }

  _createClass(WrongClass, [{
    key: "message",
    get: function get() {
      return this.name + ": not an instance of the given class/constructor";
    }
  }]);

  return WrongClass;
}();

var MissingValue = function () {
  function MissingValue(value) {
    var allowNull = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    _classCallCheck(this, MissingValue);

    this.value = value;
    this.allowNull = allowNull;
  }

  _createClass(MissingValue, [{
    key: "message",
    get: function get() {
      return this.name + ": undefined " + (this.allowNull ? "" : "or null") + ",      but variable is " + this.value;
    }
  }]);

  return MissingValue;
}();

var UnknownPropertyName = function () {
  function UnknownPropertyName(value, definition, propertyName) {
    _classCallCheck(this, UnknownPropertyName);

    this.value = value;
    this.definition = definition;
    this.propertyName = propertyName;
  }

  _createClass(UnknownPropertyName, [{
    key: "message",
    get: function get() {
      return this.name + ": the property " + this.propertyName + " has not been defined";
    }
  }]);

  return UnknownPropertyName;
}();

exception.array = exception.register("ArrayExceptions", ArrayExceptions);
exception.object = exception.register("ObjectExceptions", ObjectExceptions);
exception.missingValue = exception.register("MissingValue", MissingValue);
exception.notMember = exception.register("NotMember", NotMember);
exception.wrongClass = exception.register("WrongClass", WrongClass);
exception.wrongType = exception.register("WrongType", WrongType);
exception.unknownProp = exception.register("UnknownPropertyName", UnknownPropertyName);

});

require.register("lib/utils/iterator.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatten = flatten;
exports.empty = empty;
exports.wrap = wrap;
exports.hijack = hijack;
/**
 * @module lib/utils/iterator
 */

/**
 * Transforms an iterable of iterables into a flat iterable
 */
function flatten(iterable, accessIterable) {
  var iterator = iterable[Symbol.iterator]();
  var oldNext = iterator.next.bind(iterator);
  var c = void 0;
  var subIterator = void 0;
  var subc = { done: true };
  iterator.next = function () {
    while (subc.done) {
      c = oldNext();
      if (c.done) {
        return c;
      }
      subIterator = accessIterable(c.value)[Symbol.iterator];
      subc = subIterator.next();
    }
    return subc;
  };
  iterator[Symbol.iterator] = function () {
    return iterator;
  };
  return iterator;
};

/**
 * Creates an empty iterator
 */
function empty() {
  var iterator = {
    next: function next() {
      return { done: true };
    }
  };
  iterator[Symbol.iterator] = function () {
    return iterator;
  };
  return iterator;
};

/**
 * Wraps a variable in an iterator
 */
function wrap(value) {
  var seen = false;
  var iterator = {
    next: function next() {
      if (seen) {
        return { done: true };
      }
      seen = true;
      return { value: value };
    }
  };
  iterator[Symbol.iterator] = function () {
    return iterator;
  };
  return iterator;
};

/**
 * Apply a function on a value when accessing it
 */
function hijack(iterable, callback) {
  var iterator = iterable[Symbol.iterator]();
  var oldNext = iterator.next.bind(iterator);
  iterator.next = function () {
    var c = oldNext();
    if (!c.done) {
      c.value = callback(c.value);
    }
    return n;
  };
  iterator[Symbol.iterator] = function () {
    return iterator;
  };
  return newIterator;
};

});

require.register("lib/utils/precedence.js", function(exports, require, module) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = precedence;
exports.lazy = lazy;
function precedence() {
  var arg = undefined;

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  for (var i = 0; i < args.length, arg == null; i++) {
    arg = args[i];
  }
  return arg;
}

function lazy(self, callbacks) {
  var r = undefined;
  for (var i = 0; i < callbacks.length && r == null; i++) {
    r = callbacks[i].apply(self);
  }
  return r;
}

});

;