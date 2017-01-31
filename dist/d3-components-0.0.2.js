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
  lineHeight: 20,
  title: {
    show: false,
    x: '50%',
    y: '1.6em',
    height: '2em',
    wrapText: true,
    wrapWidth: '90%',
    lineHeight: '2em',
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
    style: {
      display: 'none',
      boxSizing: 'border-box',
      position: 'absolute',
      pointerEvents: 'none',
      padding: '0.2em 0.6em',
      backgroundColor: '#fff',
      border: '1px solid #999',
      borderRadius: '0.2em',
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
    symbol: {
      width: '1.294427em',
      height: '0.8em'
    },
    dx: '0.5em',
    transform: 'scale(0.85)',
    lineHeight: '1.6em',
    textColor: '#333',
    disabledTextColor: '#ccc'
  }
};

// Parse plotting data
d3.parseData = function (plot, data) {
  var component = d3.components[plot];
  var schema = component.schema || {};
  var hierarchy = schema.hierarchy;
  if (Array.isArray(data)) {
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
  }

  return d3.parseData(plot, [data])[0];
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

  // Set the tooltip
  var chart = canvas.node();
  var tooltip = d3.extend({
    id: id + '-tooltip'
  }, options.tooltip);
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
    options.map = d3.extend(d3.maps[name], map);
  }

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
        if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
          return d3[order](a[key], b[key]);
        }
        if (a.data && b.data) {
          return d3[order](a.data[key], b.data[key]);
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

// Set an axis
d3.setAxis = function (scale, options) {
  var axis = d3.axisBottom(scale);
  var orient = options.orient;
  if (orient === 'top') {
    axis = d3.axisTop(scale);
  } else if (orient === 'left') {
    axis = d3.axisLeft(scale);
  } else if (orient === 'right') {
    axis = d3.axisRight(scale);
  }
  axis.ticks(options.ticks)
      .tickSizeInner(options.tickSizeInner)
      .tickSizeOuter(options.tickSizeOuter)
      .tickPadding(options.tickPadding);
  if (options.tickFormat !== '') {
    axis.tickFormat(d3.format(options.tickFormat));
  } else {
    axis.tickFormat('');
  }
  return axis;
};

// Create a plot
d3.createPlot = function (chart, options) {
  // Create the `svg` element
  var width = options.width;
  var height = options.height;
  var svg = d3.select(chart)
              .append('svg')
              .attr('class', options.type)
              .attr('width', width);

  // Set the title
  var titleHeight = 0;
  var title = options.title;
  if (title.show) {
    var t = svg.append('text')
               .attr('class', 'title')
               .attr('x', title.x)
               .attr('y', title.y)
               .attr('font-size', title.fontSize)
               .attr('font-weight', title.fontWeight)
               .attr('text-anchor', title.textAnchor)
               .text(title.text)
               .call(d3.wrapText, title);
    var lines = Math.ceil(t.node().getComputedTextLength() / title.wrapWidth);
    titleHeight = lines * title.lineHeight;
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

  return {
    svg: svg,
    container: g
  };
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

// Set the tooltip
d3.setTooltip = function (chart, options) {
  if (options.show) {
    var tooltip = d3.select('#' + options.id);
    var lineHeight = parseInt(tooltip.style('line-height'));
    var hoverTarget = options.hoverTarget;
    var hoverEffect = options.hoverEffect;
    hoverTarget.on('mouseover', function (d) {
      var position = d3.mouse(chart);
      var left = position[0];
      var top = position[1];
      tooltip.attr('class', 'tooltip')
             .style('display', 'block')
             .html(options.html(d));
      if (isNaN(left) || isNaN(top)) {
        var offsetX = parseInt(tooltip.style('width')) / 2;
        var offsetY = parseInt(tooltip.style('height')) + lineHeight / 6;
        position = d3.getPosition(this, chart);
        left = position.left + position.width / 2 - offsetX;
        top = position.top + position.height / 2 - offsetY;
      }
      tooltip.style('left', left + 'px')
             .style('top', top + 'px');
      if (hoverEffect === 'darker') {
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
      if (hoverEffect === 'darker') {
        d3.select(this)
          .attr('fill', d.color);
      }
    });
    if (options.autoplay) {
      hoverTarget.call(d3.triggerAction, d3.extend({
        event: 'mouseover',
        carousel: true
      }, options.carousel));
    }
  }
};

// Set the legend
d3.setLegend = function (container, options) {
  if (options.show) {
    var symbol = options.symbol;
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
                        .data(options.bindingData)
                        .enter()
                        .append('g')
                        .attr('class', function (d) {
                          if (!d.hasOwnProperty('disabled')) {
                            d.disabled = d.data.disabled || false;
                          }
                          return 'legend-item' + (d.disabled ? ' disabled' : '');
                        })
                        .attr('transform', options.transform);

    item.append('rect')
        .attr('width', symbolWidth)
        .attr('height', symbolHeight)
        .attr('x', 0)
        .attr('y', function (d, i) {
          return lineHeight * (i + 1) - symbolHeight;
        })
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : d.color;
        });

    item.append('text')
        .text(options.text)
        .attr('x', symbolWidth)
        .attr('y', function (d, i) {
          return lineHeight * (i + 1);
        })
        .attr('dx', options.dx)
        .attr('fill', function (d) {
          return d.disabled ? disabledTextColor : textColor;
        });

    item.on('click', function (d) {
      var disabled = !d.disabled;
      var item = d3.select(this)
                   .classed('disabled', disabled);
      item.select('rect')
          .attr('fill', disabled ? disabledTextColor : d.color);
      item.select('text')
          .attr('fill', disabled ? disabledTextColor : textColor);
      d.disabled = disabled;
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
  var nodes = selection.nodes() || [];
  var name = options.event || options;
  var event = null;
  try {
    event = new Event(name);
  } catch (error) {
    event = document.createEvent('SVGEvents');
    event.initEvent(name, true, true);
  }
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
          nodes[index].dispatchEvent(event);
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
        nodes.forEach(function (node) {
          node.dispatchEvent(event);
        });
      }, delay);
    }
  } else {
    nodes.forEach(function (node) {
      node.dispatchEvent(event);
    });
  }
};

// Parse geo data
d3.parseGeoData = function (map, options) {
  var data = map.data;
  var key = map.key || 'id';
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
  return {
    features: features.map(function (feature, index) {
      if (!feature.hasOwnProperty(key)) {
        feature[key] = String(feature[key] || feature.properties[key] || index);
      }
      return feature;
    }),
    neighbors: neighbors
  };
};

// Built-in map data
d3.maps = {
  world: {
    center: [0, 0],
    scale: 0.25
  },
  china: {
    center: [103.3886, 35.5636],
    scale: 1.0
  }
};

/*!
 * Bar Chart
 */

// Register a chart type
d3.components.barChart = {
  type: 'bar chart',
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
          'percentage'
        ]
      }
    ]
  },
  sort: null,
  labels: {
    show: false
  },
  tooltip: {
    html: function (d, i) {
      return 'Datum ' + i;
    }
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
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

  }

};

/*!
 * Pie Chart
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
          'percentage'
        ]
      }
    ]
  },
  sort: null,
  maxRatio: 0.8,
  donutRatio: 0,
  innerRadius: 0,
  labels: {
    show: false,
    dy: '0.25em',
    fill: '#fff',
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
  var maxRatio = options.maxRatio;
  var donutRatio = options.donutRatio;
  var outerRadius = options.outerRadius || Math.min(innerWidth, innerHeight) / 2;
  var innerRadius = options.innerRadius || outerRadius * donutRatio;
  if (d3.type(innerRadius) === 'number' && d3.type(outerRadius) === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and arcs
  var pie = d3.pie()
              .sort(options.sort)
              .value(function (d) {
                return d.disabled ? 0 : d.value;
              });
  var arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
              .context(context);
  var arcs = pie(data);

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

    // Slices
    dispatch.on('init.slices', function (data) {
      g.selectAll('.arc')
       .data(data)
       .enter()
       .append('g')
       .attr('class', 'arc');
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
        slice.append('text')
             .attr('class', 'label')
             .attr('x', function (d) {
               return arc.centroid(d)[0];
             })
             .attr('y', function (d) {
               return arc.centroid(d)[1];
             })
             .attr('dy', labels.dy)
             .attr('text-anchor', 'middle')
             .attr('fill', labels.fill)
             .text(labels.text)
             .attr('opacity', function (d) {
               var angle = d.endAngle - d.startAngle;
               return angle >= labels.minAngle ? 1 : 0;
             })
             .call(d3.wrapText, labels);
      }
    });

    // Tooltip
    dispatch.on('update.tooltip', function (slice) {
      var tooltip = options.tooltip;
      tooltip.hoverTarget = slice.selectAll('path');
      tooltip.hoverEffect = 'darker';
      d3.setTooltip(chart, tooltip);
    });

    // Legend
    dispatch.on('finalize.legend', function () {
      var legend = options.legend;
      if (!legend.translation) {
        legend.translation = d3.translate(-width / 2, -height / 2);
      }
      legend.bindingData = arcs;
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
        g.selectAll('.arc')
         .remove();
        dispatch.call('init', this, pie(data));
        dispatch.call('update', this, g.selectAll('.arc'));
      };
      d3.setLegend(g, legend);
    });

    // Load components
    dispatch.call('init', this, arcs);
    dispatch.call('update', this, g.selectAll('.arc'));

  } else if (renderer === 'canvas') {
    context.translate(width / 2, height / 2);
    arcs.forEach(function (d, i) {
      context.beginPath();
      arc(d);
      context.fillStyle = colorScheme[i];
      context.fill();
      context.closePath();
    });

    if (stroke !== 'none') {
      context.beginPath();
      arcs.forEach(arc);
      context.strokeStyle = stroke;
      context.lineWidth = strokeWidth;
      context.stroke();
      context.closePath();
    }
  }

  dispatch.call('finalize', this);
};

/*!
 * Line Chart
 */

// Register a chart type
d3.components.lineChart = {
  type: 'line chart',
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
          'percentage'
        ]
      }
    ]
  },
  sort: null,
  labels: {
    show: false
  },
  tooltip: {
    html: function (d, i) {
      return 'Datum ' + i;
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
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

  }

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
    orient: 'bottom',
    ticks: 8,
    tickSizeInner: 6,
    tickSizeOuter: 0,
    tickPadding: 4,
    tickFormat: 'd'
  },
  axisY: {
    orient: 'left',
    ticks: 6,
    tickSizeInner: 6,
    tickSizeOuter: 0,
    tickPadding: 4,
    tickFormat: 'd'
  },
  gridX: {
    show: true,
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
    dy: '2.8em'
  },
  labelY: {
    show: false,
    text: 'Y',
    dy: '-3em'
  },
  dots: {
    scale: '2%',
    minRadius: 4,
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
  var xs = data.map(function (d) { return d.x; });
  var ys = data.map(function (d) { return d.y; });
  var zs = data.map(function (d) { return d.z; });
  var xmin = d3.min(xs);
  var xmax = d3.max(xs);
  var ymin = d3.min(ys);
  var ymax = d3.max(ys);
  var zmin = d3.min(zs);
  var zmax = d3.max(zs);
  var x = d3.scaleLinear()
            .domain(options.domainX || [xmin - offsetX[0], xmax + offsetX[1]])
            .range(options.rangeX || [0, innerWidth]);
  var y = d3.scaleLinear()
            .domain(options.domainY || [ymin - offsetY[0], ymax + offsetY[1]])
            .range(options.rangeY || [innerHeight, 0]);

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var transform = d3.translate(margin.left, margin.top + options.title.height);
    var svg = plot.svg;
    var g = plot.container
                .attr('transform', transform);

    // Set axes
    var axisX = options.axisX;
    var axisY = options.axisY;
    var orientX = axisX.orient;
    var orientY = axisY.orient;
    var gx = d3.setAxis(x, axisX);
    var gy = d3.setAxis(y, axisY);
    if (options.framed) {
      g.append('g')
       .attr('class', 'axis axis-x')
       .attr('transform', d3.translate(0, innerHeight))
       .call(gx);
      g.append('g')
       .attr('class', 'axis axis-y')
       .call(gy);
      g.append('g')
       .attr('class', 'axis axis-x')
       .call(gx.tickFormat(''));
      g.append('g')
       .attr('class', 'axis axis-y')
       .attr('transform', d3.translate(innerWidth, 0))
       .call(gy.tickFormat(''));
    } else {
      var ax = g.append('g')
                .attr('class', 'axis axis-x')
                .call(gx);
      var ay = g.append('g')
                .attr('class', 'axis axis-y')
                .call(gy);
      if (orientX === 'bottom') {
        ax.attr('transform', d3.translate(0, innerHeight));
      }
      if (orientY === 'right') {
        ay.attr('transform', d3.translate(innerWidth, 0));
      }
    }
    g.selectAll('.axis')
     .attr('font-size', fontSize);

    // Add grid lines
    var gridX = options.gridX;
    var gridY = options.gridY;
    if (gridX.show) {
      g.append('g')
       .attr('class', 'grid grid-x')
       .attr('stroke-dasharray', gridX.strokeDash.join())
       .call(gy.tickSize(-innerWidth, 0).tickFormat(''));
      g.select('.grid-x')
       .select('.domain')
       .attr('stroke-width', 0);
      g.select('.grid-x')
       .selectAll('.tick')
       .attr('stroke-width', function () {
         var transform = d3.select(this)
                           .attr('transform');
         var dy = +transform.split(/[\,\(\)]/)[2];
         return (dy === 0 || dy === innerHeight) ? 0 : null;
       })
       .select('line')
       .attr('stroke', gridX.stroke);
    }
    if (gridY.show) {
      g.append('g')
       .attr('class', 'grid grid-y')
       .attr('stroke-dasharray', gridY.strokeDash.join())
       .attr('transform', d3.translate(0, innerHeight))
       .call(gx.tickSize(-innerHeight, 0).tickFormat(''));
      g.select('.grid-y')
       .select('.domain')
       .attr('stroke-width', 0);
      g.select('.grid-y')
       .selectAll('.tick')
       .attr('stroke-width', function () {
         var transform = d3.select(this)
                           .attr('transform');
         var dx = +transform.split(/[\,\(\)]/)[1];
         return (dx === 0 || dx === innerWidth) ? 0 : null;
       })
       .select('line')
       .attr('stroke', gridY.stroke);
    }

    // Set labels
    var labelX = options.labelX;
    var labelY = options.labelY;
    if (labelX.show) {
      g.append('text')
       .attr('class', 'label label-x')
       .attr('text-anchor', 'end')
       .attr('x', innerWidth)
       .attr('y', innerHeight)
       .attr('dy', labelX.dy)
       .text(labelX.text);
    }
    if (labelY.show) {
      g.append('text')
       .attr('class', 'label label-y')
       .attr('text-anchor', 'end')
       .attr('y', 0)
       .attr('dy', labelY.dy)
       .attr('transform', 'rotate(-90)')
       .text(labelY.text);
    }

    // Add dots
    var colors = d3.scaleOrdinal(colorScheme);
    var dots = options.dots;
    var scale = dots.scale;
    var minRadius = dots.minRadius;
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
                 return Math.sqrt(d.z / zmax) * scale + minRadius;
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
     tooltip.hoverTarget = dot;
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
          'percentage'
        ]
      },
      {
        key: 'series',
        type: 'string',
        mappings: [
          'entry',
          'item'
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
    radius: 3,
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
    verticalAlign: 'middle'
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
  var dataset = options.series || [];
  var values = [];
  data.forEach(function (d) {
    var axis = d.axis;
    var series = d.series;
    if (axes.indexOf(axis) === -1) {
      axes.push(axis);
    }
    if (dataset.indexOf(series) === -1) {
      dataset.push(series);
    }
    values.push(d.value);
  });
  dataset = dataset.map(function (series) {
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
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

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
     var dot = s.selectAll('.dot')
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
    legend.bindingData = dataset;
    legend.onclick = function () {
      s.style('display', function (d) {
        return d.disabled ? 'none' : 'block';
       });
    };
    d3.setLegend(g, legend);

  }

  // Tooltip
  var tooltip = options.tooltip;
  tooltip.hoverTarget = dot;
  d3.setTooltip(chart, tooltip);

};

/*!
 * Sunburst Chart
 * Reference: http://bl.ocks.org/maybelinot/5552606564ef37b5de7e47ed2b7dc099
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
          'count'
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
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

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
    tooltip.hoverTarget = slice;
    d3.setTooltip(chart, tooltip);

  }

};

/*!
 * Choropleth Map
 * Reference: http://bl.ocks.org/mbostock/4180634
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
          'code',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count'
        ]
      }
    ]
  },
  projection: 'geoMercator',
  coloring: 'ordinal',
  graticules: {
    show: false,
    step: [10, 10],
    stroke: '#ccc'
  },
  stroke: '#666',
  fill: '#ccc',
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
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Create geo projection
  var map = options.map;
  var projection = d3[options.projection]()
                     .translate([0, 0])
                     .center(map.center)
                     .scale(height * map.scale);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  // Parse geo data
  var data = d3.parseGeoData(map, { neighbors: true });
  var features = data.features;
  var neighbors = data.neighbors;

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

    // Graticules
    var graticules = options.graticules;
    var graticule = d3.geoGraticule()
                      .step(graticules.step);
    if (graticules.show) {
      g.append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke);
    }

    // Regions
    var colors = d3.scaleOrdinal(colorScheme);
    var coloring = options.coloring;
    g.selectAll('.region')
     .data(features)
     .enter()
     .append('path')
     .attr('class', 'region')
     .attr('d', path)
     .attr('id', function (d) {
       return id + '-' + d.id;
     })
     .attr('fill', function (d, i) {
       if (coloring === 'topological' && neighbors.length) {
         d.color = (d3.max(neighbors[i], function (n) {
           return features[n].color;
         }) | 0) + 1;
         return colors(d.color);
       }
       return colors(d.id);
     });

  }

};
