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
        aliases: [
          'label',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        aliases: [
          'count',
          'frequency',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        aliases: [
          'group',
          'type'
        ],
        optional: true
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
