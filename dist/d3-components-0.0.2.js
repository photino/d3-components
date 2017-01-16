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
  textColor: '#333',
  disabledTextColor: '#ccc',
  stroke: 'none',
  strokeWidth: 1,
  fontSize: 14,
  lineHeight: 20,
  tooltip: {
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
          if (!d.hasOwnProperty(key)) {
            var mapping = null;
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
          } else if (key === hierarchy && type === 'array') {
            d[hierarchy] = d3.parseData(plot, d[hierarchy]);
          }
        });
        return d;
      });
    }
  } else {
    data = d3.parseData(plot, [data])[0];
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
    var mapName = map.name || 'world';
    options.map = d3.extend(d3.maps[mapName], map);
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
    if (/^\d+\.?\d*(px)$/.test(value)) {
      value = Number(value.replace('px', ''));
    } else if (/^\d+\.?\d*(em)$/.test(value)) {
      if (context.hasOwnProperty('fontSize')) {
        value = Number(value.replace('em', '')) * context.fontSize;
      }
    } else if (/^\d+\.?\d*\%$/.test(value)) {
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

// Get map data
d3.getMap = function (map, callback) {
  // Normalize callback
  callback = (typeof callback === 'function') ? callback : function () {};

  // Set data type
  var data = map.data;
  var type = d3.type(data);
  if (type === 'object') {
    return callback(data);
  }
  if (type === 'string') {
    if (/(geo|topo)\.?json$/.test(data)) {
      type = 'json';
    }
  }
  if (type === 'json') {
    d3.json(data, function (json) {
      var features = json.features || [];
      var neighbors = [];
      if (window.topojson) {
        if (map.object) {
          var object = json.objects[map.object];
          features = topojson.feature(json, object).features;
          neighbors = topojson.neighbors(object.geometries);
        }
      }
      return callback({
        features: features.map(function (feature, index) {
          if (!feature.hasOwnProperty('id')) {
            feature.id = String(feature.properties.id || index);
          }
          return feature;
        }),
        neighbors: neighbors
      });
    });
  }
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
    show: true,
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

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(width / 2, height / 2);
    var g = svg.append('g')
               .attr('class', 'bar')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);

  } else if (renderer === 'canvas') {

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
    fill: '#fff',
    minAngle: Math.PI / 12,
    text: function (d) {
      return d.data.label;
    }
  },
  legend: {
    show: true,
    symbol: {
      width: '1.294427em',
      height: '0.8em'
    },
    text: function (d) {
      return d.data.label;
    }
  },
  tooltip: {
    show: true,
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
  var maxRatio = options.maxRatio;
  var donutRatio = options.donutRatio;
  var outerRadius = options.outerRadius || Math.min(innerWidth, innerHeight) / 2;
  var innerRadius = options.innerRadius || outerRadius * donutRatio;
  if (d3.type(innerRadius) === 'number' && d3.type(outerRadius) === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and arcs
  var arcs = d3.pie()
              .sort(options.sort)
              .value(function (d) {
                return d.disabled ? 0 : d.value;
              })(data);
  var arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
              .context(context);

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(width / 2, height / 2);
    var g = svg.append('g')
               .attr('class', 'pie')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);
    var colorFunction = function (d) {
      return color(d.data.label);
    };
    var path = g.selectAll('.arc')
                .data(arcs)
                .enter()
                .append('g')
                .attr('class', 'arc')
                .append('path')
                .attr('d', arc)
                .attr('fill', colorFunction);

    // Create the labels
    var labels = options.labels;
    if (labels.show) {
      g.selectAll('.arc')
       .append('text')
       .attr('class', 'label')
       .attr('x', function (d) {
         return arc.centroid(d)[0];
       })
       .attr('y', function (d) {
         return arc.centroid(d)[1];
       })
       .attr('text-anchor', 'middle')
       .attr('fill', labels.fill)
       .text(labels.text)
       .attr('opacity', function (d) {
         var angle = d.endAngle - d.startAngle;
         return angle >= labels.minAngle ? 1 : 0;
       });
    }

    // Create the legend
    var legend = options.legend;
    if (legend.show) {
      var legendPosition = legend.position;
      var legendSymbol = legend.symbol;
      var symbolWidth = Math.round(legendSymbol.width);
      var symbolHeight = Math.round(legendSymbol.height);
      var textColor = options.textColor;
      var disabledTextColor = options.disabledTextColor;
      var item = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', legendPosition)
                    .attr('cursor', 'pointer')
                    .selectAll('.legend-item')
                    .data(arcs)
                    .enter()
                    .append('g')
                    .attr('class', function (d) {
                      return 'legend-item' + (d.data.disabled ? ' disabled' : '');
                    });

      item.append('rect')
          .attr('width', symbolWidth)
          .attr('height', symbolHeight)
          .attr('x', 0)
          .attr('y', function (d, i) {
            return lineHeight * (i + 1) - symbolHeight;
          })
          .attr('fill', function (d) {
            return d.data.disabled ? disabledTextColor : color(d.data.label);
          });

      item.append('text')
          .text(legend.text)
          .attr('x', symbolWidth + fontSize / 4)
          .attr('y', function (d, i) {
            return lineHeight * (i + 1);
          })
          .attr('fill', function (d) {
            return d.data.disabled ? disabledTextColor : textColor;
          });

      item.on('click', function (d) {
        var label = d.data.label;
        var disabled = d.data.disabled;
        data.some(function (d) {
          if (d.label === label) {
            d.disabled = !disabled;
            return true;
          }
          return false;
        });
        svg.remove();
        d3.pieChart(data, options);
      });
    }

    // Create the tooltip
    var tooltip = options.tooltip;
    if (tooltip.show) {
      var t = d3.select('#' + tooltip.id);
      g.selectAll('.arc')
       .on('mouseover', function (d) {
         var position = d3.mouse(chart);
         d3.select(this)
           .select('path')
           .attr('fill', d3.color(color(d.data.label)).darker());
         t.attr('class', 'tooltip')
          .style('display', 'block');
         t.html(tooltip.html(d))
          .style('left', position[0] + 'px')
          .style('top', position[1] + 'px');
       })
       .on('mousemove', function (d) {
         var position = d3.mouse(chart);
         var offsetX = parseInt(t.style('width')) / 2;
         var offsetY = parseInt(t.style('height')) + lineHeight / 6;
         t.style('left', (position[0] - offsetX) + 'px')
          .style('top', (position[1] - offsetY) + 'px');
       })
       .on('mouseout', function () {
         d3.select(this)
           .select('path')
           .attr('fill', colorFunction);
         t.style('display', 'none');
       });
    }

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
    show: true,
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

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(width / 2, height / 2);
    var g = svg.append('g')
               .attr('class', 'line')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);

  } else if (renderer === 'canvas') {

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
    stroke: '#999',
    strokeDash: [6, 4]
  },
  gridY: {
    show: false,
    stroke: '#999',
    strokeDash: [6, 4]
  },
  labelX: {
    show: false,
    text: 'X'
  },
  labelY: {
    show: false,
    text: 'Y'
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
    show: true,
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
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var g = svg.append('g')
               .attr('class', 'bubble')
               .attr('transform', d3.translate(margin.left, margin.top))
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

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
       .attr('dy', '3em')
       .text(labelX.text);
    }
    if (labelY.show) {
      g.append('text')
       .attr('class', 'label label-y')
       .attr('text-anchor', 'end')
       .attr('y', 0)
       .attr('dy', '-3em')
       .attr('transform', 'rotate(-90)')
       .text(labelY.text);
    }

    // Add dots
    var color = d3.scaleOrdinal(colorScheme);
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
                 return color(d.x);
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
     if (tooltip.show) {
       var t = d3.select('#' + tooltip.id);
       dot.on('mouseover', function (d) {
         var position = d3.mouse(chart);
         t.attr('class', 'tooltip')
          .style('display', 'block');
         t.html(tooltip.html(d))
          .style('left', position[0] + 'px')
          .style('top', position[1] + 'px');
       })
       .on('mousemove', function (d) {
         var position = d3.mouse(chart);
         var offsetX = parseInt(t.style('width')) / 2;
         var offsetY = parseInt(t.style('height')) + lineHeight / 6;
         t.style('left', (position[0] - offsetX) + 'px')
          .style('top', (position[1] - offsetY) + 'px');
       })
       .on('mouseout', function () {
         t.style('display', 'none');
       });
     }

  } else if (renderer === 'canvas') {

  }
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
    show: true,
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
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(width / 2, height / 2);
    var g = svg.append('g')
               .attr('class', 'sunburst')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);
    var donut = options.donut;
    var path = g.selectAll('.arc')
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
                  return color((d.children ? d : d.parent).data.label);
                });
    if (options.zoomable) {
      path.attr('cursor', 'pointer')
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
    if (tooltip.show) {
      var t = d3.select('#' + tooltip.id);
      path.on('mouseover', function (d) {
        var position = d3.mouse(chart);
        t.attr('class', 'tooltip')
         .style('display', 'block');
        t.html(tooltip.html(d))
         .style('left', position[0] + 'px')
         .style('top', position[1] + 'px');
      })
      .on('mousemove', function (d) {
        var position = d3.mouse(chart);
        var offsetX = parseInt(t.style('width')) / 2;
        var offsetY = parseInt(t.style('height')) + lineHeight / 6;
        t.style('left', (position[0] - offsetX) + 'px')
         .style('top', (position[1] - offsetY) + 'px');
      })
      .on('mouseout', function () {
        t.style('display', 'none');
      });
    }

  } else if (renderer === 'canvas') {

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

  // Use the options
  var chart = options.chart;
  var id = options.id;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var stroke = options.stroke;
  var fill = options.fill;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Create geo projection
  var map = options.map;
  var projection = d3[options.projection]()
                     .translate([width / 2, height / 2])
                     .center(map.center)
                     .scale(height * map.scale);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(0, 0);
    var g = svg.append('g')
               .attr('class', 'map')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth)
               .attr('fill', fill);

    var color = d3.scaleOrdinal(colorScheme);
    var coloring = options.coloring;
    d3.getMap(map, function (data) {
      var features = data.features;
      var neighbors = data.neighbors;
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
           return color(d.color);
         }
         return color(d.id);
       });
    });

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

  } else if (renderer === 'canvas') {

  }
};
