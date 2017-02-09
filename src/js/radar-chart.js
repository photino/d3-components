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

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.hoverTarget = dot;
    d3.setTooltip(chart, tooltip);

  }

};
