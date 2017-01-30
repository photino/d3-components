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
    minAngle: Math.PI / 12,
    wrapText: false,
    wrapWidth: '5em',
    lineHeight: '1.2em',
    verticalAlign: 'middle',
    text: function (d) {
      return d3.format('.0%')(d.data.percentage);
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
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

    // Create the `path` elements
    var colors = d3.scaleOrdinal(colorScheme);
    var color = function (d) { return colors(d.data.label); };
    var slice = g.selectAll('.arc')
                 .data(arcs)
                 .enter()
                 .append('g')
                 .attr('class', 'arc')
                 .append('path')
                 .attr('d', arc)
                 .attr('fill', function (d) {
                   d.color = colors(d.data.label);
                   return d.color;
                 });

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

    // Create the legend
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
      if (legend.updateInPlace) {
        d3.select(chart)
          .selectAll('svg')
          .remove();
      }
      d3.pieChart(data, options);
    };
    d3.setLegend(g, legend);

    // Create the tooltip
    var tooltip = options.tooltip;
    tooltip.hoverTarget = slice;
    tooltip.hoverEffect = 'darker';
    d3.setTooltip(chart, tooltip);

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

  // Callbacks
  if (typeof options.onready === 'function') {
    options.onready(chart);
  }
};
