/*!
 * Core modules
 */

// D3 components
d3.components = {};

// Default plotting options
d3.defaultOptions = {
  id: 'chart',
  renderer: 'svg',
  standalone: true,
  responsive: true,
  width: 400,
  height: 250,
  aspectRatio: 0.618034,
  color: '#1f77b4',
  colorScheme: d3.schemeCategory10,
  stroke: 'none',
  strokeWidth: 1,
  fontSize: 14,
  lineHeight: 20,
  title: {
    show: false,
    x: '50%',
    y: '1.6em',
    height: '2em',
    wrapText: true,
    wrapWidth: '90%',
    lineHeight: '2em',
    stroke: 'none',
    fill: 'currentColor',
    fontSize: '1.4em',
    fontWeight: 'bold',
    textAnchor: 'middle',
    text: ''
  },
  tooltip: {
    show: true,
    autoplay: false,
    carousel: {
      delay: 2000,
      interval: 2000
    },
    html: function (d, i) {
      return 'Datum ' + i;
    },
    style: {
      display: 'none',
      boxSizing: 'border-box',
      position: 'absolute',
      pointerEvents: 'none',
      padding: '0.2em 0.6em',
      backgroundColor: '#fff',
      border: '1px solid #999',
      borderRadius: '0.2em',
      color: '#333',
      fontSize: '85%',
      opacity: 0.8
    }
  },
  legend: {
    autoplay: false,
    carousel: {
      delay: 2000,
      interval: 2000
    },
    type: 'checkbox',
    display: 'block',
    maxWidth: '6.8em',
    columns: 5,
    symbol: {
      shape: 'rect',
      width: '0.8em',
      height: '0.8em'
    },
    dx: '0.4em',
    transform: 'scale(0.85)',
    lineHeight: '1.6em',
    textColor: 'currentColor',
    disabledTextColor: '#ccc',
    key: function (d, i) {
      return i;
    }
  },
  axisX: {
    show: true,
    orient: 'bottom',
    ticks: {
      number: 8,
      sizeInner: 6,
      sizeOuter: 0,
      padding: 4
    },
    domain: {
      show: true,
      stroke: 'currentColor',
      strokeWidth: 1
    },
    fontSize: '0.85em',
    stroke: 'currentColor',
    fill: 'currentColor'
  },
  axisY: {
    show: true,
    orient: 'left',
    ticks: {
      number: 6,
      sizeInner: 6,
      sizeOuter: 0,
      padding: 4
    },
    domain: {
      show: true,
      stroke: 'currentColor',
      strokeWidth: 1
    },
    fontSize: '0.85em',
    stroke: 'currentColor',
    fill: 'currentColor'
  },
  gridX: {
    show: false,
    stroke: '#ccc',
    strokeDash: [6, 4]
  },
  gridY: {
    show: false,
    stroke: '#ccc',
    strokeDash: [6, 4]
  },
  labelX: {
    show: false,
    text: 'X',
    dy: '2.8em',
    fill: 'currentColor',
    textAnchor: 'end'
  },
  labelY: {
    show: false,
    text: 'Y',
    dy: '-3em',
    fill: 'currentColor',
    textAnchor: 'end',
    transform: 'rotate(-90)'
  }
};

// Create a chart
d3.createChart = function (chart) {
  if (d3.type(chart) === 'object') {
    var plot = d3[chart.type];
    if (d3.type(plot) === 'function') {
      if (chart.reload === true) {
        var interval = Number(chart.interval);
        chart.reload = false;
        d3.interval(function () {
          d3.createChart(chart);
        }, interval);
      } else {
        var data = chart.data;
        var options = chart.options;
        var dataType = d3.type(data);
        if (dataType === 'string') {
          d3.json(data, function (object) {
            return plot(object, options);
          });
        } else if (dataType === 'object' && data.api) {
          var type = data.type;
          var api = data.api;
          if (type === 'json') {
            d3.json(api, function (object) {
              return plot(object, options);
            });
          } else if (type === 'csv') {
            var row = data.row || function (d) { return d; };
            d3.csv(api, row, function (object) {
              return plot(object, options);
            });
          }
        } else {
          return plot(data, options);
        }
      }
    }
  }
};

// Parse plotting data
d3.parseData = function (plot, data) {
  var component = d3.components[plot];
  var schema = component.schema || {};
  var hierarchy = schema.hierarchy;
  var type = d3.type(data);
  if (type === 'array') {
    // Normalize data structure
    data = data.filter(function (d) {
      return d !== null && d !== undefined;
    }).map(function (d, i) {
      if (Array.isArray(d)) {
        d = d.map(function (datum) {
          if (!datum.hasOwnProperty('series')) {
            datum.series = String(i);
          }
          return datum;
        });
        return d3.parseData(plot, d);
      }
      if (d3.type(d) !== 'object') {
        return {
          index: String(i),
          value: d
        };
      }
      return d;
    });

    // Set up field mapping
    if (schema.type === 'object' && schema.mapping !== false) {
      var entries = schema.entries;
      data = data.map(function (d) {
        var keys = Object.keys(d);
        entries.forEach(function (entry) {
          var key = entry.key;
          var type = entry.type;
          var mapping = null;
          if (d.hasOwnProperty(key)) {
            if (key === hierarchy && type === 'array') {
              d[hierarchy] = d3.parseData(plot, d[hierarchy]);
            }
            keys.splice(keys.indexOf(key), 1);
            mapping = key;
          } else {
            var mappings = entry.mappings || [];
            mappings.some(function (m) {
              var i = keys.indexOf(m);
              if (i !== -1) {
                keys.splice(i, 1);
                mapping = m;
                return true;
              }
              return false;
            });
            if (mapping === null) {
              keys.some(function (k) {
                if (d3.type(d[k]) === type) {
                  keys.splice(keys.indexOf(k), 1);
                  mapping = k;
                  return true;
                }
                return false;
              });
            }
          }
          if (mapping) {
            var value = d[mapping];
            if (type === 'string') {
              value = String(value);
            } else if (type === 'number') {
              value = Number(value);
            } else if (type === 'date') {
              value = new Date(value);
            }
            d[key] = value;
          }
        });
        return d;
      });
    }
    return [].concat.apply([], data);
  } else if (type === 'object') {
    return d3.parseData(plot, [data])[0];
  }
  return data;
};

// Parse plotting options
d3.parseOptions = function (plot, options) {
  // Set default component options
  var component = d3.components[plot];
  options = d3.extend(component, options);

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
  options = d3.extend(defaults, options);

  // Set the tooltip
  var chart = canvas.node();
  var tooltip = d3.extend({ id: id + '-tooltip' }, options.tooltip);
  options.tooltip = tooltip;
  chart.style.position = 'relative';
  if (tooltip.show) {
    var tooltipId = tooltip.id;
    var tooltipStyle = tooltip.style;
    var tooltipNode = d3.select('#' + tooltipId).node();
    if (tooltipNode === null) {
      tooltipNode = document.createElement('div');
      tooltipNode.id = tooltipId;
      tooltipNode.className = 'tooltip';
      for (var key in tooltipStyle) {
        if (tooltipStyle.hasOwnProperty(key)) {
          tooltipNode.style[key] = tooltipStyle[key];
        }
      }
      if (chart.tagName === 'CANVAS') {
        chart.parentNode.insertBefore(tooltipNode, chart);
      } else {
        chart.appendChild(tooltipNode);
      }
    }
  }

  // Set the context
  options.chart = chart;
  if (chart.tagName === 'CANVAS') {
    options.renderer = 'canvas';
    canvas = chart;
  }
  if (options.renderer === 'canvas') {
    if (chart.tagName !== 'CANVAS') {
      canvas = document.createElement('canvas');
      chart.appendChild(canvas);
    }
    canvas.width = options.width;
    canvas.height = options.height;
    options.context = canvas.getContext('2d');
  } else {
    options.context = null;
  }

  // Parse option values
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      options[key] = d3.parseValue(options[key], options);
    }
  }

  // Parse map config
  if (options.hasOwnProperty('map')) {
    var map = options.map || {};
    var name = map.name || 'world';
    options.map = d3.extend(d3.mapData[name], map);
  }

  // Set the margins
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;
  var margin = d3.extend({
    top: lineHeight,
    right: 2 * fontSize,
    bottom: 2 * lineHeight,
    left: 4 * fontSize
  }, options.margin);
  options.margin = margin;
  options.innerWidth = options.width - margin.left - margin.right;
  options.innerHeight = options.height - margin.top - margin.bottom;

  return options;
};

// Parse value within a context
d3.parseValue = function (value, context) {
  var type = d3.type(value);
  if (type === 'object') {
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        value[key] = d3.parseValue(value[key], context);
      }
    }
  } else if (type === 'string') {
    if (/^\-?\d+\.?\d*(px)$/.test(value)) {
      value = Number(value.replace('px', ''));
    } else if (/^\-?\d+\.?\d*(em)$/.test(value)) {
      if (context.hasOwnProperty('fontSize')) {
        value = Number(value.replace('em', '')) * context.fontSize;
      }
    } else if (/^\-?\d+\.?\d*\%$/.test(value)) {
      if (context.hasOwnProperty('width')) {
        value = Number(value.replace('%', '')) * context.width / 100;
      }
    } else if (/^(a|de)scending\(\w+\)$/.test(value)) {
      var parts = value.split(/\W/);
      var order = parts[0];
      var key = parts[1];
      value = function (a, b) {
        var sign = order === 'ascdending' ? -1 : 1;
        if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
          if (a[key] === undefined || a[key] === null) {
            return sign;
          }
          return d3[order](a[key], b[key]) || -sign;
        }
        if (a.data && b.data) {
          if (a.data[key] == undefined || a.data[key] === null) {
            return sign;
          }
          return d3[order](a.data[key], b.data[key]) || -sign;
        }
        return 0;
      };
    }
  }
  return value;
};

// Get the type of a value
d3.type = function (value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

// Combine two objects with deep copy
d3.extend = function (object1, object2) {
  var object = {};
  if (d3.type(object1) === 'object') {
    for (var key in object1) {
      if (object1.hasOwnProperty(key)) {
        var value = object1[key];
        if (d3.type(value) === 'object') {
          value = d3.extend(object[key], value);
        }
        object[key] = value;
      }
    }
  }
  if (d3.type(object2) === 'object') {
    for (var key in object2) {
      if (object2.hasOwnProperty(key)) {
        var value = object2[key];
        if (d3.type(value) === 'object') {
          value = d3.extend(object[key], value);
        }
        object[key] = value;
      }
    }
  }
  return object;
};

// Format template string
d3.formatString = function (template, data) {
  var string = String(template);
  var type = d3.type(data);
  if (type === 'object') {
    var placeholder = /\$\{\s*([^\{\}\s]+)\s*\}/g;
    var matches = string.match(placeholder) || [];
    matches.forEach(function (str) {
      var key = str.replace(placeholder, '$1');
      var value = data[key];
      if (d3.type(value) === 'object') {
        var keys = String(key).replace(/\[([^\]]+)\]/g, '.$1').split('.');
        keys.every(function (key) {
          if (d3.type(value) === 'object') {
            if (value.hasOwnProperty(key)) {
              value = value[key];
              return true;
            }
          }
          return false;
        });
      }
      string = string.replace(str, function () {
        return value;
      });
    });
  }
  return string;
};

// Generate a translation transform
d3.translate = function (dx, dy) {
  return 'translate(' + dx + ',' + dy + ')';
};

// Generate the points of a regular polygon
d3.regularPolygon = function (n, r) {
  var theta = 2 * Math.PI / n;
  return d3.range(n).map(function (i) {
    var angle = theta * i;
    return [r * Math.sin(angle), -r * Math.cos(angle)];
  });
};

// Create a plot
d3.createPlot = function (chart, options) {
  // Return the chart if it exists
  if (!options.standalone) {
    var svg = d3.select(chart)
                .select('svg');
    if (svg.node() !== null) {
      return svg;
    }
  }

  // Create the `svg` element
  var width = options.width;
  var height = options.height;
  var svg = d3.select(chart)
              .append('svg')
              .attr('class', options.type)
              .attr('width', width)
              .attr('display', 'block');

  // Set the title
  var titleHeight = 0;
  var title = options.title;
  if (title.show) {
    var margin = options.margin;
    var t = svg.append('text')
               .attr('class', 'title')
               .attr('x', title.x)
               .attr('y', title.y)
               .attr('stroke', title.stroke)
               .attr('fill', title.fill)
               .attr('font-size', title.fontSize)
               .attr('font-weight', title.fontWeight)
               .attr('text-anchor', title.textAnchor)
               .text(title.text)
               .call(d3.wrapText, title);
    var lines = Math.ceil(t.node().getComputedTextLength() / title.wrapWidth);
    titleHeight = lines * title.lineHeight;
    margin.top += titleHeight;
  }
  title.height = titleHeight;

  // Create the container
  var transform = d3.translate(width / 2, height / 2 + titleHeight);
  var g = svg.attr('height', height + titleHeight)
             .append('g')
             .attr('class', 'container')
             .attr('transform', transform)
             .attr('stroke', options.stroke)
             .attr('stroke-width', options.strokeWidth);
  return svg;
};

// Get the position relative to the container
d3.getPosition = function (selection, container) {
  var node = d3.select(selection).node();
  var position = node.getBoundingClientRect();
  var tagName = container.tagName;
  while (node.parentElement.tagName !== tagName) {
    node = node.parentElement;
  }

  // Get the container position
  var containerPosition = node.parentElement.getBoundingClientRect();
  return {
    top: position.top - containerPosition.top,
    left: position.left - containerPosition.left,
    width: position.width,
    height: position.height
  };
};

// Set an axis
d3.setAxis = function (scale, options) {
  var axis = d3.axisBottom(scale);
  var orient = options.orient;
  var ticks = options.ticks || {};
  if (orient === 'top') {
    axis = d3.axisTop(scale);
  } else if (orient === 'left') {
    axis = d3.axisLeft(scale);
  } else if (orient === 'right') {
    axis = d3.axisRight(scale);
  }
  axis.ticks(ticks.number)
      .tickSizeInner(ticks.sizeInner)
      .tickSizeOuter(ticks.sizeOuter)
      .tickPadding(ticks.padding)
      .tickValues(ticks.values)
      .tickFormat(ticks.format);
  return axis;
};

// Set axes
d3.setAxes = function (container, options) {
  var g = container;
  var width = options.width;
  var height = options.height;
  var axisX = options.axisX || {};
  var axisY = options.axisY || {};
  var orientX = axisX.orient || 'bottom';
  var orientY = axisY.orient || 'left';
  var domainX = axisX.domain;
  var domainY = axisY.domain;
  var sx = d3.setAxis(options.scaleX, axisX);
  var sy = d3.setAxis(options.scaleY, axisY);
  if (options.framed) {
    if (axisX.show) {
      var axisBottom = g.select('.axis-bottom');
      var axisTop = g.select('.axis-top');
      if (axisBottom.empty()) {
        axisBottom = g.append('g')
                      .attr('class', 'axis axis-x axis-bottom');
      }
      if (axisTop.empty()) {
        axisTop = g.append('g')
                   .attr('class', 'axis axis-x axis-top');
      }
      axisBottom.attr('transform', d3.translate(0, height))
                .call(sx);
      axisTop.call(sx.tickFormat(''));
    }
    if (axisY.show) {
      var axisLeft = g.select('.axis-left');
      var axisRight = g.select('.axis-right');
      if (axisLeft.empty()) {
        axisLeft = g.append('g')
                    .attr('class', 'axis axis-y axis-left');
      }
      if (axisRight.empty()) {
        axisRight = g.append('g')
                     .attr('class', 'axis axis-y axis-right');
      }
      axisLeft.call(sy);
      axisRight.attr('transform', d3.translate(width, 0))
               .call(sy.tickFormat(''));
    }
  } else {
    if (axisX.show) {
      var ax = g.select('.axis-x');
      if (ax.empty()) {
        ax = g.append('g')
              .attr('class', 'axis axis-x');
      }
      if (orientX === 'bottom') {
        ax.attr('transform', d3.translate(0, height));
      }
      ax.call(sx);
    }
    if (axisY.show) {
      var ay = g.select('.axis-y');
      if (ay.empty()) {
        ay = g.append('g')
              .attr('class', 'axis axis-y');
      }
      if (orientY === 'right') {
        ay.attr('transform', d3.translate(width, 0));
      }
      ay.call(sy);
    }
  }
  if (axisX.show) {
    g.selectAll('.axis-x')
     .attr('font-size', axisX.fontSize)
     .selectAll('text')
     .attr('text-anchor', axisX.textAnchor)
     .attr('transform', axisX.transform)
     .attr('rotate', axisX.rotate)
     .attr('fill', axisX.fill);
    g.selectAll('.axis-x')
     .selectAll('line')
     .attr('stroke', axisX.stroke)
     .attr('stroke-width', axisX.strokeWidth);
    g.selectAll('.axis-x')
     .select('.domain')
     .attr('stroke', domainX.stroke)
     .attr('stroke-width', domainX.strokeWidth)
     .attr('display', domainX.show ? 'block' : 'none');
  }
  if (axisY.show) {
    g.selectAll('.axis-y')
     .attr('font-size', axisY.fontSize)
     .selectAll('text')
     .attr('text-anchor', axisY.textAnchor)
     .attr('transform', axisY.transform)
     .attr('rotate', axisY.rotate)
     .attr('fill', axisY.fill);
    g.selectAll('.axis-y')
     .selectAll('line')
     .attr('stroke', axisY.stroke)
     .attr('stroke-width', axisY.strokeWidth);
    g.selectAll('.axis-y')
     .select('.domain')
     .attr('stroke', domainX.stroke)
     .attr('stroke-width', domainY.strokeWidth)
     .attr('display', domainY.show ? 'block' : 'none');
  }

  // Grid lines
  var gridX = options.gridX || {};
  var gridY = options.gridY || {};
  if (gridX.show) {
    var gx = g.select('.grid-x');
    if (gx.empty()) {
      gx = g.insert('g', ':first-child')
            .attr('class', 'grid grid-x');
    }
    gx.attr('stroke-dasharray', gridX.strokeDash.join())
      .call(sy.tickSize(-width, 0).tickFormat(''));
    gx.select('.domain')
      .attr('stroke-width', 0);
    gx.selectAll('.tick')
      .attr('stroke-width', function () {
         var transform = d3.select(this)
                           .attr('transform');
         var dy = +transform.replace(/\,?\s+/, ',').split(/[\,\(\)]/)[2];
         return (Math.abs(dy) < 1 || Math.abs(dy - height) < 1) ? 0 : null;
       })
       .select('line')
       .attr('stroke', gridX.stroke);
  }
  if (gridY.show) {
    var gy = g.select('.grid-y');
    if (gy.empty()) {
      gy = g.insert('g', ':first-child')
            .attr('class', 'grid grid-y');
    }
    gy.attr('stroke-dasharray', gridY.strokeDash.join())
      .attr('transform', d3.translate(0, height))
      .call(sx.tickSize(-height, 0).tickFormat(''));
    gy.select('.domain')
      .attr('stroke-width', 0);
    gy.selectAll('.tick')
      .attr('stroke-width', function () {
        var transform = d3.select(this)
                          .attr('transform');
        var dx = +transform.replace(/\,?\s+/, ',').split(/[\,\(\)]/)[1];
        return (Math.abs(dx) < 1 || Math.abs(dx - width) < 1) ? 0 : null;
      })
      .select('line')
      .attr('stroke', gridY.stroke);
  }
};

// Set labels
d3.setLabels = function (container, options) {
  var g = container;
  var width = options.width;
  var height = options.height;
  var labelX = options.labelX;
  var labelY = options.labelY;
  var anchorX = labelX.textAnchor;
  var anchorY = labelY.textAnchor;
  if (labelX.show) {
    var lx = g.select('.label-x');
    var tx = 0;
    if (anchorX === 'middle') {
      tx = width / 2;
    } else if (anchorX === 'end') {
      tx = width;
    }
    if (lx.empty()) {
      lx = g.append('text')
            .attr('class', 'label label-x');
    }
    lx.attr('x', tx)
      .attr('y', height)
      .attr('dy', labelX.dy)
      .attr('transform', labelX.transform)
      .attr('fill', labelX.fill)
      .attr('text-anchor', anchorX)
      .text(labelX.text);
  }
  if (labelY.show) {
    var ly = g.select('.label-y');
    var ty = height;
    if (anchorY === 'middle') {
      ty = height / 2;
    } else if (anchorY === 'end') {
      ty = 0;
    }
    if (ly.empty()) {
      ly = g.append('text')
            .attr('class', 'label label-y');
    }
    ly.attr('x', -ty)
      .attr('y', 0)
      .attr('dy', labelY.dy)
      .attr('transform', labelY.transform)
      .attr('fill', labelY.fill)
      .attr('text-anchor', anchorY)
      .text(labelY.text);
  }
};

// Set the legend
d3.setLegend = function (container, options) {
  var show = options.show;
  var data = options.data;
  if (show || show === null && data.length > 1) {
    var type = options.type;
    var display = options.display;
    var maxWidth = options.maxWidth;
    var columns = options.columns;
    var symbol = options.symbol;
    var symbolShape = symbol.shape;
    var symbolWidth = Math.round(symbol.width);
    var symbolHeight = Math.round(symbol.height);
    var textColor = options.textColor;
    var disabledTextColor = options.disabledTextColor;
    var lineHeight = options.lineHeight;
    var legend = container.select('.legend');
    if (legend.empty()) {
      legend = container.append('g')
                        .attr('class', 'legend')
                        .attr('transform', options.translation)
                        .attr('cursor', 'pointer');
    }

    var items = legend.selectAll('.legend-item')
                      .data(data, options.key);
    items.exit()
         .remove();
    items.enter()
         .append('g')
         .attr('class', function (d) {
           if (!d.hasOwnProperty('disabled')) {
             d.disabled = d.data && d.data.disabled || false;
           }
           return 'legend-item' + (d.disabled ? ' disabled' : '');
         })
         .attr('transform', options.transform);

    var item = container.selectAll('.legend-item');
    var shape = item.select(symbolShape);
    if (shape.empty()) {
      if (symbolShape === 'circle') {
        item.append('circle')
            .attr('cx', function (d, i) {
              if (display === 'inline-block') {
                return maxWidth * (i % columns) + symbolWidth / 2;
              }
              return symbolWidth / 2;
            })
            .attr('cy', function (d, i) {
              if (display === 'inline-block') {
                i = Math.floor(i / columns);
              }
              return lineHeight * (i + 1) - symbolHeight / 2;
            })
            .attr('r', Math.min(symbolWidth, symbolHeight) / 2);
      } else if (symbolShape === 'rect') {
        item.append('rect')
            .attr('width', symbolWidth)
            .attr('height', symbolHeight)
            .attr('x', function (d, i) {
              if (display === 'inline-block') {
                return maxWidth * (i % columns);
              }
              return 0;
            })
            .attr('y', function (d, i) {
              if (display === 'inline-block') {
                i = Math.floor(i / columns);
              }
              return lineHeight * (i + 1) - symbolHeight;
            })
            .attr('rx', options.rx)
            .attr('ry', options.ry);
      }
    }
    item.select(symbolShape)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : d.color;
        });

    var dx = options.dx;
    var maxTextLength = maxWidth - symbolWidth - dx * 2;
    var text = item.select('text');
    if (text.empty()) {
      item.append('text')
          .attr('x', function (d, i) {
            if (display === 'inline-block') {
              return maxWidth * (i % columns) + symbolWidth;
            }
            return symbolWidth;
          })
          .attr('y', function (d, i) {
            if (display === 'inline-block') {
              i = Math.floor(i / columns);
            }
            return lineHeight * (i + 1);
          })
          .attr('dx', dx)
          .attr('lengthAdjust', 'spacingAndGlyphs');
    }
    item.select('text')
        .text(options.text)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : textColor;
        })
        .attr('textLength', function (d) {
          var textLength = d3.select(this).node().getComputedTextLength();
          return textLength > maxTextLength ? maxTextLength : null;
        });

    item.on('click', function (d) {
      var disabled = d.disabled;
      if (type === 'checkbox') {
        d.disabled = !disabled;
      } else if (type === 'radio') {
        d.disabled = false;
      }
      var item = d3.select(this)
                   .classed('disabled', d.disabled);
      item.select(symbolShape)
          .attr('fill', d.disabled ? disabledTextColor : d.color);
      item.select('text')
          .attr('fill', d.disabled ? disabledTextColor : textColor);
      options.onclick(d);
    });
    if (options.autoplay) {
      item.call(d3.triggerAction, d3.extend({
        event: 'click',
        carousel: true
      }, options.carousel));
    }
  }
};

// Set the tooltip
d3.setTooltip = function (chart, options) {
  if (options.show) {
    var tooltip = d3.select('#' + options.id);
    var lineHeight = parseInt(tooltip.style('line-height'));
    var target = options.target;
    var effect = options.effect;
    target.on('mouseover', function (d, i) {
      var position = d3.mouse(chart);
      var left = position[0];
      var top = position[1];
      tooltip.attr('class', 'tooltip')
             .style('display', 'block')
             .html(options.html(d, i));
      if (isNaN(left) || isNaN(top)) {
        var offsetX = parseInt(tooltip.style('width')) / 2;
        var offsetY = parseInt(tooltip.style('height')) + lineHeight / 6;
        position = d3.getPosition(this, chart);
        left = position.left + position.width / 2 - offsetX;
        top = position.top + position.height / 2 - offsetY;
      }
      tooltip.style('left', left + 'px')
             .style('top', top + 'px');
      if (effect === 'darker') {
        d3.select(this)
          .attr('fill', d3.color(d.color).darker());
      }
    })
    .on('mousemove', function (d) {
      var position = d3.mouse(chart);
      var offsetX = parseInt(tooltip.style('width')) / 2;
      var offsetY = parseInt(tooltip.style('height')) + lineHeight / 6;
      tooltip.style('left', (position[0] - offsetX) + 'px')
             .style('top', (position[1] - offsetY) + 'px');
    })
    .on('mouseout', function (d) {
      tooltip.style('display', 'none');
      if (effect === 'darker') {
        d3.select(this)
          .attr('fill', d.color);
      }
    });
    if (options.autoplay) {
      target.call(d3.triggerAction, d3.extend({
        event: 'mouseover',
        carousel: true
      }, options.carousel));
    }
  }
};

// Set arrows
d3.setArrows = function (chart, options) {
  var arrow = options.arrow;
  if (arrow.show) {
    var svg = d3.select(chart)
                .select('svg');

    // Defs
    var defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.insert('defs', ':first-child');
    }

    // Marker
    var markerSize = arrow.size;
    var markerRef = markerSize / 2;
    var markerStrokeWidth = arrow.strokeWidth;
    var markerId = chart.id + '-arrow';
    var marker = defs.select('.arrow');
    if (marker.empty()) {
      marker = defs.append('marker')
                   .attr('class', 'arrow')
                   .attr('markerUnits', 'strokeWidth')
                   .attr('orient', 'auto');
    }
    marker.attr('id', markerId)
          .attr('markerWidth', markerSize)
          .attr('markerHeight', markerSize)
          .attr('viewBox', '0 0 ' + markerSize + ' ' + markerSize)
          .attr('refX', markerRef)
          .attr('refY', markerRef);

    // Path
    var path = marker.select('path');
    if (path.empty()) {
      path = marker.append('path');
    }
    path.attr('stroke', arrow.stroke)
        .attr('strokeWidth', markerStrokeWidth)
        .attr('fill', arrow.fill)
        .attr('d', function () {
          var d = d3.path();
          var markerStart = 2 * markerStrokeWidth;
          var markerLength = markerSize - markerStart;

          d.moveTo(markerStart, markerStart);
          d.lineTo(markerLength, markerRef);
          d.lineTo(markerStart, markerLength);
          d.lineTo(markerRef, markerRef);
          d.lineTo(markerStart, markerStart);
          return d.toString();
        });
    options.path.attr('marker-end', 'url(#' + markerId + ')');
  }
};

// Wrap long labels: http://bl.ocks.org/mbostock/7555321
d3.wrapText = function (selection, options) {
  if (options.wrapText) {
    var wrapWidth = options.wrapWidth;
    var lineHeight = options.lineHeight;
    selection.each(function () {
      var label = d3.select(this);
      var words = label.text().split(/\s+/).reverse();
      if (words.length > 1) {
        var x = label.attr('x');
        var y = label.attr('y');
        var dy = parseFloat(label.attr('dy'));
        var tspan = label.text(null).append('tspan');
        var word = words.pop();
        var lineNumber = 0;
        var line = [];
        while (word) {
          line.push(word);
          tspan.text(line.join(' '));
          if (tspan.node().getComputedTextLength() > wrapWidth) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            lineNumber += 1;
            tspan = label.append('tspan')
                         .attr('x', x)
                         .attr('dy', lineHeight)
                         .text(word);
          }
          word = words.pop();
        }
        if (options.verticalAlign) {
          var align = options.verticalAlign;
          var factor = 0;
          if (align === 'middle') {
            factor = 1 / 2;
          } else if (align === 'bottom') {
            factor = 1;
          }
          label.attr('y', y - lineNumber * lineHeight * factor);
        }
      }
    });
  }
};

// Trigger an action
d3.triggerAction = function (selection, options) {
  var event = options.event || options;
  var filter = options && options.filter || null;
  var sort = options && options.sort || null;
  var elements = filter !== null ? selection.filter(filter) : selection;
  var nodes = elements.sort(sort).nodes();
  if (d3.type(options) === 'object') {
    var delay = options.delay || 0;
    var length = nodes.length;
    if (length && options.carousel) {
      var interval = options.interval || 2000;
      var limit = options.limit || length;
      var randomize = options.randomize;
      var infinite = options.infinite;
      var index = 0;
      var count = 0;
      var timer = d3.timer(function (elapsed) {
        if (elapsed > interval * count) {
          count += 1;
          d3.select(nodes[index])
            .dispatch(event);
          if (randomize === true) {
            index = Math.floor(Math.random() * length);
          } else {
            index = (index + 1) % length;
          }
        }
        if (infinite === false && count >= limit) {
          timer.stop();
        }
      }, delay);
    } else {
      d3.timeout(function () {
        d3.selectAll(nodes)
          .dispatch(event);
      }, delay);
    }
  } else {
    d3.selectAll(nodes)
      .dispatch(event);
  }
};

// Create image tiles
d3.setTiles = function (selection, options) {
  var tileImage = options.image;
  var tileSize = tileImage.size;
  var tileHref = tileImage.href;
  if (d3.type(tileHref) === 'object') {
    var service = d3.mapTiles[tileHref.service] || {};
    var themes = service.themes || [];
    if (Array.isArray(themes)) {
      var token = tileHref.token || service.token;
      var theme = tileHref.theme || themes[0];
      var subdomain = tileHref.subdomain;
      var subdomains = service.subdomains || [];
      var length = subdomains.length;
      var url = service.url;
      tileHref = function (d) {
        var domain = subdomain;
        if (length && subdomain === undefined) {
          domain = subdomains[Math.random() * length | 0];
        }
        return d3.formatString(url, {
          k: token,
          s: domain,
          t: theme,
          x: d.x,
          y: d.y,
          z: d.z
        });
      };
    }
  }

  var tiles = d3.tile()
                .size(options.size)
                .scale(options.scale)
                .translate(options.translate)
                .wrap(options.wrap)();
  var image = selection.selectAll('image')
                       .data(tiles, function (d) {
                         return [d.tx, d.ty, d.z];
                       });
  image.exit()
       .remove();
  image.enter()
       .append('image')
       .attr('xlink:href', tileHref)
       .attr('x', function (d) {
         return d.tx;
       })
       .attr('y', function (d) {
         return d.ty;
       })
       .attr('width', tileSize + 1)
       .attr('height', tileSize + 1);

  selection.attr('transform', function () {
             var s = tiles.scale;
             var t = tiles.translate;
             var k = s / tileSize;
             var r = s % 1 ? Number : Math.round;
             var x = r(t[0] * s);
             var y = r(t[1] * s);
             return 'translate(' + x + ',' + y + ') scale(' + k + ')';
           })
           .style('filter', options.filter);

};

// Parse geo data
d3.parseGeoData = function (map, options) {
  var data = map.data;
  var key = map.key || 'id';
  var dataset = options && options.data || [];
  var features = [];
  var neighbors = [];
  var type = d3.type(data);
  if (type === 'object') {
    if (data.hasOwnProperty('features')) {
      features = data.features;
    } else if (d3.type(topojson) === 'object') {
      if (map.object) {
        var object = data.objects[map.object];
        features = topojson.feature(data, object).features;
        if (options.neighbors) {
          neighbors = topojson.neighbors(object.geometries);
        }
      }
    }
  }
  if (options.mixin) {
    dataset.forEach(function (d) {
      var value = d[key];
      var matched = features.some(function (feature) {
        var property = String(feature[key] || feature.properties[key]);
        if (value === property) {
          d.coordinates = feature.geometry.coordinates;
          return true;
        }
        return false;
      });
      if (!matched) {
        features.some(function (feature) {
          var property = String(feature[key] || feature.properties[key]);
          if (/^\W/.test(value) && new RegExp(value).test(property)) {
            d.coordinates = feature.geometry.coordinates;
            return true;
          }
          return false;
        });
      }
    });
    return dataset;
  }
  return {
    features: features.map(function (feature, index) {
      var property = String(feature[key] || feature.properties[key] || index);
      feature.data = {
        id: property,
        value: undefined
      };
      var matched = dataset.some(function (d) {
        if ((d[key] || d.id) === property) {
          feature.data = d;
          return true;
        }
        return false;
      });
      if (!matched) {
        dataset.some(function (d) {
          var value = String(d[key]);
          if (/^\W/.test(value) && new RegExp(value).test(property)) {
            feature.data = d;
            return true;
          }
          return false;
        });
      }
      return feature;
    }),
    neighbors: neighbors
  };
};

// Built-in map data
d3.mapData = {
  world: {
    center: [0, 0],
    scale: 1
  },
  china: {
    key: 'name',
    center: [103.3886, 35.5636],
    scale: 1
  }
};

// Built-in map tiles
d3.mapTiles = {
  amap: {
    url: 'https://webrd03.is.autonavi.com/appmaptile?size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}'
  },
  geoq: {
    url: 'https://map.geoq.cn/ArcGIS/rest/services/${t}/MapServer/tile/${z}/${y}/${x}',
    themes: [
      'ChinaOnlineCommunity_Mobile',
      'ChinaOnlineCommunityENG',
      'ChinaOnlineCommunity',
      'ChinaOnlineCommunityOnlyENG',
      'ChinaOnlineStreetCold',
      'ChinaOnlineStreetColor',
      'ChinaOnlineStreetGray',
      'ChinaOnlineStreetPurplishBlue',
      'ChinaOnlineStreetWarm'
    ]
  },
  google: {
    url: 'https://google.cn/maps/vt?x=${x}&y=${y}&z=${z}'
  },
  mediawiki: {
    url: 'https://maps.wikimedia.org/${t}/${z}/${x}/${y}.png',
    themes: [
      'osm',
      'osm-intl'
    ]
  },
  openstreetmap: {
    url: 'https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png',
    subdomains: ['a', 'b', 'c']
  },
  stamen: {
    url: 'https://stamen-tiles-${s}.a.ssl.fastly.net/${t}/${z}/${x}/${y}.jpg',
    subdomains: ['a', 'b', 'c', 'd'],
    themes: [
      'terrain',
      'terrain-labels',
      'terrain-lines',
      'terrain-background',
      'watercolor'
    ]
  },
  geohey: {
    url: 'https://${s}.geohey.com/s/mapping/${t}/all?z=${z}&x=${x}&y=${y}&ak=${k}',
    subdomains: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'],
    themes: [
      'warm',
      'cool',
      'midnight',
      'pencil',
      'dark',
      'contrast',
      'pink',
      'vision',
      'adventure',
      'blue',
      'light',
      'fresh',
      'natural',
      'admin',
      'tourism',
      'river',
      'chinese'
    ],
    token: 'MGUxMmI2ZTk4YTVhNDEzYmJhZDJkNDM3ZWI5ZDAwOGE'
  },
  mapbox: {
    url: 'https://${s}.tiles.mapbox.com/v4/mapbox.${t}/${z}/${x}/${y}.png?access_token=${k}',
    subdomains: ['a', 'b', 'c', 'd'],
    themes: [
      'natural-earth-2',
      'streets',
      'light',
      'dark',
      'satellite',
      'streets-satellite',
      'wheatpaste',
      'streets-basic',
      'comic',
      'outdoors',
      'run-bike-hike',
      'pencil',
      'pirates',
      'emerald',
      'high-contrast'
    ],
    token: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NDg1bDA1cjYzM280NHJ5NzlvNDMifQ.d6e-nNyBDtmQCVwVNivz7A'
  },
  thunderforest: {
    url: 'https://${s}.tile.thunderforest.com/${t}/${z}/${x}/${y}.png?apikey=${k}',
    subdomains: ['a', 'b', 'c'],
    themes: [
      'cycle',
      'transport',
      'landscape',
      'outdoors',
      'transport-dark',
      'spinal-map'
    ],
    token: '7c352c8ff1244dd8b732e349e0b0fe8d'
  }
};

/*!
 * Bar Chart
 * References: https://bl.ocks.org/d3noob/8952219
 *             https://bl.ocks.org/mbostock/3885304
 *             https://bl.ocks.org/mbostock/3943967
 */

// Register a chart type
d3.components.barChart = {
  type: 'bar chart',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'category',
        type: 'string',
        mappings: [
          'label',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'frequency',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  sort: null,
  stacked: false,
  horizontal: false,
  paddingInner: 0.4,
  paddingOuter: 0.4,
  paddingMidst: 0,
  align: 0.5,
  framed: false,
  refline: {
    show: false,
    stroke: '#d62728',
    strokeWidth: 1,
    strokeDash: [6, 4],
    threshold: Infinity
  },
  legend: {
    show: null,
    text: function (d) {
      return d.series;
    }
  },
  tooltip: {
    html: function (d) {
      return d.category + ': ' + d.value;
    }
  },
  margin: {
    top: '4em',
    right: '2em',
    bottom: '2em',
    left: '4em'
  }
};

// Bar chart
d3.barChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('barChart', data);
  options = d3.parseOptions('barChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Global data variables
  var categories = options.categories || [];
  var groups = options.series || [];
  var dataset = [];

  // Coordinates and scales
  var x = null;
  var y = null;
  var maxValue = 0;
  if (options.horizontal) {
    x = d3.scaleLinear()
          .rangeRound([0, innerWidth]);
    y = d3.scaleBand()
          .paddingInner(options.paddingInner)
          .paddingOuter(options.paddingOuter)
          .rangeRound([innerHeight, 0])
          .align(options.align);
  } else {
    x = d3.scaleBand()
          .paddingInner(options.paddingInner)
          .paddingOuter(options.paddingOuter)
          .rangeRound([0, innerWidth])
          .align(options.align);
    y = d3.scaleLinear()
          .rangeRound([innerHeight, 0]);
  }

  // Colors
  var colors = d3.scaleOrdinal()
                 .domain(groups)
                 .range(colorScheme);
  var color = function (d) { return colors(d.series); };

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Process data
    dispatch.on('init.data', function (data) {
      var labels = d3.set(data, function (d) { return d.category; });
      var series = d3.set(data, function (d) { return d.series; });
      if (labels.size() !== categories.length) {
        categories = labels.values();
      }
      if (series.size() !== groups.length) {
        groups = series.values();
      }
      if (!dataset.length) {
        dataset = groups.map(function (series) {
          return {
            series: series,
            disabled: false,
            color: colors(series)
          };
        });
      }
      data.sort(function (a, b) {
        var i = categories.indexOf(a.category);
        var j = categories.indexOf(b.category);
        if (i !== j) {
          return d3.ascending(i, j);
        } else {
          var k = groups.indexOf(a.series);
          var l = groups.indexOf(b.series);
          return d3.ascending(k, l);
        }
      });
    });

    // Layout
    dispatch.on('init.layout', function (data) {
      var stacked = options.stacked;
      var horizontal = options.horizontal;
      if (stacked) {
        maxValue = d3.max(categories, function (category) {
          return d3.sum(data, function (d) {
            return d.category === category ? d.value : 0;
          });
        });
      } else {
        maxValue = d3.max(data, function (d) {
          return d.value;
        });
      }
      if (horizontal) {
        x.domain([0, maxValue]);
        y.domain(categories);
      } else {
        x.domain(categories);
        y.domain([0, maxValue]);
      }

      var layout = g.select('.layout');
      if (layout.empty()) {
        layout = g.append('g')
                  .attr('class', 'layout');
      }

      // Rects
      var rects = layout.selectAll('.slice')
                        .data(data);
      rects.exit()
           .remove();
      rects.enter()
           .append('rect')
           .attr('class', 'slice');

      var rect = layout.selectAll('.slice');
      if (horizontal) {
        var bandwidth = y.bandwidth();
        if (stacked) {
          rect.attr('y', function (d) {
                return y(d.category);
              })
              .attr('x', function (d, i) {
                var category = d.category;
                var value = d3.sum(data.slice(0, i), function (d) {
                  return d.category === category ? d.value : 0;
                });
                return x(value);
              });
        } else {
          var m = groups.length;
          var rectHeight = bandwidth / m;
          var dy = y.step() * options.paddingMidst;
          var ty = rectHeight + dy + 1;
          var sy = dy * (m - 1) / 2 - 1;
          bandwidth = rectHeight;
          rect.attr('x', 0)
              .attr('y', function (d, i) {
                var category = d.category;
                var j = data.slice(0, i).reduce(function (s, d) {
                  return s + (d.category === category ? 1 : 0);
                }, 0);
                return y(category) + (d.series !== groups[0] ? ty : 1) * j - sy;
              });
        }
        rect.attr('width', function (d) {
              return x(d.value);
            })
            .attr('height', bandwidth);
      } else {
        var bandwidth = x.bandwidth();
        if (stacked) {
          rect.attr('x', function (d) {
                return x(d.category);
              })
              .attr('y', function (d, i) {
                var category = d.category;
                var value = d3.sum(data.slice(0, i + 1), function (d) {
                  return d.category === category ? d.value : 0;
                });
                return y(value);
              });
        } else {
          var m = groups.length;
          var rectWidth = bandwidth / m;
          var dx = x.step() * options.paddingMidst;
          var tx = rectWidth + dx + 1;
          var sx = dx * (m - 1) / 2 - 1;
          bandwidth = rectWidth;
          rect.attr('x', function (d, i) {
                var category = d.category;
                var j = data.slice(0, i).reduce(function (s, d) {
                  return s + (d.category === category ? 1 : 0);
                }, 0);
                return x(category) + (d.series !== groups[0] ? tx : 1) * j - sx;
              })
              .attr('y', function (d) {
                return y(d.value);
              });
        }
        rect.attr('width', bandwidth)
            .attr('height', function (d) {
              return innerHeight - y(d.value);
            });
      }
      rect.attr('stroke', function (d) {
            d.color = colors(d.series);
            return d3.color(d.color).darker();
          })
          .attr('stroke-width', strokeWidth)
          .attr('fill', color);
    });

    // Refline
    dispatch.on('init.refline', function (data) {
      var refline = options.refline;
      var threshold = refline.threshold;
      if (refline.show && maxValue > threshold) {
        var line = g.select('.refline');
        if (line.empty()) {
          line = g.select('.layout')
                  .append('line')
                  .attr('class', 'refline');
        }
        line.attr('stroke', refline.stroke)
            .attr('stroke-width', refline.strokeWidth)
            .attr('stroke-dasharray', refline.strokeDash.join());
        if (options.horizontal) {
          var xmin = x(threshold);
          line.attr('x1', xmin)
              .attr('y1', 0)
              .attr('x2', xmin)
              .attr('y2', innerHeight);
        } else {
          var ymin = y(threshold);
          line.attr('x1', 0)
              .attr('y1', ymin)
              .attr('x2', innerWidth)
              .attr('y2', ymin);
        }
      }
    });

    // Axes
    dispatch.on('init.axes', function (data) {
      var axisX = options.axisX;
      var axisY = options.axisY;
      if (options.horizontal) {
        if (axisX.ticks.format === undefined) {
          axisX.ticks.format = d3.format('d');
        }
      } else {
        if (axisY.ticks.format === undefined) {
          axisY.ticks.format = d3.format('d');
        }
      }
      d3.setAxes(g, {
        width: innerWidth,
        height: innerHeight,
        scaleX: x,
        scaleY: y,
        axisX: axisX,
        axisY: axisY,
        gridX: options.gridX,
        gridY: options.gridY,
        framed: options.framed
      });
    });

    // Set labels
    dispatch.on('init.labels', function (data) {
      d3.setLabels(g, {
        width: innerWidth,
        height: innerHeight,
        labelX: options.labelX,
        labelY: options.labelY
      });
    });

    // Tooltip
    dispatch.on('update.tooltip', function (layout) {
      var tooltip = options.tooltip;
      tooltip.target = layout.selectAll('rect');
      tooltip.effect = 'darker';
      d3.setTooltip(chart, tooltip);
    });

    // Legend
    dispatch.on('finalize.legend', function () {
      var legend = options.legend;
      if (!legend.translation) {
        legend.translation = d3.translate(-margin.left, -margin.top);
      }
      legend.data = dataset;
      legend.onclick = function (d) {
        var series = d.series;
        var disabled = d.disabled;
        data.forEach(function (d) {
          if (d.series === series) {
            d.disabled = disabled;
          }
        });
        dispatch.call('init', this, data.filter(function (d) {
          return !d.disabled;
        }));
        dispatch.call('update', this, g.select('.layout'));
      };
      d3.setLegend(g, legend);
    });

    dispatch.call('init', this, data);
    dispatch.call('update', this, g.select('.layout'));
    dispatch.call('finalize', this);

  }
};

/*!
 * Pie Chart
 * References: https://bl.ocks.org/dbuezas/9306799
 */

// Register a chart type
d3.components.pieChart = {
  type: 'pie chart',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'label',
        type: 'string',
        mappings: [
          'category',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      }
    ]
  },
  sort: null,
  arcs: {
    maxRatio: 0.8,
    donutRatio: 0,
    innerRadius: 0
  },
  labels: {
    show: false,
    dy: '0.25em',
    stroke: 'none',
    fill: '#fff',
    centroidRatio: 1,
    minAngle: Math.PI / 10,
    wrapText: false,
    wrapWidth: '5em',
    lineHeight: '1.2em',
    verticalAlign: 'middle',
    text: function (d) {
      var percentage = (d.endAngle - d.startAngle) / (2 * Math.PI);
      return d3.format('.0%')(percentage);
    }
  },
  legend: {
    show: true,
    text: function (d) {
      return d.data.label;
    }
  },
  tooltip: {
    html: function (d) {
      var percentage = (d.endAngle - d.startAngle) / (2 * Math.PI);
      return d.data.label + ': ' + d3.format('.1%')(percentage);
    }
  }
};

// Pie chart
d3.pieChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('pieChart', data);
  options = d3.parseOptions('pieChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Arcs
  var arcs = options.arcs;
  var maxRatio = arcs.maxRatio;
  var donutRatio = arcs.donutRatio;
  var outerRadius = arcs.outerRadius || Math.min(innerWidth, innerHeight) / 2;
  var innerRadius = arcs.innerRadius || outerRadius * donutRatio;
  if (d3.type(innerRadius) === 'number' && d3.type(outerRadius) === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and slices
  var pie = d3.pie()
              .sort(options.sort)
              .value(function (d) {
                return d.disabled ? 0 : d.value;
              });
  var arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
              .context(context);
  var slices = pie(data);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Slices
    dispatch.on('init.slices', function (slices) {
      var slice = g.selectAll('.arc')
                   .data(slices, function (d) {
                     return d.label;
                   });
      slice.exit()
           .remove();
      slice.enter()
           .append('g')
           .attr('class', 'arc')
           .attr('stroke', arcs.stroke);
    });

    // Arcs
    dispatch.on('update.arcs', function (slice) {
      var colors = d3.scaleOrdinal(colorScheme);
      slice.append('path')
           .attr('d', arc)
           .attr('fill', function (d) {
             d.color = colors(d.data.label);
             return d.color;
           });
    });

    // Labels
    dispatch.on('update.labels', function (slice) {
      var labels = options.labels;
      if (labels.show) {
        var centroidRatio = labels.centroidRatio;
        slice.append('text')
             .attr('class', 'label')
             .attr('x', function (d) {
               return arc.centroid(d)[0] * centroidRatio;
             })
             .attr('y', function (d) {
               return arc.centroid(d)[1] * centroidRatio;
             })
             .attr('dy', labels.dy)
             .attr('fill', labels.fill)
             .attr('stroke', labels.stroke)
             .attr('text-anchor', 'middle')
             .text(labels.text)
             .style('display', function (d) {
               var angle = d.endAngle - d.startAngle;
               return angle < labels.minAngle ? 'none' : 'block';
             })
             .call(d3.wrapText, labels);
      }
    });

    // Tooltip
    dispatch.on('update.tooltip', function (slice) {
      var tooltip = options.tooltip;
      tooltip.target = slice.selectAll('path');
      tooltip.effect = 'darker';
      d3.setTooltip(chart, tooltip);
    });

    // Legend
    dispatch.on('finalize.legend', function () {
      var legend = options.legend;
      if (!legend.translation) {
        legend.translation = d3.translate(-width / 2, -height / 2);
      }
      legend.data = slices;
      legend.onclick = function (d) {
        var label = d.data.label;
        var disabled = d.data.disabled;
        data.some(function (d) {
          if (d.label === label) {
            d.disabled = !disabled;
            return true;
          }
          return false;
        });
        dispatch.call('init', this, pie(data));
        dispatch.call('update', this, g.selectAll('.arc'));
      };
      d3.setLegend(g, legend);
    });

    // Load components
    dispatch.call('init', this, slices);
    dispatch.call('update', this, g.selectAll('.arc'));
    dispatch.call('finalize', this);

  }
};

/*!
 * Line Chart
 * References: https://bl.ocks.org/mbostock/3883245
 *             https://bl.ocks.org/mbostock/3884955
 */

// Register a chart type
d3.components.lineChart = {
  type: 'line chart',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'x',
        type: 'number',
        mappings: [
          'year',
          'name'
        ]
      },
      {
        key: 'y',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio',
          'value'
        ]
      }
    ]
  },
  sort: null,
  lines: {
    curve: 'curveLinear',
    density: 1,
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: 'none'
  },
  dots: {
    show: false,
    radius: '0.5%',
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: '#fff'
  },
  tooltip: {
    html: function (d) {
      var f = d3.format('.3');
      var x = Number(d.x.toFixed(3));
      var y = Number(d.y.toFixed(3));
      return 'x: ' + f(x) + ', y: ' + f(y);
    }
  }
};

// Line chart
d3.lineChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('lineChart', data);
  options = d3.parseOptions('lineChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Values
  var lines = options.lines;
  var sizeX = Math.round(innerWidth * lines.density);
  var domainX = options.domainX;
  var domainY = options.domainY;
  var dataType = d3.type(data);
  var dataset = [];
  if (dataType === 'function') {
    var xmin = domainX[0];
    var xmax = domainX[1];
    var dx = (xmax - xmin) / sizeX;
    d3.range(xmin, xmax + dx / 2, dx).forEach(function (x) {
      var y = data(x);
      dataset.push({ x: x, y: y });
    });
  } else if (dataType === 'array') {
    data.sort(function (a, b) {
      return d3.ascending(a.x, b.x);
    });
    dataset = data;
  }
  if (domainX === undefined) {
    domainX = d3.extent(dataset, function (d) { return d.x; });
  }
  if (domainY === undefined) {
    domainY = d3.extent(dataset, function (d) { return d.y; });
  }

  // Layout
  var x = d3.scaleLinear()
            .domain(domainX)
            .rangeRound([0, innerWidth])
            .nice();
  var y = d3.scaleLinear()
            .domain(domainY)
            .rangeRound([innerHeight, 0])
            .nice();
  var line = d3.line()
               .x(function (d) { return x(d.x); })
               .y(function (d) { return y(d.y); })
               .curve(d3[lines.curve]);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Set axes and grids
    d3.setAxes(g, {
      width: innerWidth,
      height: innerHeight,
      scaleX: x,
      scaleY: y,
      axisX: options.axisX,
      axisY: options.axisY,
      gridX: options.gridX,
      gridY: options.gridY,
      framed: options.framed
    });

    // Set labels
    d3.setLabels(g, {
      width: innerWidth,
      height: innerHeight,
      labelX: options.labelX,
      labelY: options.labelY
    });

    // Lines
    g.append('g')
     .attr('class', 'lines')
     .append('path')
     .datum(dataset)
     .attr('d', line)
     .attr('stroke', lines.stroke)
     .attr('stroke-width', lines.strokeWidth)
     .attr('fill', lines.fill);
    }

    // Dots
    var dots = options.dots;
    if (dots.show) {
      g.append('g')
       .attr('class', 'dots')
       .selectAll('.dot')
       .data(dataset)
       .enter()
       .append('circle')
       .attr('class', 'dot')
       .attr('cx', function (d) {
         return x(d.x);
       })
       .attr('cy', function (d) {
         return y(d.y);
       })
       .attr('r', dots.radius)
       .attr('stroke', dots.stroke)
       .attr('stroke-width', dots.strokeWidth)
       .attr('fill', dots.fill);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.dot');
    d3.setTooltip(chart, tooltip);
};

/*!
 * Bubble Chart
 */

// Register a chart type
d3.components.bubbleChart = {
  type: 'bubble chart',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'x',
        type: 'number',
        mappings: [
          'category',
          'name',
          'year'
        ]
      },
      {
        key: 'y',
        type: 'number',
        mappings: [
          'count'
        ]
      },
      {
        key: 'z',
        type: 'number',
        mappings: []
      }
    ]
  },
  offsetX: [0.5, 0.5],
  offsetY: [0, 0],
  framed: false,
  axisX: {
    ticks: {
      format: d3.format('d')
    }
  },
  axisY: {
    ticks: {
      format: d3.format('d')
    }
  },
  gridX: {
    show: true
  },
  dots: {
    scale: '2%',
    minRadius: 4,
    maxRadius: Infinity,
    normalize: 'sqrt',
    stroke: '#fff',
    opacity: 0.8,
    gradient: false,
    hue: 160,
    saturation: 0.8,
    lightness: 0.6
  },
  tooltip: {
    html: function (d) {
      return 'x = ' + d.x + '<br/>y = ' + d.y + '<br/>z = ' + d.z;
    }
  }
};

// Bubble chart
d3.bubbleChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('bubbleChart', data);
  options = d3.parseOptions('bubbleChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Coordinates and scales
  var offsetX = options.offsetX;
  var offsetY = options.offsetY;
  var extentX = d3.extent(data, function (d) { return d.x; });
  var extentY = d3.extent(data, function (d) { return d.y; });
  var extentZ = d3.extent(data, function (d) { return d.z; });
  var xmin = extentX[0];
  var xmax = extentX[1];
  var ymin = extentY[0];
  var ymax = extentY[1];
  var zmin = extentZ[0];
  var zmax = extentZ[1];
  var x = d3.scaleLinear()
            .domain(options.domainX || [xmin - offsetX[0], xmax + offsetX[1]])
            .rangeRound(options.rangeX || [0, innerWidth]);
  var y = d3.scaleLinear()
            .domain(options.domainY || [ymin - offsetY[0], ymax + offsetY[1]])
            .rangeRound(options.rangeY || [innerHeight, 0])
            .nice();

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Set axes and grids
    d3.setAxes(g, {
      width: innerWidth,
      height: innerHeight,
      scaleX: x,
      scaleY: y,
      axisX: options.axisX,
      axisY: options.axisY,
      gridX: options.gridX,
      gridY: options.gridY,
      framed: options.framed
    });

    // Set labels
    d3.setLabels(g, {
      width: innerWidth,
      height: innerHeight,
      labelX: options.labelX,
      labelY: options.labelY
    });

    // Add dots
    var colors = d3.scaleOrdinal(colorScheme);
    var dots = options.dots;
    var scale = dots.scale;
    var minRadius = dots.minRadius;
    var maxRadius = dots.maxRadius;
    var normalize = dots.normalize;
    var opacity = dots.opacity;
    var hue = dots.hue;
    var saturation = dots.saturation;
    var lightness = dots.lightness;
    var dot = g.selectAll('.dot')
               .data(data)
               .enter()
               .append('circle')
               .attr('class', 'dot')
               .attr('cx', function (d) {
                 return x(d.x);
               })
               .attr('cy', function (d) {
                 return y(d.y);
               })
               .attr('r', function (d) {
                 var z = 0;
                 if (maxRadius === Infinity || !maxRadius) {
                   z = d.z / zmax;
                 } else if (maxRadius > minRadius) {
                   z = (d.z - zmin) / (zmax - zmin);
                   scale = maxRadius - minRadius;
                 }
                 if (normalize === 'sqrt') {
                   z = Math.sqrt(z);
                 }
                 return Math.round(z * scale + minRadius);
               })
               .attr('opacity', opacity)
               .attr('stroke', dots.stroke)
               .attr('fill', function (d) {
                 if (typeof dots.color === 'function') {
                   return dots.color(d);
                 }
                 if (dots.gradient) {
                   var h = hue * (1 - d.y / ymax) + (180 - hue);
                   var s = saturation * (d.y - ymin) / ((ymax - ymin) || 1) + (1 - saturation);
                   var l = lightness - (1 - lightness) * (d.x - xmin) / ((xmax - xmin) || 1);
                   return d3.hsl(h, s, l);
                 }
                 return colors(d.x);
               })
               .sort(function (a, b) {
                 // Defines a sort order so that the smallest dots are drawn on top
                 return b.z - a.z;
               });

    if (dots.onclick) {
      dot.attr('cursor', 'pointer')
         .on('click', function (d) {
           if (typeof dots.onclick === 'function') {
             dots.onclick(d);
           }
         });
    }

    // Create the tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.dot');
    d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Radar Chart
 * References: https://bl.ocks.org/nbremer/6506614
 *             https://bl.ocks.org/nbremer/21746a9668ffdf6d8242
 *             https://bl.ocks.org/tpreusse/2bc99d74a461b8c0acb1
 */

// Register a chart type
d3.components.radarChart = {
  type: 'radar chart',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'axis',
        type: 'string',
        mappings: [
          'category',
          'label',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  sort: null,
  curve: 'curveLinearClosed',
  levels: 3,
  maxValue: 0,
  grids: {
    show: true,
    shape: 'polygon',
    stroke: '#ccc',
    strokeWidth: 1,
    fill: 'none'
  },
  rays: {
    show: true,
    stroke: '#999',
    strokeWidth: 1
  },
  areas: {
    stroke: '#1f77b4',
    strokeWidth: 2,
    fill: '#3182bd',
    opacity: 0.65
  },
  dots: {
    show: true,
    radius: '0.5%',
    strokeWidth: 1,
    fill: '#fff'
  },
  labels: {
    show: true,
    dy: '0.25em',
    padding: '1em',
    wrapText: false,
    wrapWidth: '10em',
    lineHeight: '1.2em',
    verticalAlign: 'middle',
    fill: 'currentColor'
  },
  legend: {
    show: null,
    text: function (d) {
      return d.series;
    }
  },
  tooltip: {
    html: function (d) {
      return d.axis + ': ' + d.value;
    }
  }
};

// Radar chart
d3.radarChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('radarChart', data);
  options = d3.parseOptions('radarChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Process data
  var axes = options.axes || [];
  var groups = options.series || [];
  var dataset = [];
  var values = [];
  data.forEach(function (d) {
    var axis = d.axis;
    var series = d.series;
    if (axes.indexOf(axis) === -1) {
      axes.push(axis);
    }
    if (groups.indexOf(series) === -1) {
      groups.push(series);
    }
    values.push(d.value);
  });
  dataset = groups.map(function (series) {
    var array = data.filter(function (d) {
      return d.series === series;
    });
    return {
      series: series,
      disabled: false,
      data: axes.map(function (axis) {
        var datum = null;
        array.some(function (d) {
          if (d.axis === axis) {
            datum = d;
            return true;
          }
          return false;
        });
        if (datum === null) {
          datum = {
            axis: axis,
            value: 0
          };
        }
        return datum;
      })
    };
  });

  // Layout
  var dimension = axes.length;
  var theta = 2 * Math.PI / dimension;
  var radius = Math.min(innerWidth, innerHeight) / 2;
  var rmax = Math.max(d3.max(values), options.maxValue);
  var rscale = d3.scaleLinear()
                 .range([0, radius])
                 .domain([0, rmax]);
  var radar = d3.radialLine()
                .radius(function (d) {
                  return rscale(d.value);
                })
                .angle(function (d, i) {
                  return theta * i;
                })
                .curve(d3[options.curve])
                .context(context);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Grids
    var grids = options.grids;
    var levels = options.levels;
    if (grids.show) {
      var shape = grids.shape;
      if (shape === 'polygon') {
        g.selectAll('.grid')
         .data(d3.range(1, levels + 1))
         .enter()
         .append('polygon')
         .attr('class', 'grid')
         .attr('points', function (d) {
           var r = rscale(rmax / levels * d);
           return d3.regularPolygon(dimension, r).join(' ');
         })
         .attr('stroke', grids.stroke)
         .attr('stroke-width', grids.strokeWidth)
         .attr('fill', grids.fill);
      } else if (shape === 'circle') {
        g.selectAll('.grid')
         .data(d3.range(1, levels + 1))
         .enter()
         .append('circle')
         .attr('class', 'grid')
         .attr('cx', 0)
         .attr('cy', 0)
         .attr('r', function (d) {
           return radius / levels * d;
         })
         .attr('stroke', grids.stroke)
         .attr('stroke-width', grids.strokeWidth)
         .attr('fill', grids.fill);
      }
    }

    // Radical lines
    var rays = options.rays;
    if (rays.show) {
      g.selectAll('.ray')
       .data(d3.range(dimension))
       .enter()
       .append('line')
       .attr('class', 'ray')
       .attr('x1', 0)
       .attr('y1', 0)
       .attr('x2', function (d) {
         return radius * Math.sin(theta * d);
       })
       .attr('y2', function (d) {
         return -radius * Math.cos(theta * d);
       })
       .attr('stroke', rays.stroke)
       .attr('stroke-width', rays.strokeWidth);
    }

    // Areas and dots
    var colors = d3.scaleOrdinal(colorScheme);
    var color = function (d) { return d.color; };
    var darkColor = function (d) { return d3.color(d.color).darker(); };
    var areas = options.areas;
    var dots = options.dots;
    var s = g.selectAll('.series')
             .data(dataset)
             .enter()
             .append('g')
             .attr('class', 'series')
             .attr('stroke', function (d) {
               d.color = colors(d.series);
               return d3.color(d.color).darker();
             })
             .attr('stroke-width', areas.strokeWidth)
             .style('display', function (d) {
               return d.disabled ? 'none' : 'block';
             });
    var area = s.append('path')
                .attr('class', 'area')
                .attr('d', function (d) {
                  return radar(d.data);
                })
                .attr('fill', color)
                .attr('opacity', areas.opacity)
                .on('mouseover', function () {
                  s.selectAll('.area')
                   .attr('fill', 'none')
                   .attr('pointer-events', 'none');
                  d3.select(this)
                    .attr('fill', darkColor)
                    .attr('pointer-events', 'visible');
                })
                .on('mouseout', function () {
                  s.selectAll('.area')
                   .attr('fill', color)
                   .attr('pointer-events', 'visible');
                });
   if (dots.show) {
      s.selectAll('.dot')
       .data(function (d) {
         return d.data;
       })
       .enter()
       .append('circle')
       .attr('class', 'dot')
       .attr('cx', function (d, i) {
         return rscale(d.value) * Math.sin(theta * i);
       })
       .attr('cy', function (d, i) {
         return -rscale(d.value) * Math.cos(theta * i);
       })
       .attr('r', dots.radius)
       .attr('stroke', dots.stroke)
       .attr('stroke-width', dots.strokeWidth)
       .attr('fill', dots.fill);
   }

    // Labels
    var labels = options.labels;
    if (labels.show) {
      var r = radius + labels.padding;
      g.selectAll('.label')
       .data(axes)
       .enter()
       .append('text')
       .attr('class', 'label')
       .attr('x', function (d, i) {
         return r * Math.sin(theta * i);
       })
       .attr('y', function (d, i) {
         return -r * Math.cos(theta * i);
       })
       .attr('dy', labels.dy)
       .attr('text-anchor', function (d, i) {
         var anchor = 'middle';
         if (i > 0 && i < Math.ceil(dimension / 2)) {
           anchor = 'start';
         } else if (i >= Math.floor(dimension / 2) + 1) {
           anchor = 'end';
         }
         return anchor;
       })
       .attr('fill', labels.fill)
       .text(function (d) {
         return d;
       })
       .call(d3.wrapText, labels);
    }

    // Legend
    var legend = options.legend;
    if (!legend.translation) {
      legend.translation = d3.translate(-width / 2, -height / 2);
    }
    legend.data = dataset;
    legend.onclick = function () {
      s.style('display', function (d) {
        return d.disabled ? 'none' : 'block';
      });
    };
    d3.setLegend(g, legend);

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = s.selectAll('.dot');
    d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Sunburst Chart
 * References: https://bl.ocks.org/maybelinot/5552606564ef37b5de7e47ed2b7dc099
 */

// Register a chart type
d3.components.sunburstChart = {
  type: 'sunburst chart',
  schema: {
    type: 'object',
    hierarchy: 'children',
    entries: [
      {
        key: 'label',
        type: 'string',
        mappings: [
          'category',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'children',
        type: 'array'
      }
    ]
  },
  sort: null,
  donut: {
    show: false,
    ratio: 0.2,
    radius: 20
  },
  zoomable: true,
  labels: {
    show: false
  },
  tooltip: {
    html: function (d) {
      return d.data.label + ': ' + d.data.value;
    }
  },
  stroke: '#fff',
  colorScheme: d3.schemeCategory20c
};

// Sunburst chart
d3.sunburstChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('sunburstChart', data);
  options = d3.parseOptions('sunburstChart', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Layout and arcs
  var radius = Math.min(width, height) / 2;
  var x = d3.scaleLinear()
            .range([0, 2 * Math.PI]);
  var y = d3.scaleSqrt()
            .range([0, radius]);
  var root = d3.hierarchy(data, function (d) {
                  return d.children;
               })
               .sum(function (d) {
                 return d.children ? 0 : d.value;
               });
  if (typeof options.sort === 'function') {
    root.sort(options.sort);
  }
  d3.partition()(root);

  // Arcs
  var arc = d3.arc()
              .startAngle(function (d) {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x0)));
              })
              .endAngle(function (d) {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x1)));
              })
              .innerRadius(function (d) {
                return Math.max(0, y(d.y0));
              })
              .outerRadius(function (d) {
                return Math.max(0, y(d.y1));
              })
              .context(context);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Create the `path` elements
    var colors = d3.scaleOrdinal(colorScheme);
    var donut = options.donut;
    var slice = g.selectAll('.arc')
                 .data(root.descendants())
                 .enter()
                 .append('g')
                 .attr('class', 'arc')
                 .append('path')
                 .attr('d', arc)
                 .attr('opacity', function (d) {
                   return donut.show && d.parent === null ? 0 : null;
                 })
                 .attr('fill', function (d) {
                   return colors((d.children ? d : d.parent).data.label);
                 });

    if (options.zoomable) {
      slice.attr('cursor', 'pointer')
           .on('click', function (d) {
             var donutRadius = radius * donut.ratio || donut.radius;
             g.transition()
              .tween('scale', function() {
                var xd = d3.interpolate(x.domain(), [d.x0, d.x1]);
                var yd = d3.interpolate(y.domain(), [d.y0, 1]);
                var yr = d3.interpolate(y.range(), [d.y0 ? donutRadius : 0, radius]);
                return function (t) {
                  x.domain(xd(t));
                  y.domain(yd(t))
                   .range(yr(t));
                };
              })
              .selectAll('path')
              .attrTween('d', function (d) {
                return function() { return arc(d); };
              });
           });
    }

    // Create the tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.arc');
    d3.setTooltip(chart, tooltip);
  }
};

/*!
 * Choropleth Map
 * References: https://bl.ocks.org/mbostock/4180634
 *             https://bl.ocks.org/mbostock/4060606
 */

// Register a chart type
d3.components.choroplethMap = {
  type: 'choropleth map',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'id',
        type: 'string',
        mappings: [
          'adcode',
          'city',
          'code',
          'county',
          'country',
          'district',
          'name',
          'nation',
          'province',
          'state'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  levels: 5,
  projection: 'geoMercator',
  coloring: 'ordinal',
  colorScale: 'scaleOrdinal',
  zoomable: false,
  scaleExtent: [1, 12],
  graticules: {
    show: false,
    step: [10, 10],
    precision: 1,
    stroke: '#ccc'
  },
  regions: {
    show: true,
    stroke: '#666',
    fill: '#fff'
  },
  tile: {
    show: false,
    zoomable: true,
    scale: 512,
    scaleExtent: [512, 262144],
    image: {
      size: 256
    }
  },
  labels: {
    show: false,
    dy: '0.25em',
    stroke: 'none',
    fill: '#333',
    fontSize: '0.5em',
    opacity: 1,
    text: function (d) {
      return d.data.id;
    }
  },
  tooltip: {
    html: function (d) {
      return d.data.id + ': ' + d.data.value
    }
  },
  colorScheme: d3.schemeCategory20c
};

// Choropleth map
d3.choroplethMap = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('choroplethMap', data);
  options = d3.parseOptions('choroplethMap', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var id = options.id;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var fill = options.fill;
  var strokeWidth = options.strokeWidth;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Domain
  var domain = options.domain || [];
  var extent = d3.extent(data, function (d) { return d.value; });
  var min = domain[0] || extent[0] || 0;
  var max = domain[1] || extent[1] || 1;

  // Create geo projection
  var map = options.map;
  var tile = options.tile;
  var projection = d3.geoMercator();
  if (tile.show && d3.tile) {
    options.zoomable = false;
    tile.size = [width, height];
    tile.center = tile.center || map.center;
    tile.scale = Math.max(tile.scale, width);
    projection.scale(1 / (2 * Math.PI))
              .translate([0, 0])
              .center([0, 0]);
  } else {
    projection = d3[options.projection]()
                   .scale(height * map.scale)
                   .translate(map.translate || [0, 0])
                   .rotate(map.rotate || [0, 0])
                   .center(map.center);
  }

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  // Parse geo data
  var geo = d3.parseGeoData(map, { data: data, neighbors: true });
  var features = geo.features;
  var neighbors = geo.neighbors;

  // Colors
  var coloring = options.coloring;
  var colorScale = options.colorScale;
  var colorScheme = options.colorScheme;
  var colors = d3.scaleOrdinal(colorScheme);
  if (colorScale === 'scaleSequential') {
    colors = d3.scaleSequential(colorScheme);
  } else if (colorScale === 'scaleThreshold') {
    var thresholds = options.thresholds || [];
    if (!thresholds.length) {
      var levels = options.levels;
      var step = (max - min) / levels;
      thresholds = d3.range(levels)
                     .map(function (i) { return step * i + min; });
    }
    colors = d3.scaleThreshold()
               .domain(thresholds)
               .range(colorScheme);
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Tiles
    if (tile.show && d3.tile) {
      var center = projection(tile.center);
      var transform = d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(tile.scale)
                        .translate(-center[0], -center[1]);
      var zoom = d3.zoom()
                   .scaleExtent(tile.scaleExtent)
                   .on('zoom', function () {
                     var transform = d3.event.transform;
                     tile.scale = transform.k;
                     tile.translate = [transform.x, transform.y];
                     d3.setTiles(svg.select('.tile'), tile);
                     projection.scale(tile.scale / (2 * Math.PI))
                               .translate(tile.translate);
                     g.selectAll('.region')
                      .attr('d', path);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                   });
      g.attr('transform', d3.translate(0, 0));
      svg.insert('g', ':first-child')
         .attr('class', 'tile');
      svg.call(zoom)
         .call(zoom.transform, transform);
      if (tile.zoomable === false) {
        zoom.on('zoom', null);
      }
    }

    // Graticules
    var graticules = options.graticules;
    if (graticules.show) {
      var graticule = d3.geoGraticule()
                        .step(graticules.step)
                        .precision(graticules.precision);
      g.append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke);
    }

    // Regions
    var regions = options.regions;
    if (regions.show) {
      var fill = regions.fill;
      g.append('g')
       .attr('class', 'layer')
       .selectAll('.region')
       .data(features)
       .enter()
       .append('path')
       .attr('class', 'region')
       .attr('d', path)
       .attr('stroke', regions.stroke)
       .attr('fill', function (d, i) {
         if (d.color) {
           return d.color;
         }
         if (fill === 'none') {
           return fill;
         }
         if (coloring === 'topological' && neighbors.length) {
           d.value = (d3.max(neighbors[i], function (n) {
             return features[n].value;
           }) | 0) + 1;
         } else {
           d.value = d.data.value;
         }
         if (d.value === undefined || d.value === null) {
           return fill;
         }
         if (colorScale === 'scaleSequential') {
           d.value = (d.value - min) / max;
         }
         return colors(d.value);
       })
       .attr('opacity', regions.opacity);
    }

    // Labels
    var labels = options.labels;
    if (labels.show) {
      g.selectAll('.label')
       .data(features)
       .enter()
       .append('text')
       .attr('class', 'label')
       .attr('x', function (d) {
         d.center = path.centroid(d);
         return d.center[0];
       })
       .attr('y', function (d) {
         return d.center[1];
       })
       .attr('dy', labels.dy)
       .attr('text-anchor', 'middle')
       .attr('stroke', labels.stroke)
       .attr('fill', labels.fill)
       .attr('font-size', labels.fontSize)
       .attr('opacity', labels.opacity)
       .text(labels.text);
    }

    if (options.zoomable) {
      var scale = projection.scale();
      var translate = projection.translate();
      var zoom = d3.zoom()
                   .scaleExtent(options.scaleExtent)
                   .on('zoom', function (d) {
                     var transform = d3.event.transform;
                     projection.scale(transform.k * scale)
                               .translate([
                                 translate[0] + transform.x,
                                 translate[1] + transform.y
                               ]);
                     g.selectAll('.graticule')
                      .attr('d', path);
                     g.selectAll('.region')
                      .attr('d', path);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                     g.selectAll('.label')
                      .attr('x', function (d) {
                        d.center = path.centroid(d);
                        return d.center[0];
                      })
                      .attr('y', function (d) {
                        return d.center[1];
                      });
                   });
      svg.attr('cursor', 'move')
         .call(zoom);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.region');
    d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Bubble Map
 */

// Register a chart type
d3.components.bubbleMap = {
  type: 'bubble map',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'id',
        type: 'string',
        mappings: [
          'adcode',
          'city',
          'code',
          'county',
          'country',
          'district',
          'name',
          'province',
          'state'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'lng',
        type: 'number',
        mappings: [
          'lon',
          'longitude'
        ]
      },
      {
        key: 'lat',
        type: 'number',
        mappings: [
          'latitude'
        ]
      }
    ]
  },
  sort: null,
  projection: 'geoMercator',
  tile: {
    show: false,
    scale: 512
  },
  dots: {
    scale: '0.5%',
    minRadius: 2,
    maxRadius: Infinity,
    stroke: '#fff',
    opacity: 0.8
  },
  labels: {
    show: false
  },
  tooltip: {
    html: function (d) {
      return d.id + ': ' + d.value;
    }
  }
};

// Bubble map
d3.bubbleMap = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('bubbleMap', data);
  options = d3.parseOptions('bubbleMap', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Domain
  var domain = options.domain || [];
  var extent = d3.extent(data, function (d) { return d.value; });
  var min = domain[0] || extent[0] || 0;
  var max = domain[1] || extent[1] || 1;

  // Create geo projection
  var map = options.map;
  var tile = options.tile;
  var projection = d3.geoMercator();
  if (tile.show && d3.tile) {
    tile.size = [width, height];
    tile.center = tile.center || map.center;
    tile.scale = Math.max(tile.scale, width);
    projection.scale(1 / (2 * Math.PI))
              .translate([0, 0])
              .center([0, 0]);
  } else {
    projection = d3[options.projection]()
                   .scale(height * map.scale)
                   .translate(map.translate || [0, 0])
                   .center(map.center);
  }

  // Parse geo data
  data = d3.parseGeoData(map, { data: data, mixin: true });

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Tiles
    if (tile.show && d3.tile) {
      var center = projection(tile.center);
      var transform = d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(tile.scale)
                        .translate(-center[0], -center[1]);
      var zoom = d3.zoom()
                   .on('zoom', function () {
                     var transform = d3.event.transform;
                     tile.scale = transform.k;
                     tile.translate = [transform.x, transform.y];
                     projection.scale(tile.scale / (2 * Math.PI))
                               .translate(tile.translate);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                   });
      g.call(zoom)
       .call(zoom.transform, transform);
      zoom.on('zoom', null);
    }

    // Circles
    var colors = d3.scaleOrdinal(colorScheme);
    var dots = options.dots;
    var scale = dots.scale;
    var minRadius = dots.minRadius;
    var maxRadius = dots.maxRadius;
    var circle = g.append('g')
                  .attr('class', 'layer')
                  .attr('stroke', dots.stroke)
                  .attr('opacity', dots.opacity)
                  .selectAll('.dot')
                  .data(data)
                  .enter()
                  .append('circle')
                  .attr('class', 'dot')
                  .each(function (d) {
                    d.coordinates = d.coordinates || [d.lng, d.lat];
                  })
                  .attr('cx', function (d) {
                    return projection(d.coordinates)[0]
                  })
                  .attr('cy', function (d) {
                    return projection(d.coordinates)[1]
                  })
                  .attr('r', function (d) {
                    var r = 0;
                    if (maxRadius === Infinity || !maxRadius) {
                      r = Math.sqrt(d.value / max) * scale;
                    } else if (maxRadius > minRadius) {
                      r = Math.sqrt((d.value - min) / (max - min)) * (maxRadius - minRadius);
                    }
                    return r + minRadius;
                  })
                  .attr('fill', function (d) {
                    return colors(d.value);
                  })
                  .sort(function (a, b) {
                    return b.value - a.value;
                  });

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.dot');
    d3.setTooltip(chart, tooltip);
  }
};

/*!
 * Contour Plot
 * References: https://bl.ocks.org/mbostock/f48ff9c1af4d637c9a518727f5fdfef5
 *             https://bl.ocks.org/mbostock/bf2f5f02b62b5b3bb92ae1b59b53da36
 */

// Register a chart type
d3.components.contourPlot = {
  type: 'contour plot',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'x',
        type: 'number',
        mappings: [
          'lng',
          'longitude'
        ]
      },
      {
        key: 'y',
        type: 'number',
        mappings: [
          'lat',
          'latitude'
        ]
      },
      {
        key: 'z',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio',
          'value'
        ]
      }
    ]
  },
  colorScale: 'scaleOrdinal',
  contours: {
    number: 10,
    smooth: true,
    density: 1
  },
  tooltip: {
    html: function (d) {
      var value = Number(d.value.toFixed(3));
      return d3.format('.3')(value);
    }
  }
};

// Contour plot
d3.contourPlot = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('contourPlot', data);
  options = d3.parseOptions('contourPlot', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Values
  var contours = options.contours;
  var density = contours.density;
  var size = contours.size || [];
  var sizeX = size[0] || Math.round(innerWidth * density);
  var sizeY = size[1] || Math.round(innerHeight * density);
  var scale = contours.scale || (innerHeight / sizeY);
  var domainX = options.domainX;
  var domainY = options.domainY;
  var dataType = d3.type(data);
  var values = [];
  if (dataType === 'function') {
    var dx = 1 / sizeX;
    var dy = 1 / sizeY;
    var extentX = domainX[1] - domainX[0];
    var extentY = domainY[1] - domainY[0];
    d3.range(dy / 2, 1, dy).forEach(function (sy) {
      d3.range(dx / 2, 1, dx).forEach(function (sx) {
        var x = domainX[0] + sx * extentX;
        var y = domainY[1] - sy * extentY;
        values.push(data(x, y));
      });
    });
  } else if (dataType === 'array') {
    data.sort(function (a, b) {
      return d3.descending(a.y, b.y) || d3.ascending(a.x, b.x);
    });
    values = data.map(function (d) {
      return d.z || d;
    });
  }

  // Axes
  var x = d3.scaleLinear()
            .domain(domainX)
            .rangeRound([0, innerWidth])
            .nice();
  var y = d3.scaleLinear()
            .domain(domainY)
            .rangeRound([innerHeight, 0])
            .nice();

  // Thresholds
  var extentZ = d3.extent(values);
  var thresholds = options.thresholds;
  if (d3.type(thresholds) !== 'array') {
    var zmin = extentZ[0];
    var zmax = extentZ[1];
    var step = (zmax - zmin) / contours.number;
    thresholds = d3.range(zmin, zmax, step);
  }

  // Colors
  var colorScale = options.colorScale;
  var colorScheme = options.colorScheme;
  var colors = d3.scaleOrdinal(colorScheme);
  if (colorScale === 'scaleSequential') {
    colors = d3.scaleSequential(colorScheme)
               .domain(extentZ);
  }

  // Contour generator
  var generator = d3.contours()
                    .size([sizeX, sizeY])
                    .thresholds(thresholds)
                    .smooth(contours.smooth);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Path
    g.append('g')
     .attr('class', 'contours')
     .attr('transform', function () {
       var sx = (innerWidth / innerHeight) / (sizeX / sizeY);
       return sx === 1 ? null : 'scale(' + sx + ',1)';
     })
     .selectAll('path')
     .data(generator(values))
     .enter()
     .append('path')
     .attr('class', 'contour')
     .attr('d', d3.geoPath(d3.geoIdentity().scale(scale)))
     .attr('fill', function (d) {
       return colors(d.value);
     })
     .attr('stroke', contours.stroke);

    // Set axes and grids
    d3.setAxes(g, {
      width: innerWidth,
      height: innerHeight,
      scaleX: x,
      scaleY: y,
      axisX: options.axisX,
      axisY: options.axisY,
      gridX: options.gridX,
      gridY: options.gridY,
      framed: options.framed
    });

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.contour');
    d3.setTooltip(chart, tooltip);
  }
};

/*!
 * Mosaic Plot
 */

// Register a chart type
d3.components.mosaicPlot = {
  type: 'mosaic plot',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'column',
        type: 'string',
        mappings: [
          'category'
        ]
      },
      {
        key: 'row',
        type: 'string',
        mappings: [
          'year'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  coloring: 'series',
  scaleX: {
    uniform: false,
    paddingInner: 0.1,
    paddingOuter: 0,
    paddingMidst: 0
  },
  scaleY: {
    uniform: false,
    paddingInner: 0.1,
    paddingOuter: 0
  },
  scaleZ: {
    uniform: false,
    independent: false,
    paddingMidst: 0
  },
  labels: {
    show: false,
    stroke: 'none',
    fill: '#fff',
    fontSize: '3%',
    minWidth: '6%',
    minHeight: '3%',
    text: function (d) {
      return d.value;
    }
  },
  tooltip: {
    html: function (d) {
      var html = 'column = ' + d.column + '<br/>row = ' + d.row;
      if (d.series) {
        html += '<br/>series = ' + d.series;
      }
      return html + '<br/>value = ' + d.value;
    }
  }
};

// Mosaic Plot
d3.mosaicPlot = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('mosaicPlot', data);
  options = d3.parseOptions('mosaicPlot', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Rows and columns
  var rows = options.rows || [];
  var columns = options.columns || [];
  var groups = options.series || [];
  if (!rows.length) {
    rows = d3.set(data, function (d) {
      return d.row;
    }).values();
  }
  if (!columns.length) {
    columns = d3.set(data, function (d) {
      return d.column;
    }).values();
  }
  if (!groups.length) {
    groups = d3.set(data, function (d) {
      return d.series;
    }).values();
  }

  // Layout
  var scaleX = options.scaleX;
  var scaleY = options.scaleY;
  var scaleZ = options.scaleZ;
  var x = d3.scaleBand()
            .domain(columns)
            .range([0, innerWidth])
            .paddingInner(scaleX.paddingInner)
            .paddingOuter(scaleX.paddingOuter);
  var y = d3.scaleBand()
            .domain(rows)
            .range([0, innerHeight])
            .paddingInner(scaleY.paddingInner)
            .paddingOuter(scaleY.paddingOuter);

  // Columns
  var columnMap = d3.map();
  var uniformX = scaleX.uniform;
  if (!uniformX) {
    var columnOffset = 0;
    var columnValues = columns.map(function (column) {
      return d3.sum(data, function (d) {
        return d.column === column ? d.value : 0;
      });
    });
    var columnAverage = d3.mean(columnValues);
    columns.forEach(function (column, index) {
      var columnRatio = columnValues[index] / columnAverage;
      columnMap.set(column, {
        ratio: columnRatio,
        offset: columnOffset
      });
      columnOffset += columnRatio - 1;
    });
  }

  // Rows
  var rowMap = d3.map();
  var uniformY = scaleY.uniform;
  var uniformZ = scaleZ.uniform;
  var independent = scaleZ.independent;
  if (!uniformY) {
    var rowOffset = 0;
    var firstRowOffset = 0;
    var rowValues = rows.map(function (row) {
      return d3.sum(data, function (d) {
        return d.row === row ? d.value : 0;
      });
    });
    var rowAverage = d3.mean(rowValues);
    rows.forEach(function (row, index) {
      var rowRatio = rowValues[index] / rowAverage;
      var rowData = data.filter(function (d) {
        return d.row === row;
      })
      var groupValues = groups.map(function (group) {
        return d3.sum(rowData, function (d) {
          return String(d.series) === group ? d.value : 0;
        });
      });
      var groupAverage = d3.mean(groupValues);
      groups.forEach(function (group, idx) {
        var groupRatio = rowRatio * (uniformZ ? 1 : groupValues[idx] / groupAverage);
        rowMap.set(row + '.' + group, {
          ratio: groupRatio,
          offset: rowOffset
        });
        rowOffset += groupRatio - 1;
      });
      if (index === 0) {
        firstRowOffset = rowOffset;
      }
      if (!independent) {
        columns.forEach(function (column) {
          var groupOffset = firstRowOffset - rowOffset;
          var columnData = rowData.filter(function (d) {
            return d.column === column;
          });
          var cellValues = groups.map(function (group) {
            return d3.sum(columnData, function (d) {
              return String(d.series) === group ? d.value : 0;
            });
          });
          var cellAverage = d3.mean(cellValues);
          groups.forEach(function (group, idx) {
            var cellRatio = rowRatio * (uniformZ ? 1 : cellValues[idx] / cellAverage);
            rowMap.set(row + '.' + column + '.' + group, {
              ratio: cellRatio,
              offset: groupOffset
            });
            groupOffset += cellRatio - 1;
          });
        });
      }
    });
  }

  // Colors
  var coloring = options.coloring;
  var colors = d3.scaleOrdinal()
                 .range(colorScheme);
  if (coloring === 'row') {
    colors.domain(rows);
  } else if (coloring === 'column') {
    colors.domain(columns);
  } else if (coloring === 'series') {
    colors.domain(groups);
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Mosaics
    var bandwidthX = x.bandwidth();
    var bandwidthY = y.bandwidth() / groups.length;
    var paddingMidstY = bandwidthY * scaleZ.paddingMidst;
    g.selectAll('.mosaic')
     .data(data)
     .enter()
     .append('g')
     .attr('class', 'mosaic')
     .attr('transform', function (d) {
       var index = groups.indexOf(d.series);
       var modifier = (independent ? '': '.' + d.column) + '.' + d.series;
       var offsetX = uniformX ? 0 : columnMap.get(d.column).offset;
       var offsetY = uniformY ? 0 : rowMap.get(d.row + modifier).offset;
       d.x = d.x || x(d.column) + bandwidthX * offsetX;
       d.y = d.y || y(d.row) + bandwidthY * offsetY;
       if (index !== -1) {
         d.y += (bandwidthY + paddingMidstY) * index;
       }
       return d3.translate(d.x, d.y);
     })
     .append('rect')
     .attr('x', 0)
     .attr('y', 0)
     .attr('width', function (d) {
       var ratio = uniformX ? 1 : columnMap.get(d.column).ratio;
       d.width = d.width || bandwidthX * ratio;
       return d.width;
     })
     .attr('height', function (d) {
       var modifier = (independent ? '': '.' + d.column) + '.' + d.series;
       var ratio = uniformY ? 1 : rowMap.get(d.row + modifier).ratio;
       d.height = (d.height || bandwidthY * ratio) - paddingMidstY;
       return d.height;
     })
     .attr('stroke', stroke)
     .attr('fill', function (d) {
       d.color = d.color || colors(d[coloring]);
       return d.color;
     });

    // Labels
    var labels = options.labels;
    if (labels.show) {
      var labelMinWidth = labels.minWidth;
      var labelMinHeight = labels.minHeight;
      g.selectAll('.mosaic')
       .append('text')
       .attr('x', function (d) {
         return d.width / 2;
       })
       .attr('y', function (d) {
         return d.height / 2 + lineHeight / 4;
       })
       .attr('text-anchor', 'middle')
       .attr('stroke', labels.stroke)
       .attr('fill', labels.fill)
       .attr('font-size', labels.fontSize)
       .attr('display', function (d) {
         return d.width < labelMinWidth || d.height < labelMinHeight ? 'none' : 'block';
       })
       .text(labels.text);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.mosaic');
    d3.setTooltip(chart, tooltip);

  }

};

/*!
 * Terrestrial Globe
 * References: https://bl.ocks.org/mbostock/4282586
 *             https://bl.ocks.org/mbostock/3757125
 *             https://bl.ocks.org/patricksurry/5721459
 *             https://bl.ocks.org/KoGor/5994804
 */

// Register a chart type
d3.components.terrestrialGlobe = {
  type: 'terrestrial globe',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'id',
        type: 'string',
        mappings: [
          'country',
          'nation'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  levels: 5,
  projection: 'geoOrthographic',
  coloring: 'ordinal',
  colorScale: 'scaleOrdinal',
  sphere: {
    show: true,
    stroke: 'none',
    fill: '#1f77b4'
  },
  graticules: {
    show: false,
    step: [10, 10],
    precision: 1,
    stroke: '#ccc'
  },
  regions: {
    show: true,
    stroke: '#666',
    fill: '#fff'
  },
  tooltip: {
    html: function (d) {
      return d.data.id + ': ' + d.data.value
    }
  },
  rotation: {
    enable: true,
    autoplay: false,
    sensitivity: 0.25,
    velocity: [0.01, 0, 0]
  },
  colorScheme: d3.schemeCategory20c
};

// Terrestrial globe
d3.terrestrialGlobe = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('terrestrialGlobe', data);
  options = d3.parseOptions('terrestrialGlobe', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var id = options.id;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var fill = options.fill;
  var strokeWidth = options.strokeWidth;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Create geo projection
  var map = options.map;
  var center = map.center || [0, 0];
  var radius = Math.min(width, height) / 2;
  var projection = d3[options.projection]()
                     .scale(map.scale * radius)
                     .translate(map.translate || [0, 0])
                     .rotate(map.rotate || [-center[0], -center[1]])
                     .clipAngle(90);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  // Parse geo data
  var geo = d3.parseGeoData(map, { data: data, neighbors: true });
  var features = geo.features;
  var neighbors = geo.neighbors;

  // Colors
  var coloring = options.coloring;
  var colorScale = options.colorScale;
  var colorScheme = options.colorScheme;
  var colors = d3.scaleOrdinal(colorScheme);
  if (colorScale === 'scaleSequential') {
    colors = d3.scaleSequential(colorScheme);
  } else if (colorScale === 'scaleThreshold') {
    var thresholds = options.thresholds || [];
    if (!thresholds.length) {
      var levels = options.levels;
      var step = (max - min) / levels;
      thresholds = d3.range(levels)
                     .map(function (i) { return step * i + min; });
    }
    colors = d3.scaleThreshold()
               .domain(thresholds)
               .range(colorScheme);
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Sphere
    var sphere = options.sphere;
    if (sphere.show) {
      g.append('g')
       .attr('class', 'layer')
       .append('path')
       .datum({type: 'Sphere'})
       .attr('class', 'sphere')
       .attr('d', path)
       .attr('stroke', sphere.stroke)
       .attr('stroke-width', sphere.strokeWidth)
       .attr('fill', sphere.fill);
    }

    // Graticules
    var graticules = options.graticules;
    if (graticules.show) {
      var graticule = d3.geoGraticule()
                        .step(graticules.step)
                        .precision(graticules.precision);
      g.append('g')
       .attr('class', 'layer')
       .append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke)
       .attr('fill', 'none');
    }

    // Regions
    var regions = options.regions;
    if (regions.show) {
      var fill = regions.fill;
      g.append('g')
       .attr('class', 'layer')
       .selectAll('.region')
       .data(features)
       .enter()
       .append('path')
       .attr('class', 'region')
       .attr('d', path)
       .attr('stroke', regions.stroke)
       .attr('fill', function (d, i) {
         if (d.color) {
           return d.color;
         }
         if (fill === 'none') {
           return fill;
         }
         if (coloring === 'topological' && neighbors.length) {
           d.value = (d3.max(neighbors[i], function (n) {
             return features[n].value;
           }) | 0) + 1;
         } else {
           d.value = d.data.value;
         }
         if (d.value === undefined || d.value === null) {
           return fill;
         }
         if (colorScale === 'scaleSequential') {
           d.value = (d.value - min) / max;
         }
         return colors(d.value);
       })
       .attr('opacity', regions.opacity);
    }

     // Rotation
     var rotation = options.rotation;
     if (rotation.enable) {
       if (rotation.autoplay) {
         var velocity = rotation.velocity;
         d3.timer(function (elapsed) {
           var angles = velocity.map(function (v) {
             return v * elapsed;
           });
           projection.rotate(angles);
           g.selectAll('.graticule')
            .attr('d', path);
           g.selectAll('.region')
            .attr('d', path);
         });
       } else {
         var sensitivity = rotation.sensitivity;
         var drag = d3.drag()
                      .subject(function () {
                        var r = projection.rotate();
                        return {
                          x: r[0] / sensitivity,
                          y: -r[1] / sensitivity
                        };
                      })
                      .on('drag', function () {
                        var angles = [
                          d3.event.x * sensitivity,
                          -d3.event.y * sensitivity,
                          projection.rotate()[2]
                        ];
                        projection.rotate(angles);
                        g.selectAll('.graticule')
                         .attr('d', path);
                        g.selectAll('.region')
                         .attr('d', path);
                      });
         g.select('.sphere')
          .call(drag);
       }
     }

     // Tooltip
     var tooltip = options.tooltip;
     tooltip.target = g.selectAll('.region');
     d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Tree Diagram
 * References: https://bl.ocks.org/mbostock/4339184
 */

// Register a chart type
d3.components.treeDiagram = {
  type: 'tree diagram',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'label',
        type: 'string',
        mappings: [
          'name'
        ]
      },
      {
        key: 'parent',
        type: 'string',
        mappings: [
          'category'
        ]
      },
      {
        key: 'value',
        type: 'number',
        optional: true,
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'image',
        type: 'string',
        optional: true,
        mappings: [
          'icon',
          'img',
          'logo',
          'photo',
          'picture'
        ]
      }
    ]
  },
  hierarchy: {
    root: true,
    collapsed: false,
    successive: false,
    separation: function (a, b) {
      return a.parent == b.parent ? 1 : 2;
    }
  },
  curves: {
    stroke: 'currentColor',
    fill: 'none',
    arrow: {
      show: false,
      size: '1.5%',
      stroke: 'currentColor',
      strokeWidth: 0,
      fill: 'currentColor'
    }
  },
  vertices: {
    show: true,
    radius: '0.5%',
    width: '5%',
    height: '2%',
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: '#1f77b4',
    cursor: 'pointer'
  },
  labels: {
    show: true,
    dx: '1.5%',
    dy: '0.5%',
    stroke: 'none',
    fill: 'currentColor',
    fontSize: '0.85em',
    maxWidth: '5.1em'
  },
  images: {
    show: false,
    maxWidth: '6%',
    maxHeight: '4%'
  },
  tooltip: {
    html: function (d) {
      return d.data.parent + ' &rarr; ' + d.data.label;
    }
  },
  margin: {
    top: '2em',
    right: '6em',
    bottom: '2em',
    left: '6em'
  }
};

// Tree diagram
d3.treeDiagram = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('treeDiagram', data);
  options = d3.parseOptions('treeDiagram', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Layout
  var hierarchy = options.hierarchy;
  var stratify = d3.stratify()
                   .id(function (d) {
                     return d.label;
                   })
                   .parentId(function (d) {
                     return d.parent;
                   });
  var tree = d3.tree()
               .size([innerHeight, innerWidth])
               .separation(hierarchy.separation);
  var path = d3.linkHorizontal()
               .x(function (d) {
                 return d.y;
               })
               .y(function (d) {
                 return d.x;
               });

  // Preprocess data
  if (hierarchy.collapsed) {
    var parent = '';
    data.some(function (d) {
      if (!d.parent) {
        parent = d.label;
        return true;
      }
      return false;
    });
    data.forEach(function (d) {
      var collapsed = d.parent && d.parent !== parent;
      d.collapsed = !collapsed;
      d.display = collapsed ? 'none' : 'block';
    });
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Links
    dispatch.on('init.links', function (root) {
      var curves = options.curves;
      var links = g.selectAll('.link')
                   .data(tree(root).links());
      links.exit()
           .remove();
      links.enter()
           .append('path')
           .attr('class', 'link')
           .attr('d', path)
           .merge(links)
           .attr('stroke', curves.stroke)
           .attr('stroke-width', curves.strokeWidth)
           .attr('fill', curves.fill)
           .attr('display', function (d) {
             return d.target.data.display;
           });
      if (!hierarchy.root) {
        g.selectAll('.link')
         .filter(function (d) {
           return !d.source.parent;
         })
         .attr('display', 'none');
      }
      d3.setArrows(chart, {
        arrow: curves.arrow,
        path: g.selectAll('.link')
      });
    });

    // Nodes
    dispatch.on('init.nodes', function (root) {
      var successive = hierarchy.successive;
      var nodes = g.selectAll('.node')
                   .data(root.descendants());
      nodes.exit()
           .remove();
      nodes.enter()
           .append('g')
           .attr('class', function (d) {
             return 'node' + (d.parent ? '' : ' node-root') +
               (d.children ? ' node-branch' : ' node-leaf');
           })
           .merge(nodes)
           .attr('transform', function (d) {
             return d3.translate(d.y, d.x);
           })
           .attr('display', function (d) {
             return d.data.display;
           });
      g.selectAll('.node-branch')
       .on('click', function (d) {
         var depth = d.depth + 1;
         var label = d.data.label;
         var collapsed = !d.data.collapsed;
         var descendants = d.descendants();
         var labels = descendants.map(function (descendant) {
                                   return descendant.data.label;
                                 });
         data.forEach(function (d) {
           var index = labels.indexOf(d.label);
           if (index !== -1) {
             if (collapsed || !successive) {
               d.collapsed = collapsed;
               d.display = collapsed && index ? 'none' : 'block';
             } else {
               var descendant = descendants[index];
               if (descendant.depth <= depth) {
                 d.collapsed = descendant.children && index;
                 d.display = 'block';
               }
             }
           }
         });
         dispatch.call('init', this, stratify(data));
         dispatch.call('update', this, g.selectAll('.node'));
       });
    });

    // Vertices
    dispatch.on('update.vertices', function (node) {
      var vertices = options.vertices;
      if (vertices.show) {
        var vertexRadius = vertices.radius;
        var vertex = node.select('.vertex');
        if (vertex.empty()) {
          vertex = node.append('circle')
                       .attr('class', 'vertex')
                       .attr('cx', 0)
                       .attr('cy', 0);
        }
        vertex.attr('r', function (d) {
                return d.data.radius || vertexRadius;
              })
              .attr('stroke', vertices.stroke)
              .attr('stroke-width', vertices.strokeWidth)
              .attr('fill', function (d) {
                return d.data.collapsed ? vertices.fill : '#fff';
              });
        node.filter('.node-branch')
            .attr('cursor', vertices.cursor);
        if (!hierarchy.root) {
          node.filter('.node-root')
              .attr('display', 'none');
        }
      }
    });

    // Labels
    dispatch.on('update.labels', function (node) {
      var labels = options.labels;
      if (labels.show) {
        var dx = labels.dx;
        var dy = labels.dy + lineHeight / 12;
        var textAnchor = labels.textAnchor;
        var maxWidth = labels.maxWidth;
        var label = node.select('.label');
        if (label.empty()) {
          label = node.append('text')
                      .attr('class', 'label');
        }
        label.text(function (d) {
               return d.data.label;
             })
             .attr('dx', function (d) {
               return d.data.dx ||
                 (d.children && !d.data.collapsed ? (d.parent ? 0 : -dx) : dx);
             })
             .attr('dy', function (d) {
               return d.data.dy ||
                 (d.parent && d.children && !d.data.collapsed ? 4 : 1) * dy;
             })
             .attr('text-anchor', function (d) {
               return d.data.textAnchor || textAnchor ||
                 d.children && !d.data.collapsed ?
                 (d.parent ? 'middle' : 'end') : 'start';
             })
             .attr('stroke', labels.stroke)
             .attr('fill', labels.fill)
             .attr('font-size', labels.fontSize)
             .attr('lengthAdjust', 'spacingAndGlyphs')
             .attr('textLength', function (d) {
               var textLength = d3.select(this).node().getComputedTextLength();
               return textLength > maxWidth ? maxWidth : null;
             });
      }
    });

    // Images
    dispatch.on('update.images', function (node) {
      var labels = options.labels;
      var images = options.images;
      var imgWidth = images.maxWidth;
      var imgHeight = images.maxHeight;
      var vertices = options.vertices;
      var vertexWidth = vertices.radius + vertices.strokeWidth;
      if (images.show) {
        var icon = node.select('.icon');
        if (icon.empty()) {
          icon = node.append('image')
                     .attr('class', 'icon');
        }
        icon.attr('href', function (d) {
              d.data.width = imgHeight * (d.data.width / d.data.height) || imgWidth;
              d.data.height = Math.min(d.data.height || Infinity, imgHeight);
              return d.data.image;
            })
            .attr('width', function (d) {
              return d.data.width;
            })
            .attr('height', function (d) {
              return d.data.height;
            })
            .attr('x', function (d) {
              var x = -d.data.width / 2;
              return labels.show ? (2 * x + vertexWidth) : x;
            })
            .attr('y', function (d) {
              var y = -d.data.height / 2;
              return y;
            });
      }
    });

    // Tooltip
    dispatch.on('update.tooltip', function (node) {
      var tooltip = options.tooltip;
      tooltip.target = node;
      d3.setTooltip(chart, tooltip);
    });

    dispatch.call('init', this, stratify(data));
    dispatch.call('update', this, g.selectAll('.node'));

  }
};

/*!
 * Timeline Diagram
 * References: https://bl.ocks.org/bunkat/2338034
 */

// Register a chart type
d3.components.timelineDiagram = {
  type: 'timeline diagram',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'date',
        type: 'date',
        mappings: [
          'time',
          'year'
        ]
      },
      {
        key: 'text',
        type: 'string',
        mappings: [
          'content',
          'info',
          'name'
        ]
      },
      {
        key: 'image',
        type: 'string',
        mappings: [
          'icon',
          'img',
          'logo',
          'photo',
          'picture'
        ]
      }
    ]
  },
  sort: 'ascending(date)',
  scale: 'scaleTime',
  axis: {
    show: true,
    label: true,
    nice: false,
    format: '%Y',
    stroke: 'currentColor',
    strokeWidth: 1,
    fill: 'currentColor',
    fontSize: '0.5em',
    domain: {
      show: true,
      stroke: 'currentColor',
      strokeWidth: 1
    },
    ticks: {
      number: 8,
      sizeInner: 0,
      sizeOuter: 0,
      padding: 4,
      format: ''
    }
  },
  items: {
    stroke: 'currentColor',
    strokeWidth: 1,
    fill: 'currentColor',
    fontSize: '0.65em'
  },
  connectors: {
    dx: 0,
    dy: '3.5%',
    stroke: 'currentColor',
    strokeWidth: 1
  },
  dots: {
    radius: '0.5%',
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: '#fff'
  },
  images: {
    maxWidth: '6%',
    maxHeight: '6%'
  },
  tooltip: {
    html: function (d) {
      return d3.timeFormat('%Y-%m-%d')(d.date);
    }
  }
};

// Timeline diagram
d3.timelineDiagram = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('timelineDiagram', data);
  options = d3.parseOptions('timelineDiagram', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Domain
  var domain = options.domain;
  if (Array.isArray(domain) && domain.length) {
    domain = domain.map(function (d) {
      return new Date(d);
    });
    data = data.filter(function (d) {
      return d.date >= domain[0] && d.date < domain[1];
    });
  } else {
    domain = d3.extent(data, function (d) {
      return d.date;
    });
  }
  if (d3.type(options.sort) === 'function') {
    data.sort(options.sort);
  }
  if (options.scale === 'scalePoint') {
    domain = data.map(function (d) {
      return d.date;
    });
  }

  // Scale
  var axis = options.axis;
  var scale = d3[options.scale]()
                .domain(domain)
                .rangeRound([0, innerWidth]);
  if (axis.nice) {
    scale.nice();
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Axis
    var origin = options.origin || [0, innerHeight / 2];
    var startX = origin[0];
    var startY = origin[1];
    d3.setAxes(g, {
      width: innerWidth,
      height: startY,
      scaleX: scale,
      axisX: axis
    });
    if (axis.label) {
      var format = d3.timeFormat(axis.format);
      g.append('text')
       .attr('class', 'label')
       .attr('x', startX - fontSize / 2)
       .attr('y', startY + lineHeight / 8)
       .attr('font-size', axis.fontSize)
       .attr('fill', axis.fill)
       .attr('text-anchor', 'end')
       .text(format(domain[0]));
      g.append('text')
       .attr('class', 'label')
       .attr('x', innerWidth + fontSize / 2)
       .attr('y', startY + lineHeight / 8)
       .attr('font-size', axis.fontSize)
       .attr('fill', axis.fill)
       .attr('text-anchor', 'start')
       .text(format(domain[1]));
    }

    // Items
    var items = options.items;
    var images = options.images;
    var imgWidth = images.maxWidth;
    var imgHeight = images.maxHeight;
    var connectors = options.connectors;
    var dx = connectors.dx;
    var dy = connectors.dy;
    var xmax = [0, 0];
    var ymax = [dy, dy];
    g.selectAll('.item')
     .data(data)
     .enter()
     .append('g')
     .attr('class', 'item')
     .attr('transform', function (d, i) {
       var idx = i % 2;
       var x = scale(d.date);
       var y = ymax[idx];
       d.width = imgHeight * (d.width / d.height) || imgWidth;
       d.height = Math.min(d.height || Infinity, imgHeight);
       if (i > 1 && xmax[idx] + d.width > x) {
         y += 2 * dy + d.height;
       } else {
         y = dy;
       }
       xmax[idx] = x;
       ymax[idx] = y;
       d.dx = d.hasOwnProperty('dx') ? Number(d.dx) : dx * (y > dy ? y / dy : 1);
       d.dy = d.hasOwnProperty('dy') ? Number(d.dy) : (idx ? y : -y);
       return d3.translate(x, startY);
     });

    // Connectors
    g.selectAll('.item')
     .append('line')
     .attr('class', 'connector')
     .attr('x1', 0)
     .attr('y1', 0)
     .attr('x2', function (d) {
       return d.dx;
     })
     .attr('y2', function (d) {
       return d.dy;
     })
     .attr('stroke', connectors.stroke)
     .attr('stroke-width', connectors.strokeWidth);

    // Images
    g.selectAll('.item')
     .append('image')
     .attr('href', function (d) {
       return d.image;
     })
     .attr('x', function (d) {
       return d.dx - d.width / 2;
     })
     .attr('y', function (d) {
       return d.dy + (d.dy > 0 ? lineHeight : -d.height - lineHeight);
     })
     .attr('width', function (d) {
       return d.width;
     })
     .attr('height', function (d) {
       return d.height;
     });

    // Texts
    g.selectAll('.item')
     .append('text')
     .attr('x', function (d) {
       return d.dx;
     })
     .attr('y', function (d) {
       return d.dy + lineHeight / (d.dy > 0 ? 2 : -4);
     })
     .attr('font-size', items.fontSize)
     .attr('fill', items.fill)
     .attr('text-anchor', 'middle')
     .text(function (d) {
       return d.text;
     });

    // dots
    var dots = options.dots;
    var multicolor = dots.multicolor;
    g.selectAll('.item')
     .append('circle')
     .attr('class', 'knot')
     .attr('cx', 0)
     .attr('cy', 0)
     .attr('r', dots.radius)
     .attr('stroke', function (d, i) {
       return (multicolor ? d.color || colorScheme[i] : null) || dots.stroke;
     })
     .attr('stroke-width', dots.strokeWidth)
     .attr('fill', function (d, i) {
       return (multicolor ? d.color || colorScheme[i] : null) || dots.fill;
     });

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.knot');
    d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Liquid Fill Gauge
 * References: http://bl.ocks.org/brattonc/5e5ce9beee483220e2f6
 */

// Register a chart type
d3.components.liquidFillGauge = {
  type: 'liquid-fill gauge',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'name',
        type: 'string',
        optional: true,
        mappings: [
          'category',
          'label'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'percentage',
          'ratio'
        ]
      }
    ]
  },
  sort: null,
  domain: [0, 1],
  frame: {
    show: true,
    shape: 'circle',
    radius: '60%',
    round: 0,
    stroke: '#1f77b4',
    strokeWidth: '1%',
    fill: 'none',
    fillGap: '1.5%'
  },
  wave: {
    peaks: 2,
    amplitude: 0.1,
    phase: 90,
    period: 4,
    asynchrony: 1,
    opacity: 0.8,
    animation: {
      show: true,
      direction: 'ltr',
      ease: 'easeLinear'
    }
  },
  label: {
    show: true,
    format: '.0%',
    color: '#1f77b4',
    insideColor: '#fff',
    fontSize: '8%',
    fontWeight: 'bold'
  },
  tooltip: {
    html: function (d) {
      var value = d3.format('.0%')(d.value);
      return (d.name ? d.name + ': ' : '') + value;
    }
  }
};

// Liquid Fill Gauge
d3.liquidFillGauge = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('liquidFillGauge', data);
  options = d3.parseOptions('liquidFillGauge', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var margin = options.margin;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Preprocess data
  var domain = options.domain;
  if (d3.type(options.sort) === 'function') {
    data.sort(options.sort);
  }
  if (Array.isArray(domain)) {
    var min = domain[0];
    var max = domain[1];
    data.forEach(function (d) {
      d.value = Math.max(Math.min(d.value, max), min);
    });
  }

  // Scales
  var frame = options.frame;
  var wave = options.wave;
  var frameShape = frame.shape;
  var frameRound = frame.round;
  var frameStrokeWidth = frame.strokeWidth;
  var frameRadius = Math.min(frame.radius, height / 2) - frameStrokeWidth;
  var liquidRadius = frameRadius - frame.fillGap;
  var amplitude = liquidRadius * wave.amplitude;
  var peaks = Math.round(wave.peaks);
  var asynchrony = wave.asynchrony;
  var radii = data.map(function (d, i) {
    return (i + 1) * amplitude * peaks * asynchrony + liquidRadius;
  });
  var scaleX = d3.scaleLinear()
                 .domain([0, 1])
                 .range([-liquidRadius, liquidRadius]);
  var scaleY = d3.scaleLinear()
                 .domain([-1, 1])
                 .range([amplitude, -amplitude]);
  var scales = data.map(function (d, i) {
    var radius = radii[i];
    return d3.scaleLinear()
             .domain([0, 1])
             .range([-radius, radius]);
  });
  var areas = data.map(function (d, i) {
    return d3.area()
             .x(function (point) {
               return 4 * scales[i](point.x);
             })
             .y0(liquidRadius)
             .y1(function (point) {
               return scaleY(point.y) - scaleX(d.value);
             });
  });

  // Points
  var phase = Math.PI * wave.phase / 180;
  var omega = 8 * Math.PI * peaks;
  var dx = 1 / (240 * peaks);
  var points = d3.range(0, 1 + dx / 2, dx);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Defs
    var defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.insert('defs', ':first-child');
    }

    // Clip paths
    var clips = defs.selectAll('.wave')
                    .data(data);
    clips.exit()
         .remove();
    clips.enter()
         .append('clipPath')
         .attr('class', 'wave')
         .append('path');

    // Paths
    var clipId = options.id + '-clip-path';
    var clip = defs.selectAll('.wave')
                   .attr('id', function (d, i) {
                     return clipId + '-' + i;
                   });
    var path = clip.select('path');
    if (path.empty()) {
      path = clip.append('path');
    }
    path.attr('d', function (d, i) {
      return areas[i](points.map(function (point) {
        return {
          x: point,
          y: Math.sin(omega * point + phase * (i + 1))
        };
      }));
    });

    // Shape generator
    var generator = function (selection, radius) {
      selection.selectAll('.shape')
               .attr('display', 'none');
      if (frameShape === 'circle') {
        var circle = selection.select('circle');
        if (circle.empty()) {
          circle = selection.append('circle')
                            .attr('class', 'shape')
                            .attr('cx', 0)
                            .attr('cy', 0);
        }
        circle.attr('r', radius)
              .attr('display', 'block');
      } else if (frameShape === 'rect') {
        var roundSize = radius * frameRound;
        var rect = selection.select('rect');
        if (rect.empty()) {
          rect = selection.append('rect')
                          .attr('class', 'shape');
        }
        rect.attr('width', 2 * radius)
            .attr('height', 2 * radius)
            .attr('x', -radius)
            .attr('y', -radius)
            .attr('rx', roundSize)
            .attr('ry', roundSize)
            .attr('display', 'block');
      }
    };

    // Frame
    if (frame.show) {
      var box = g.select('.frame');
      if (box.empty()) {
        box = g.append('g')
               .attr('class', 'frame');
      }
      box.attr('stroke', frame.stroke)
         .attr('stroke-width', frameStrokeWidth)
         .attr('fill', frame.fill)
         .call(generator, frameRadius);
    }

    // Binding data
    var liquids = g.selectAll('.liquid')
                   .data(data);
    liquids.exit()
           .remove();
    liquids.enter()
           .append('g')
           .attr('class', 'liquid')
           .call(generator, liquidRadius);

    // Liquids
    var liquid = g.selectAll('.liquid');
    liquid.call(generator, liquidRadius)
          .attr('fill', function (d, i) {
            return d.color || colorScheme[i];
          })
          .attr('clip-path', function (d, i) {
            return 'url(#' + clipId + '-' + i + ')';
          })
          .selectAll('.shape')
          .attr('stroke-width', 0)
          .attr('opacity', wave.opacity);

    // Label
    var label = options.label;
    if (label.show) {
      var text = g.select('.label');
      var value = data.length ? data[0].value : 0;
      if (text.empty()) {
        g.append('text')
         .attr('class', 'label');
        g.append('text')
         .attr('class', 'label label-clip');
      }
      g.selectAll('.label')
       .attr('stroke', 'none')
       .attr('text-anchor', 'middle')
       .attr('fill', label.color)
       .attr('font-size', label.fontSize)
       .attr('font-weight', label.fontWeight)
       .attr('dy', function () {
         var position = label.position || value;
         return liquidRadius * (1 - 2 * position) + lineHeight / 4;
       })
       .text(function () {
         return d3.format(label.format)(value);
       });
      g.select('.label-clip')
       .attr('fill', label.insideColor)
       .attr('clip-path', function () {
         return 'url(#' + clipId + '-0)';
       });
    }

    // Animation
    var animation = wave.animation;
    path.interrupt()
        .transition();
    if (animation.show) {
      var direction = animation.direction;
      var period = wave.period * 1000;
      var ease = animation.ease;
      var initial = d3.translate(0, 0);
      var final = function (d, i) {
        return d3.translate(2 * radii[i], 0);
      };
      var animate = function (selection) {
        selection.attr('transform', direction === 'ltr' ? initial : final)
                 .transition()
                 .duration(period)
                 .ease(d3[ease])
                 .attr('transform', direction === 'ltr' ? final : initial)
                 .on('end', function () {
                   animate(selection);
                 });
      };
      path.call(animate);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.liquid');
    d3.setTooltip(chart, tooltip);
  }
};
