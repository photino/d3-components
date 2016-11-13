
// Default plotting options
d3.defaultOptions = {
  id: 'chart',
  renderer: 'svg',
  width: 300,
  aspectRatio: 0.618034,
  color: '#1f77b4',
  colorScheme: d3.schemeCategory10,
  stroke: 'none',
  strokeWidth: 1
};

// Parse and normalize plotting data
d3.parseData = function (data, options) {
  return data;
};

// Parse and normalize plotting options
d3.parseOptions = function (data, options) {
  var defaults = options.defaults;
  for (var key in defaults) {
    if (defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = defaults[key];
    }
  }
  options.defaults = {};

  // Set global default options
  var defaultOptions = d3.defaultOptions;
  var id = options.id || defaultOptions.id;
  var canvas = d3.select('#' + id);
  if (!options.hasOwnProperty('width')) {
    var width = parseInt(canvas.style('width')) || defaultOptions.width;
    options.width = Math.round(width);
  }
  if (!options.hasOwnProperty('height')) {
    var aspectRatio = options.aspectRatio || defaultOptions.aspectRatio;
    var height = parseInt(canvas.style('height')) || (options.width * aspectRatio);
    options.height = Math.round(height);
  }
  for (var key in defaultOptions) {
    if (defaultOptions.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = defaultOptions[key];
    }
  }
  options.canvas = canvas;

  // Set the context
  var container = document.getElementById(id);
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
