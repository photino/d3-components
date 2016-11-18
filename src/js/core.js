/*!
 * Core modules
 */

// D3 components
d3.components = {};

// Default plotting options
d3.defaultOptions = {
  id: 'chart',
  renderer: 'svg',
  responsive: true,
  width: 300,
  aspectRatio: 0.618034,
  color: '#1f77b4',
  colorScheme: d3.schemeCategory10,
  stroke: 'none',
  strokeWidth: 1,
  fontSize: 14,
  lineHeight: 20
};

// Parse plotting data
d3.parseData = function (plot, data) {
  if (Array.isArray(data)) {
    // Normalize data structure
    data = data.filter(function (d) {
      return d !== null && d !== undefined;
    }).map(function (d, i) {
      if (Array.isArray(d)) {
        return d3.parseData(plot, d);
      }
      if (typeof d !== 'object') {
        return {
          index: String(i),
          value: d
        };
      }
      return d;
    });

    // Set up field mapping
    var component = d3.components[plot];
    var schema = component.schema || {};
    if (schema.type === 'object') {
      var entries = schema.entries;
      data = data.map(function (d) {
        var keys = Object.keys(d);
        entries.forEach(function (entry) {
          var key = entry.key;
          var type = entry.type;
          if (!d.hasOwnProperty(key)) {
            var mapping = null;
            entry.mappings.some(function (m) {
              if (keys.indexOf(m) !== -1) {
                mapping = m;
                return true;
              }
              return false;
            });
            if (mapping === null) {
              keys.some(function (k) {
                if (typeof d[k] === type) {
                  mapping = k;
                  return true;
                }
                return false;
              });
            }
            if (mapping) {
              var value = d[mapping];
              if (type === 'number') {
                value = Number(value);
              }
              d[key] = value;
            }
          }
        });
        return d;
      });
    }
  }
  return data;
};

// Parse plotting options
d3.parseOptions = function (plot, options) {
  // Set default component options
  var component = d3.components[plot];
  for (var key in component) {
    if (component.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = component[key];
    }
  }

  // Set default plotting options
  var defaults = d3.defaultOptions;
  var id = options.id || defaults.id;
  var canvas = d3.select('#' + id);
  if (defaults.responsive && !options.hasOwnProperty('responsive')) {
    if (!options.hasOwnProperty('width')) {
      var width = parseInt(canvas.style('width')) || defaults.width;
      options.width = Math.round(width);
    }
    if (!options.hasOwnProperty('height')) {
      var aspectRatio = options.aspectRatio || defaults.aspectRatio;
      var height = parseInt(canvas.style('height')) || (options.width * aspectRatio);
      options.height = Math.round(height);
    }
    if (!options.hasOwnProperty('fontSize')) {
      options.fontSize = parseInt(canvas.style('font-size'));
    }
    if (!options.hasOwnProperty('lineHeight')) {
      options.lineHeight = parseInt(canvas.style('line-height'));
    }
  }
  for (var key in defaults) {
    if (defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = defaults[key];
    }
  }
  options.canvas = canvas;

  // Set the context
  var container = canvas.node();
  if (container.tagName === 'CANVAS') {
    options.renderer = 'canvas';
    canvas = container;
  }
  if (options.renderer === 'canvas') {
    if (container.tagName !== 'CANVAS') {
      canvas = document.createElement('canvas');
      container.appendChild(canvas);
    }
    canvas.width = options.width;
    canvas.height = options.height;
    options.context = canvas.getContext('2d');
  } else {
    options.context = null;
  }
  return options;
};
