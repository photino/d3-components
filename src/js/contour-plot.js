/*!
 * Contour Plot
 * References: https://bl.ocks.org/mbostock/f48ff9c1af4d637c9a518727f5fdfef5
 *             https://bl.ocks.org/mbostock/bf2f5f02b62b5b3bb92ae1b59b53da36
 */

// Register a chart type
d3.components.contourPlot = {
  type: 'contour plot',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'x',
        type: 'number',
        mappings: [
          'lng',
          'longitude'
        ]
      },
      {
        key: 'y',
        type: 'number',
        mappings: [
          'lat',
          'latitude'
        ]
      },
      {
        key: 'z',
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
  colorScale: 'scaleOrdinal',
  contours: {
    number: 10,
    smooth: true,
    density: 1
  },
  labels: {
    show: false
  },
  tooltip: {
    html: function (d) {
      var value = Number(d.value.toFixed(3));
      return d3.format('.3')(value);
    }
  }
};

// Contour plot
d3.contourPlot = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('contourPlot', data);
  options = d3.parseOptions('contourPlot', options);

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
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Values
  var contours = options.contours;
  var density = contours.density;
  var size = contours.size || [];
  var sizeX = size[0] || Math.round(innerWidth * density);
  var sizeY = size[1] || Math.round(innerHeight * density);
  var scale = contours.scale || (innerHeight / sizeY);
  var domainX = options.domainX;
  var domainY = options.domainY;
  var dataType = d3.type(data);
  var values = [];
  if (dataType === 'function') {
    var dx = 1 / sizeX;
    var dy = 1 / sizeY;
    var extentX = domainX[1] - domainX[0];
    var extentY = domainY[1] - domainY[0];
    d3.range(dy / 2, 1, dy).forEach(function (sy) {
      d3.range(dx / 2, 1, dx).forEach(function (sx) {
        var x = domainX[0] + sx * extentX;
        var y = domainY[1] - sy * extentY;
        values.push(data(x, y));
      });
    });
  } else if (dataType === 'array') {
    data.sort(function (a, b) {
      return d3.descending(a.y, b.y) || d3.ascending(a.x, b.x);
    });
    values = data.map(function (d) {
      return d.z || d;
    });
  }

  // Thresholds
  var extentZ = d3.extent(values);
  var thresholds = options.thresholds;
  if (d3.type(thresholds) !== 'array') {
    var zmin = extentZ[0];
    var zmax = extentZ[1];
    var step = (zmax - zmin) / contours.number;
    thresholds = d3.range(zmin, zmax, step);
  }

  // Colors
  var colorScale = options.colorScale;
  var colorScheme = options.colorScheme;
  var colors = d3.scaleOrdinal(colorScheme);
  if (colorScale === 'scaleSequential') {
    colors = d3.scaleSequential(colorScheme)
               .domain(extentZ);
  }

  // Contour generator
  var generator = d3.contours()
                    .size([sizeX, sizeY])
                    .thresholds(thresholds)
                    .smooth(contours.smooth);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Path
    var contour = g.selectAll('path')
                   .data(generator(values))
                   .enter()
                   .append('path')
                   .attr('d', d3.geoPath(d3.geoIdentity().scale(scale)))
                   .attr('fill', function (d) {
                     return colors(d.value);
                   })
                   .attr('stroke', contours.stroke);

     // Tooltip
     var tooltip = options.tooltip;
     tooltip.target = contour;
     d3.setTooltip(chart, tooltip);
  }
};
