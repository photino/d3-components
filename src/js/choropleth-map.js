/*!
 * Choropleth Map
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
          'name',
          'code'
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
  stroke: '#333',
  fill: '#ccc'
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
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var stroke = options.stroke;
  var fill = options.fill;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Create geo projection
  var map = options.map;
  var projection = d3.geoMercator()
                     .translate([width / 2, height / 2])
                     .center(map.center)
                     .scale(height * map.scale);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(0, 0);
    var g = svg.append('g')
               .attr('class', 'map')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth)
               .attr('fill', fill);

    d3.getMapFeatures(map, function (features) {
      g.selectAll('path')
       .data(features)
       .enter()
       .append('path')
       .attr('d', path)
       .attr('id', function (d) {
         return id + '-' + d.id;
       });
    });

  } else if (renderer === 'canvas') {

  }
};
