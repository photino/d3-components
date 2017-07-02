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
    disabledTextColor: '#ccc'
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
    if (schema.type === 'object') {
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
  var ticks = options.ticks;
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
  var axisX = options.axisX;
  var axisY = options.axisY;
  var orientX = axisX.orient;
  var orientY = axisY.orient;
  var domainX = axisX.domain;
  var domainY = axisY.domain;
  var gx = d3.setAxis(options.scaleX, axisX);
  var gy = d3.setAxis(options.scaleY, axisY);
  g.selectAll('.axis')
   .remove();
  if (options.framed) {
    if (axisX.show) {
      g.append('g')
       .attr('class', 'axis axis-x')
       .attr('transform', d3.translate(0, height))
       .call(gx);
      g.append('g')
       .attr('class', 'axis axis-x')
       .call(gx.tickFormat(''));
    }
    if (axisY.show) {
      g.append('g')
       .attr('class', 'axis axis-y')
       .call(gy);
      g.append('g')
       .attr('class', 'axis axis-y')
       .attr('transform', d3.translate(width, 0))
       .call(gy.tickFormat(''));
    }
  } else {
    if (axisX.show) {
      var ax = g.append('g')
                .attr('class', 'axis axis-x')
                .call(gx);
      if (orientX === 'bottom') {
        ax.attr('transform', d3.translate(0, height));
      }
    }
    if (axisY.show) {
      var ay = g.append('g')
                .attr('class', 'axis axis-y')
                .call(gy);
      if (orientY === 'right') {
        ay.attr('transform', d3.translate(width, 0));
      }
    }
  }
  if (axisX.show) {
    g.selectAll('.axis-x')
     .attr('font-size', axisX.fontSize)
     .selectAll('text')
     .attr('text-anchor', axisX.textAnchor)
     .attr('transform', axisX.transform)
     .attr('fill', axisX.fill);
    g.selectAll('.axis-x')
     .selectAll('line')
     .attr('stroke', axisX.stroke)
     .attr('stroke-width', axisX.strokeWidth);
    g.selectAll('.axis-x')
     .select('.domain')
     .attr('stroke', domainX.stroke)
     .attr('stroke-width', domainX.strokeWidth);
  }
  if (axisY.show) {
    g.selectAll('.axis-y')
     .attr('font-size', axisY.fontSize)
     .selectAll('text')
     .attr('text-anchor', axisY.textAnchor)
     .attr('transform', axisY.transform)
     .attr('fill', axisY.fill);
    g.selectAll('.axis-y')
     .selectAll('line')
     .attr('stroke', axisY.stroke)
     .attr('stroke-width', axisY.strokeWidth);
    g.selectAll('.axis-y')
     .select('.domain')
     .attr('stroke', domainX.stroke)
     .attr('stroke-width', domainY.strokeWidth);
  }

  // Grid lines
  var gridX = options.gridX;
  var gridY = options.gridY;
  g.selectAll('.grid')
   .remove();
  if (gridX.show) {
    g.insert('g', ':first-child')
     .attr('class', 'grid grid-x')
     .attr('stroke-dasharray', gridX.strokeDash.join())
     .call(gy.tickSize(-width, 0).tickFormat(''));
    g.select('.grid-x')
     .select('.domain')
     .attr('stroke-width', 0);
    g.select('.grid-x')
     .selectAll('.tick')
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
    g.insert('g', ':first-child')
     .attr('class', 'grid grid-y')
     .attr('stroke-dasharray', gridY.strokeDash.join())
     .attr('transform', d3.translate(0, height))
     .call(gx.tickSize(-height, 0).tickFormat(''));
    g.select('.grid-y')
     .select('.domain')
     .attr('stroke-width', 0);
    g.select('.grid-y')
     .selectAll('.tick')
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
  g.selectAll('.label')
   .remove();
  if (labelX.show) {
    var tx = 0;
    if (anchorX === 'middle') {
      tx = width / 2;
    } else if (anchorX === 'end') {
      tx = width;
    }
    g.append('text')
     .attr('class', 'label label-x')
     .attr('x', tx)
     .attr('y', height)
     .attr('dy', labelX.dy)
     .attr('transform', labelX.transform)
     .attr('fill', labelX.fill)
     .attr('text-anchor', anchorX)
     .text(labelX.text);
  }
  if (labelY.show) {
    var ty = height;
    if (anchorY === 'middle') {
      ty = height / 2;
    } else if (anchorY === 'end') {
      ty = 0;
    }
    g.append('text')
     .attr('class', 'label label-y')
     .attr('x', -ty)
     .attr('y', 0)
     .attr('dy', labelY.dy)
     .attr('transform', labelY.transform)
     .attr('fill', labelY.fill)
     .attr('text-anchor', anchorY)
     .text(labelY.text);
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

// Set the legend
d3.setLegend = function (container, options) {
  container.select('.legend')
           .remove();
  if (options.show) {
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
    var item = container.append('g')
                        .attr('class', 'legend')
                        .attr('transform', options.translation)
                        .attr('cursor', 'pointer')
                        .selectAll('.legend-item')
                        .data(options.data)
                        .enter()
                        .append('g')
                        .attr('class', function (d) {
                          if (!d.hasOwnProperty('disabled')) {
                            d.disabled = d.data && d.data.disabled || false;
                          }
                          return 'legend-item' + (d.disabled ? ' disabled' : '');
                        })
                        .attr('transform', options.transform);
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
          });
    }
    item.select(symbolShape)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : d.color;
        });

    item.append('text')
        .text(options.text)
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
        .attr('dx', options.dx)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : textColor;
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
d3.imageTiles = function (selection, options) {
  var tileImage = options.image;
  var tileSize = tileImage.size;
  var tiles = d3.tile()
                .size(options.size)
                .scale(options.scale)
                .translate(options.translate)();
  var image = selection.selectAll('image')
                       .data(tiles.filter(function (d) {
                         return d[0] < Math.pow(2, d[2]);
                       }), function (d) {
                         return d;
                       });

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

  image.exit()
       .remove();

  image.enter()
       .append('image')
       .attr('xlink:href', tileImage.href)
       .attr('x', function (d) {
         return d[0] * tileSize;
       })
       .attr('y', function (d) {
         return d[1] * tileSize;
       })
       .attr('width', tileSize + 1)
       .attr('height', tileSize + 1);

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
    } else if (window.topojson) {
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
        if (d[key] === property) {
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
    scale: 0.25
  },
  china: {
    key: 'name',
    center: [103.3886, 35.5636],
    scale: 1.0
  }
};

/*!
 * Bar Chart
 * References: http://bl.ocks.org/d3noob/8952219
 *             https://bl.ocks.org/mbostock/3885304
 *             http://bl.ocks.org/mbostock/3943967
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

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Process data
    var colors = d3.scaleOrdinal(colorScheme);
    var color = function (d) { return colors(d.series); };
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
      var maxValue = 0;
      if (stacked) {
        maxValue = d3.max(categories, function (category) {
          return d3.sum(data.filter(function (d) {
            return d.category === category;
          }), function (d) {
            return d.value;
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
      g.select('.layout')
       .remove();

      // Rects
      var rect = g.append('g')
                  .attr('class', 'layout')
                  .selectAll('rect')
                  .data(data)
                  .enter()
                  .append('rect');
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
          .attr('fill', color);
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
      if (legend.show === null) {
        legend.show = dataset.length > 1;
      }
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
 * References: http://bl.ocks.org/dbuezas/9306799
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
      g.selectAll('.arc')
       .remove();
      g.selectAll('.arc')
       .data(slices)
       .enter()
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
            .range(options.rangeX || [0, innerWidth]);
  var y = d3.scaleLinear()
            .domain(options.domainY || [ymin - offsetY[0], ymax + offsetY[1]])
            .range(options.rangeY || [innerHeight, 0])
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
                 return z * scale + minRadius;
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
    tooltip.target = dot;
    d3.setTooltip(chart, tooltip);

  }
};

/*!
 * Radar Chart
 * References: http://bl.ocks.org/nbremer/6506614
 *             http://bl.ocks.org/nbremer/21746a9668ffdf6d8242
 *             http://bl.ocks.org/tpreusse/2bc99d74a461b8c0acb1
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
    if (legend.show === null) {
      legend.show = dataset.length > 1;
    }
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
 * References: http://bl.ocks.org/maybelinot/5552606564ef37b5de7e47ed2b7dc099
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
    tooltip.target = slice;
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
    stroke: '#ccc'
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
  stroke: '#666',
  fill: '#fff',
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
                     d3.imageTiles(svg.select('.tile'), tile);
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
                        .step(graticules.step);
      g.append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke);
    }

    // Regions
    var region = g.append('g')
                  .attr('class', 'layer')
                  .selectAll('.region')
                  .data(features)
                  .enter()
                  .append('path')
                  .attr('class', 'region')
                  .attr('d', path)
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
                  });

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
    tooltip.target = region;
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
    tooltip.target = circle;
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
