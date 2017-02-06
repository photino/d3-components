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
  zoomable: false,
  scaleExtent: [1, 12],
  graticules: {
    show: false,
    step: [10, 10],
    stroke: '#ccc'
  },
  tile: {
    show: false,
    zoomable: true,
    scale: 512,
    scaleExtent: [512, 262144],
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
                   .center(map.center);
  }

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
                     d3.imageTiles(svg.select('.tile'), tile);
                     projection.scale(tile.scale / (2 * Math.PI))
                               .translate(tile.translate);
                     svg.selectAll('.region')
                        .attr('d', path);
                   });
      svg.insert('g', 'g')
         .attr('class', 'tile');
      g.attr('transform', d3.translate(0, 0));
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
                        .step(graticules.step);
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
                  });

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
    tooltip.hoverTarget = region;
    d3.setTooltip(chart, tooltip);

  }

};
