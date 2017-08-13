/*!
 * Liquid Fill Gauge
 * References: http://bl.ocks.org/brattonc/5e5ce9beee483220e2f6
 */

// Register a chart type
d3.components.liquidFillGauge = {
  type: 'liquid-fill gauge',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'name',
        type: 'string',
        optional: true,
        mappings: [
          'category',
          'label'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'percentage',
          'ratio'
        ]
      }
    ]
  },
  sort: null,
  domain: [0, 1],
  frame: {
    show: true,
    shape: 'circle',
    radius: '60%',
    round: 0,
    stroke: '#1f77b4',
    strokeWidth: '1%',
    fill: 'none',
    fillGap: '1.5%'
  },
  wave: {
    peaks: 2,
    amplitude: 0.1,
    phase: 90,
    period: 4,
    asynchrony: 1,
    opacity: 0.8,
    animation: {
      show: true,
      direction: 'ltr',
      ease: 'easeLinear'
    }
  },
  label: {
    show: true,
    format: '.0%',
    color: '#1f77b4',
    insideColor: '#fff',
    fontSize: '8%',
    fontWeight: 'bold'
  },
  tooltip: {
    html: function (d) {
      var value = d3.format('.0%')(d.value);
      return (d.name ? d.name + ': ' : '') + value;
    }
  }
};

// Liquid Fill Gauge
d3.liquidFillGauge = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('liquidFillGauge', data);
  options = d3.parseOptions('liquidFillGauge', options);

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

  // Preprocess data
  var domain = options.domain;
  if (d3.type(options.sort) === 'function') {
    data.sort(options.sort);
  }
  if (Array.isArray(domain)) {
    var min = domain[0];
    var max = domain[1];
    data.forEach(function (d) {
      d.value = Math.max(Math.min(d.value, max), min);
    });
  }

  // Scales
  var frame = options.frame;
  var wave = options.wave;
  var frameShape = frame.shape;
  var frameRound = frame.round;
  var frameStrokeWidth = frame.strokeWidth;
  var frameRadius = Math.min(frame.radius, height / 2) - frameStrokeWidth;
  var liquidRadius = frameRadius - frame.fillGap;
  var amplitude = liquidRadius * wave.amplitude;
  var peaks = Math.round(wave.peaks);
  var asynchrony = wave.asynchrony;
  var radii = data.map(function (d, i) {
    return (i + 1) * amplitude * peaks * asynchrony + liquidRadius;
  });
  var scaleX = d3.scaleLinear()
                 .domain([0, 1])
                 .range([-liquidRadius, liquidRadius]);
  var scaleY = d3.scaleLinear()
                 .domain([-1, 1])
                 .range([amplitude, -amplitude]);
  var scales = data.map(function (d, i) {
    var radius = radii[i];
    return d3.scaleLinear()
             .domain([0, 1])
             .range([-radius, radius]);
  });
  var areas = data.map(function (d, i) {
    return d3.area()
             .x(function (point) {
               return 4 * scales[i](point.x);
             })
             .y0(liquidRadius)
             .y1(function (point) {
               return scaleY(point.y) - scaleX(d.value);
             });
  });

  // Points
  var phase = Math.PI * wave.phase / 180;
  var omega = 8 * Math.PI * peaks;
  var dx = 1 / (240 * peaks);
  var points = d3.range(0, 1 + dx / 2, dx);

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container');

    // Defs
    var defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.insert('defs', ':first-child');
    }

    // Clip paths
    var clips = defs.selectAll('.wave')
                    .data(data);
    clips.exit()
         .remove();
    clips.enter()
         .append('clipPath')
         .attr('class', 'wave')
         .append('path');

    // Paths
    var clipId = options.id + '-clip-path';
    var clip = defs.selectAll('.wave')
                   .attr('id', function (d, i) {
                     return clipId + '-' + i;
                   });
    var path = clip.select('path');
    if (path.empty()) {
      path = clip.append('path');
    }
    path.attr('d', function (d, i) {
      return areas[i](points.map(function (point) {
        return {
          x: point,
          y: Math.sin(omega * point + phase * (i + 1))
        };
      }));
    });

    // Shape generator
    var generator = function (selection, radius) {
      selection.selectAll('.shape')
               .attr('display', 'none');
      if (frameShape === 'circle') {
        var circle = selection.select('circle');
        if (circle.empty()) {
          circle = selection.append('circle')
                            .attr('class', 'shape')
                            .attr('cx', 0)
                            .attr('cy', 0);
        }
        circle.attr('r', radius)
              .attr('display', 'block');
      } else if (frameShape === 'rect') {
        var roundSize = radius * frameRound;
        var rect = selection.select('rect');
        if (rect.empty()) {
          rect = selection.append('rect')
                          .attr('class', 'shape');
        }
        rect.attr('width', 2 * radius)
            .attr('height', 2 * radius)
            .attr('x', -radius)
            .attr('y', -radius)
            .attr('rx', roundSize)
            .attr('ry', roundSize)
            .attr('display', 'block');
      }
    };

    // Frame
    if (frame.show) {
      var box = g.select('.frame');
      if (box.empty()) {
        box = g.append('g')
               .attr('class', 'frame');
      }
      box.attr('stroke', frame.stroke)
         .attr('stroke-width', frameStrokeWidth)
         .attr('fill', frame.fill)
         .call(generator, frameRadius);
    }

    // Binding data
    var liquids = g.selectAll('.liquid')
                   .data(data);
    liquids.exit()
           .remove();
    liquids.enter()
           .append('g')
           .attr('class', 'liquid')
           .call(generator, liquidRadius);

    // Liquids
    var liquid = g.selectAll('.liquid');
    liquid.call(generator, liquidRadius)
          .attr('fill', function (d, i) {
            return colorScheme[i];
          })
          .attr('clip-path', function (d, i) {
            return 'url(#' + clipId + '-' + i + ')';
          })
          .selectAll('.shape')
          .attr('stroke-width', 0)
          .attr('opacity', wave.opacity);

    // Label
    var label = options.label;
    if (label.show) {
      var text = g.select('.label');
      var value = data.length ? data[0].value : 0;
      if (text.empty()) {
        g.append('text')
         .attr('class', 'label');
        g.append('text')
         .attr('class', 'label label-clip');
      }
      g.selectAll('.label')
       .attr('stroke', 'none')
       .attr('text-anchor', 'middle')
       .attr('fill', label.color)
       .attr('font-size', label.fontSize)
       .attr('font-weight', label.fontWeight)
       .attr('dy', function () {
         var position = label.position || value;
         return liquidRadius * (1 - 2 * position) + lineHeight / 4;
       })
       .text(function () {
         return d3.format(label.format)(value);
       });
      g.select('.label-clip')
       .attr('fill', label.insideColor)
       .attr('clip-path', function () {
         return 'url(#' + clipId + '-0)';
       });
    }

    // Animation
    var animation = wave.animation;
    path.interrupt()
        .transition();
    if (animation.show) {
      var direction = animation.direction;
      var period = wave.period * 1000;
      var ease = animation.ease;
      var initial = d3.translate(0, 0);
      var final = function (d, i) {
        return d3.translate(2 * radii[i], 0);
      };
      var animate = function (selection) {
        selection.attr('transform', direction === 'ltr' ? initial : final)
                 .transition()
                 .duration(period)
                 .ease(d3[ease])
                 .attr('transform', direction === 'ltr' ? final : initial)
                 .on('end', function () {
                   animate(selection);
                 });
      };
      path.call(animate);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.liquid');
    d3.setTooltip(chart, tooltip);
  }
};
