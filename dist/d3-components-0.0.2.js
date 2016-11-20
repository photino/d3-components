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
      opacity: 0.8
    }
  }
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
      if (d3.type(d) !== 'object') {
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
                if (d3.type(d[k]) === type) {
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
              } else if (type === 'date') {
                value = new Date(value);
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
  var innerRadius = options.innerRadius;
  var outerRadius = options.outerRadius || Math.min(innerWidth, innerHeight) / 2;
  if (d3.type(innerRadius) === 'number' && d3.type(outerRadius) === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and arcs
  var sort = options.sort;
  var arcs = d3.pie()
              .sort(sort)
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
       .style('opacity', function (d) {
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
                    .style('cursor', 'pointer')
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
      g.style('cursor', 'pointer')
       .selectAll('.arc')
       .on('mouseover', function (d) {
         var position = d3.mouse(chart);
         d3.select(this)
           .select('path')
           .attr('fill', d3.color(color(d.data.label)).darker());
         t.transition()
          .attr('class', 'tooltip')
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
         t.transition()
          .style('display', 'none');
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
