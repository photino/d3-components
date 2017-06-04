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
