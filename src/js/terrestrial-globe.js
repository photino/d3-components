/*!
 * Terrestrial Globe
 * References: https://bl.ocks.org/mbostock/4282586
 *             https://bl.ocks.org/mbostock/3757125
 *             https://bl.ocks.org/patricksurry/5721459
 *             https://bl.ocks.org/KoGor/5994804
 */

// Register a chart type
d3.components.terrestrialGlobe = {
  type: 'terrestrial globe',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'id',
        type: 'string',
        aliases: [
          'country',
          'nation'
        ]
      },
      {
        key: 'value',
        type: 'number',
        aliases: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'series',
        type: 'string',
        aliases: [
          'group',
          'type'
        ],
        optional: true
      }
    ]
  },
  levels: 5,
  projection: 'geoOrthographic',
  coloring: 'ordinal',
  colorScale: 'scaleOrdinal',
  sphere: {
    show: true,
    stroke: 'none',
    fill: '#1f77b4'
  },
  graticules: {
    show: false,
    step: [10, 10],
    precision: 1,
    stroke: '#ccc'
  },
  regions: {
    show: true,
    stroke: '#666',
    fill: '#fff'
  },
  tooltip: {
    html: function (d) {
      return d.data.id + ': ' + d.data.value
    }
  },
  rotation: {
    enable: true,
    autoplay: false,
    sensitivity: 0.25,
    velocity: [0.01, 0, 0]
  },
  colorScheme: d3.schemeCategory20c
};

// Terrestrial globe
d3.terrestrialGlobe = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('terrestrialGlobe', data);
  options = d3.parseOptions('terrestrialGlobe', options);

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
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Create geo projection
  var map = options.map;
  var center = map.center || [0, 0];
  var radius = Math.min(width, height) / 2;
  var projection = d3[options.projection]()
                     .scale(map.scale * radius)
                     .translate(map.translate || [0, 0])
                     .rotate(map.rotate || [-center[0], -center[1]])
                     .clipAngle(90);

  // Create geo path
  var path = d3.geoPath()
               .projection(projection);

  // Parse geo data
  var geo = d3.parseGeoData(map, { data: data, neighbors: true });
  var features = geo.features;
  var neighbors = geo.neighbors;

  // Colors
  var coloring = options.coloring;
  var colorScale = options.colorScale;
  var colorScheme = options.colorScheme;
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
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Sphere
    var sphere = options.sphere;
    if (sphere.show) {
      g.append('g')
       .attr('class', 'layer')
       .append('path')
       .datum({type: 'Sphere'})
       .attr('class', 'sphere')
       .attr('d', path)
       .attr('stroke', sphere.stroke)
       .attr('stroke-width', sphere.strokeWidth)
       .attr('fill', sphere.fill);
    }

    // Graticules
    var graticules = options.graticules;
    if (graticules.show) {
      var graticule = d3.geoGraticule()
                        .step(graticules.step)
                        .precision(graticules.precision);
      g.append('g')
       .attr('class', 'layer')
       .append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke)
       .attr('fill', 'none');
    }

    // Regions
    var regions = options.regions;
    if (regions.show) {
      var fill = regions.fill;
      g.append('g')
       .attr('class', 'layer')
       .selectAll('.region')
       .data(features)
       .enter()
       .append('path')
       .attr('class', 'region')
       .attr('d', path)
       .attr('stroke', regions.stroke)
       .attr('fill', function (d, i) {
         if (d.color) {
           return d.color;
         }
         if (fill === 'none') {
           return fill;
         }
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
       })
       .attr('opacity', regions.opacity);
    }

     // Rotation
     var rotation = options.rotation;
     if (rotation.enable) {
       if (rotation.autoplay) {
         var velocity = rotation.velocity;
         d3.timer(function (elapsed) {
           var angles = velocity.map(function (v) {
             return v * elapsed;
           });
           projection.rotate(angles);
           g.selectAll('.graticule')
            .attr('d', path);
           g.selectAll('.region')
            .attr('d', path);
         });
       } else {
         var sensitivity = rotation.sensitivity;
         var drag = d3.drag()
                      .subject(function () {
                        var r = projection.rotate();
                        return {
                          x: r[0] / sensitivity,
                          y: -r[1] / sensitivity
                        };
                      })
                      .on('drag', function () {
                        var angles = [
                          d3.event.x * sensitivity,
                          -d3.event.y * sensitivity,
                          projection.rotate()[2]
                        ];
                        projection.rotate(angles);
                        g.selectAll('.graticule')
                         .attr('d', path);
                        g.selectAll('.region')
                         .attr('d', path);
                      });
         g.select('.sphere')
          .call(drag);
       }
     }

     // Tooltip
     var tooltip = options.tooltip;
     tooltip.target = g.selectAll('.region');
     d3.setTooltip(chart, tooltip);

  }
};
