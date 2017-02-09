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
  maxRatio: 0.8,
  donutRatio: 0,
  innerRadius: 0,
  labels: {
    show: false,
    dy: '0.25em',
    stroke: 'none',
    fill: '#fff',
    centroidRatio: 1.2,
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
       .remove();
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
             .attr('text-anchor', 'middle')
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
