/*!
 * Choropleth Map
 * Reference: http://bl.ocks.org/mbostock/4180634
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
        key: 'value',
        type: 'number',
        mappings: [
          'count'
        ]
      }
    ]
  },
  projection: 'geoMercator',
  coloring: 'ordinal',
  graticules: {
    show: false,
    step: [10, 10],
    stroke: '#ccc'
  },
  stroke: '#666',
  fill: '#ccc',
  colorScheme: d3.schemeCategory20c
};

// Choropleth map
d3.choroplethMap = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('choroplethMap', data);
  options = d3.parseOptions('choroplethMap', options);

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
  var data = d3.parseGeoData(map, { neighbors: true });
  var features = data.features;
  var neighbors = data.neighbors;

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
    var colors = d3.scaleOrdinal(colorScheme);
    var coloring = options.coloring;
    g.selectAll('.region')
     .data(features)
     .enter()
     .append('path')
     .attr('class', 'region')
     .attr('d', path)
     .attr('id', function (d) {
       return id + '-' + d.id;
     })
     .attr('fill', function (d, i) {
       if (coloring === 'topological' && neighbors.length) {
         d.color = (d3.max(neighbors[i], function (n) {
           return features[n].color;
         }) | 0) + 1;
         return colors(d.color);
       }
       return colors(d.id);
     });

  }

  // Callbacks
  if (typeof options.onready === 'function') {
    options.onready(chart);
  }
};
