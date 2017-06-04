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
    ticks: {
      format: d3.format('d')
    }
  },
  axisY: {
    ticks: {
      format: d3.format('d')
    }
  },
  gridX: {
    show: true
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
    maxRadius: Infinity,
    normalize: 'sqrt',
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
            .range(options.rangeY || [innerHeight, 0])
            .nice();

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
    var maxRadius = dots.maxRadius;
    var normalize = dots.normalize;
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
                 var z = 0;
                 if (maxRadius === Infinity || !maxRadius) {
                   z = d.z / zmax;
                 } else if (maxRadius > minRadius) {
                   z = (d.z - zmin) / (zmax - zmin);
                   scale = maxRadius - minRadius;
                 }
                 if (normalize === 'sqrt') {
                   z = Math.sqrt(z);
                 }
                 return z * scale + minRadius;
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
    tooltip.target = dot;
    d3.setTooltip(chart, tooltip);

  }
};
