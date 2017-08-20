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
