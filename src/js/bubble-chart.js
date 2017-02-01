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
