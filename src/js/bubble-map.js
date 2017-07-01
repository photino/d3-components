/*!
 * Bubble Map
 */

// Register a chart type
d3.components.bubbleMap = {
  type: 'bubble map',
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
        key: 'lng',
        type: 'number',
        mappings: [
          'lon',
          'longitude'
        ]
      },
      {
        key: 'lat',
        type: 'number',
        mappings: [
          'latitude'
        ]
      }
    ]
  },
  sort: null,
  projection: 'geoMercator',
  tile: {
    show: false,
    scale: 512
  },
  dots: {
    scale: '0.5%',
    minRadius: 2,
    maxRadius: Infinity,
    stroke: '#fff',
    opacity: 0.8
  },
  labels: {
    show: false
  },
  tooltip: {
    html: function (d) {
      return d.id + ': ' + d.value;
    }
  }
};

// Bubble map
d3.bubbleMap = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('bubbleMap', data);
  options = d3.parseOptions('bubbleMap', options);

  // Register callbacks
  var dispatch = d3.dispatch('init', 'update', 'finalize');

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
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

  // Parse geo data
  data = d3.parseGeoData(map, { data: data, mixin: true });

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
                   .on('zoom', function () {
                     var transform = d3.event.transform;
                     tile.scale = transform.k;
                     tile.translate = [transform.x, transform.y];
                     projection.scale(tile.scale / (2 * Math.PI))
                               .translate(tile.translate);
                     g.selectAll('.dot')
                      .attr('cx', function (d) {
                        return projection(d.coordinates)[0]
                      })
                      .attr('cy', function (d) {
                        return projection(d.coordinates)[1]
                      });
                   });
      g.call(zoom)
       .call(zoom.transform, transform);
      zoom.on('zoom', null);
    }

    // Circles
    var colors = d3.scaleOrdinal(colorScheme);
    var dots = options.dots;
    var scale = dots.scale;
    var minRadius = dots.minRadius;
    var maxRadius = dots.maxRadius;
    var circle = g.append('g')
                  .attr('class', 'layer')
                  .attr('stroke', dots.stroke)
                  .attr('opacity', dots.opacity)
                  .selectAll('.dot')
                  .data(data)
                  .enter()
                  .append('circle')
                  .attr('class', 'dot')
                  .each(function (d) {
                    d.coordinates = d.coordinates || [d.lng, d.lat];
                  })
                  .attr('cx', function (d) {
                    return projection(d.coordinates)[0]
                  })
                  .attr('cy', function (d) {
                    return projection(d.coordinates)[1]
                  })
                  .attr('r', function (d) {
                    var r = 0;
                    if (maxRadius === Infinity || !maxRadius) {
                      r = Math.sqrt(d.value / max) * scale;
                    } else if (maxRadius > minRadius) {
                      r = Math.sqrt((d.value - min) / (max - min)) * (maxRadius - minRadius);
                    }
                    return r + minRadius;
                  })
                  .attr('fill', function (d) {
                    return colors(d.value);
                  })
                  .sort(function (a, b) {
                    return b.value - a.value;
                  });

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = circle;
    d3.setTooltip(chart, tooltip);
  }
};
