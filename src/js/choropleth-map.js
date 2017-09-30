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
          'city',
          'code',
          'county',
          'country',
          'district',
          'name',
          'nation',
          'province',
          'state'
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
        key: 'series',
        type: 'string',
        optional: true,
        mappings: [
          'group',
          'type'
        ]
      }
    ]
  },
  levels: 5,
  projection: 'geoMercator',
  coloring: 'ordinal',
  colorScale: 'scaleOrdinal',
  zoomable: false,
  scaleExtent: [1, 24],
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
  tile: {
    show: false,
    zoomable: true,
    scale: 512,
    scaleExtent: [512, 16777216],
    image: {
      size: 256
    }
  },
  labels: {
    show: false,
    dy: '0.25em',
    stroke: 'none',
    fill: '#333',
    fontSize: '0.5em',
    opacity: 1,
    text: function (d) {
      return d.data.id;
    }
  },
  tooltip: {
    html: function (d) {
      return d.data.id + ': ' + d.data.value
    }
  },
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
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Domain
  var domain = options.domain || [];
  var extent = d3.extent(data, function (d) { return d.value; });
  var min = domain[0] || extent[0] || 0;
  var max = domain[1] || extent[1] || 1;

  // Create geo projection
  var map = options.map;
  var tile = options.tile;
  var projection = d3.geoMercator();
  if (tile.show && d3.tile) {
    options.zoomable = false;
    tile.size = [width, height];
    tile.center = tile.center || map.center;
    tile.scale = Math.max(tile.scale, width);
    projection.scale(1 / (2 * Math.PI))
              .translate([0, 0])
              .center([0, 0]);
  } else {
    projection = d3[options.projection]()
                   .scale(height * map.scale)
                   .translate(map.translate || [0, 0])
                   .rotate(map.rotate || [0, 0])
                   .center(map.center);
  }

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

    // Tiles
    if (tile.show && d3.tile) {
      var center = projection(tile.center);
      var transform = d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(tile.scale)
                        .translate(-center[0], -center[1]);
      var zoom = d3.zoom()
                   .scaleExtent(tile.scaleExtent)
                   .on('zoom', function () {
                     var transform = d3.event.transform;
                     tile.scale = transform.k;
                     tile.translate = [transform.x, transform.y];
                     d3.setTiles(svg.select('.tile'), tile);
                     projection.scale(tile.scale / (2 * Math.PI))
                               .translate(tile.translate);
                     g.selectAll('.region')
                      .attr('d', path);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                   });
      g.attr('transform', d3.translate(0, 0));
      svg.insert('g', ':first-child')
         .attr('class', 'tile');
      svg.call(zoom)
         .call(zoom.transform, transform);
      if (tile.zoomable === false) {
        zoom.on('zoom', null);
      }
    }

    // Graticules
    var graticules = options.graticules;
    if (graticules.show) {
      var graticule = d3.geoGraticule()
                        .step(graticules.step)
                        .precision(graticules.precision);
      g.append('path')
       .datum(graticule)
       .attr('class', 'graticule')
       .attr('d', path)
       .attr('stroke', graticules.stroke);
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

    // Labels
    var labels = options.labels;
    if (labels.show) {
      g.selectAll('.label')
       .data(features)
       .enter()
       .append('text')
       .attr('class', 'label')
       .attr('x', function (d) {
         d.center = path.centroid(d);
         return d.center[0];
       })
       .attr('y', function (d) {
         return d.center[1];
       })
       .attr('dy', labels.dy)
       .attr('text-anchor', 'middle')
       .attr('stroke', labels.stroke)
       .attr('fill', labels.fill)
       .attr('font-size', labels.fontSize)
       .attr('opacity', labels.opacity)
       .text(labels.text);
    }

    if (options.zoomable) {
      var scale = projection.scale();
      var translate = projection.translate();
      var zoom = d3.zoom()
                   .scaleExtent(options.scaleExtent)
                   .on('zoom', function (d) {
                     var transform = d3.event.transform;
                     projection.scale(transform.k * scale)
                               .translate([
                                 translate[0] + transform.x,
                                 translate[1] + transform.y
                               ]);
                     g.selectAll('.graticule')
                      .attr('d', path);
                     g.selectAll('.region')
                      .attr('d', path);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                     g.selectAll('.label')
                      .attr('x', function (d) {
                        d.center = path.centroid(d);
                        return d.center[0];
                      })
                      .attr('y', function (d) {
                        return d.center[1];
                      });
                   });
      svg.attr('cursor', 'move')
         .call(zoom);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.region');
    d3.setTooltip(chart, tooltip);

  }
};
