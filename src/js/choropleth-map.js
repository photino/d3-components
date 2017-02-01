/*!
 * Choropleth Map
 * References: https://bl.ocks.org/mbostock/4180634
 *             https://bl.ocks.org/mbostock/4060606
 */

// Register a chart type
d3.components.choroplethMap = {
  type: 'choropleth map',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'id',
        type: 'string',
        mappings: [
          'adcode',
          'code',
          'name'
        ]
      },
      {
        key: 'series',
        type: 'string',
        mappings: [
          'year'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count'
        ]
      }
    ]
  },
  levels: 5,
  projection: 'geoMercator',
  coloring: 'ordinal',
  colorScale: 'scaleOrdinal',
  graticules: {
    show: false,
    step: [10, 10],
    stroke: '#ccc'
  },
  tooltip: {
    html: function (d) {
      return d.data.id + ': ' + d.data.value
    }
  },
  stroke: '#666',
  fill: '#fff',
  colorScheme: d3.schemeCategory20c
};

// Choropleth map
d3.choroplethMap = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('choroplethMap', data);
  options = d3.parseOptions('choroplethMap', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var id = options.id;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var fill = options.fill;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Domain
  var domain = options.domain || [];
  var extent = d3.extent(data, function (d) { return d.value; });
  var min = domain[0] || extent[0];
  var max = domain[1] || extent[1];

  // Create geo projection
  var map = options.map;
  var projection = d3[options.projection]()
                     .translate([0, 0])
                     .center(map.center)
                     .scale(height * map.scale);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  // Parse geo data
  var geo = d3.parseGeoData(map, { neighbors: true, data: data });
  var features = geo.features;
  var neighbors = geo.neighbors;

  // Colors
  var coloring = options.coloring;
  var colorScale = options.colorScale;
  var colors = d3.scaleOrdinal(colorScheme);
  if (colorScale === 'scaleSequential') {
    colors = d3.scaleSequential(colorScheme);
  } else if (colorScale === 'scaleThreshold') {
    var thresholds = options.thresholds || [];
    if (!thresholds.length) {
      var levels = options.levels;
      var step = (max - min) / levels;
      thresholds = d3.range(levels)
                     .map(function (i) { return step * i + min; });
    }
    colors = d3.scaleThreshold()
               .domain(thresholds)
               .range(colorScheme);
  }

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

    // Graticules
    var graticules = options.graticules;
    var graticule = d3.geoGraticule()
                      .step(graticules.step);
    if (graticules.show) {
      g.append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke);
    }

    // Regions
    var region = g.selectAll('.region')
                  .data(features)
                  .enter()
                  .append('path')
                  .attr('class', 'region')
                  .attr('d', path)
                  .attr('fill', function (d, i) {
                    if (coloring === 'topological' && neighbors.length) {
                      d.value = (d3.max(neighbors[i], function (n) {
                        return features[n].value;
                      }) | 0) + 1;
                    } else {
                      d.value = d.data.value;
                    }
                    if (d.value === undefined || d.value === null) {
                      return fill;
                    }
                    if (colorScale === 'scaleSequential') {
                      d.value = (d.value - min) / max;
                    }
                    return colors(d.value);
                  });

     // Tooltip
     var tooltip = options.tooltip;
     tooltip.hoverTarget = region;
     d3.setTooltip(chart, tooltip);

  }

};
