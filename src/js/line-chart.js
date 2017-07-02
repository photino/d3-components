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
