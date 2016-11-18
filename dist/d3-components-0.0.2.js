/*!
 * Core modules
 */

// D3 components
d3.components = {};

// Default plotting options
d3.defaultOptions = {
  id: 'chart',
  renderer: 'svg',
  responsive: true,
  width: 300,
  aspectRatio: 0.618034,
  color: '#1f77b4',
  colorScheme: d3.schemeCategory10,
  stroke: 'none',
  strokeWidth: 1,
  fontSize: 14,
  lineHeight: 20
};

// Parse plotting data
d3.parseData = function (plot, data) {
  if (Array.isArray(data)) {
    // Normalize data structure
    data = data.filter(function (d) {
      return d !== null && d !== undefined;
    }).map(function (d, i) {
      if (Array.isArray(d)) {
        return d3.parseData(plot, d);
      }
      if (typeof d !== 'object') {
        return {
          index: String(i),
          value: d
        };
      }
      return d;
    });

    // Set up field mapping
    var component = d3.components[plot];
    var schema = component.schema || {};
    if (schema.type === 'object') {
      var entries = schema.entries;
      data = data.map(function (d) {
        var keys = Object.keys(d);
        entries.forEach(function (entry) {
          var key = entry.key;
          var type = entry.type;
          if (!d.hasOwnProperty(key)) {
            var mapping = null;
            entry.mappings.some(function (m) {
              if (keys.indexOf(m) !== -1) {
                mapping = m;
                return true;
              }
              return false;
            });
            if (mapping === null) {
              keys.some(function (k) {
                if (typeof d[k] === type) {
                  mapping = k;
                  return true;
                }
                return false;
              });
            }
            if (mapping) {
              var value = d[mapping];
              if (type === 'number') {
                value = Number(value);
              }
              d[key] = value;
            }
          }
        });
        return d;
      });
    }
  }
  return data;
};

// Parse plotting options
d3.parseOptions = function (plot, options) {
  // Set default component options
  var component = d3.components[plot];
  for (var key in component) {
    if (component.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = component[key];
    }
  }

  // Set default plotting options
  var defaults = d3.defaultOptions;
  var id = options.id || defaults.id;
  var canvas = d3.select('#' + id);
  if (defaults.responsive && !options.hasOwnProperty('responsive')) {
    if (!options.hasOwnProperty('width')) {
      var width = parseInt(canvas.style('width')) || defaults.width;
      options.width = Math.round(width);
    }
    if (!options.hasOwnProperty('height')) {
      var aspectRatio = options.aspectRatio || defaults.aspectRatio;
      var height = parseInt(canvas.style('height')) || (options.width * aspectRatio);
      options.height = Math.round(height);
    }
    if (!options.hasOwnProperty('fontSize')) {
      options.fontSize = parseInt(canvas.style('font-size'));
    }
    if (!options.hasOwnProperty('lineHeight')) {
      options.lineHeight = parseInt(canvas.style('line-height'));
    }
  }
  for (var key in defaults) {
    if (defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = defaults[key];
    }
  }
  options.canvas = canvas;

  // Set the context
  var container = canvas.node();
  if (container.tagName === 'CANVAS') {
    options.renderer = 'canvas';
    canvas = container;
  }
  if (options.renderer === 'canvas') {
    if (container.tagName !== 'CANVAS') {
      canvas = document.createElement('canvas');
      container.appendChild(canvas);
    }
    canvas.width = options.width;
    canvas.height = options.height;
    options.context = canvas.getContext('2d');
  } else {
    options.context = null;
  }
  return options;
};



/*!
 * Pie Chart
 */

// Register a chart type
d3.components.pieChart = {
  type: 'pie',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'label',
        type: 'string',
        mappings: [
          'category',
          'name'
        ]
      },
      {
        key: 'value',
        type: 'number',
        mappings: [
          'count',
          'percentage'
        ]
      }
    ]
  },
  sort: null,
  maxRatio: 0.8,
  innerRadius: 0,
  labels: {
    show: false,
    fill: '#fff',
    minAngle: Math.PI / 12,
    text: function (d) { return d.data.label; }
  },
  legend: {
    show: true,
    text: function (d) { return d.data.label; }
  },
  tooltip: {
    show: true,
    fill: '#fff',
    text: function (d) { return d.data.label; }
  }
};

// Pie chart
d3.pieChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('pieChart', data);
  options = d3.parseOptions('pieChart', options);

  // Use the options
  var renderer = options.renderer;
  var canvas = options.canvas;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var sort = options.sort;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var lineHeight = options.lineHeight;
  var maxRatio = options.maxRatio;
  var innerRadius = options.innerRadius;
  var outerRadius = options.outerRadius || (Math.min(width, height) / 2);
  if (typeof innerRadius === 'number' && typeof outerRadius === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and arcs
  var arcs = d3.pie()
              .sort(sort)
              .value(function (d) { return d.value; })(data);
  var arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
              .context(context);

  if (renderer === 'svg') {
    // Create the `svg` element
    var translate = 'translate(' + (width / 2) + ',' + (height / 2) + ')';
    var svg = canvas.append('svg')
                    .attr('width', width)
                    .attr('height', height);

    // Create the `g` elements
    var g = svg.append('g')
               .attr('transform', translate)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);
    var path = g.selectAll('.arc')
                .data(arcs)
                .enter()
                .append('g')
                .attr('class', 'arc')
                .append('path')
                .attr('d', arc)
                .attr('fill', function (d) { return color(d.data.label); });

    // Create the labels
    var labels = options.labels;
    if (labels.show) {
      g.selectAll('.arc')
       .append('text')
       .attr('x', function (d) { return arc.centroid(d)[0]; })
       .attr('y', function (d) { return arc.centroid(d)[1]; })
       .attr('text-anchor', 'middle')
       .attr('fill', labels.fill)
       .text(labels.text)
       .style('opacity', function (d) {
         var angle = d.endAngle - d.startAngle;
         return angle >= labels.minAngle ? 1 : 0;
       });
    }

    // Create the legend
    var legend = options.legend;
    if (legend.show) {
      svg.append('g')
         .attr('class', 'legend')
         .selectAll('text')
         .data(arcs)
         .enter()
         .append('text')
         .text(legend.text)
         .attr('y', function (d, i) { return lineHeight * (i + 1); })
         .attr('fill', function (d) { return color(d.data.label); });
    }

    // Create the tooltip
    var tooltip = options.tooltip;
    if (tooltip.show) {
      g.style('cursor', 'pointer')
       .selectAll('.arc')
       .on('mouseover', function (d) {
         var position = d3.mouse(this);
         g.append('text')
          .attr('class', 'tooltip')
          .attr('x',  position[0])
          .attr('y', position[1])
          .attr('fill', tooltip.fill)
          .text(function () {
            return tooltip.text(d);
          });
       }).on('mouseout', function () {
         g.select('.tooltip').remove();
       });
    }

  } else if (renderer === 'canvas') {
    context.translate(width / 2, height / 2);
    arcs.forEach(function (d, i) {
      context.beginPath();
      arc(d);
      context.fillStyle = colorScheme[i];
      context.fill();
      context.closePath();
    });

    if (stroke !== 'none') {
      context.beginPath();
      arcs.forEach(arc);
      context.strokeStyle = stroke;
      context.lineWidth = strokeWidth;
      context.stroke();
      context.closePath();
    }
  }
};
