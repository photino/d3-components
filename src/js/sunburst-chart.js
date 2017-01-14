/*!
 * Sunburst Chart
 */

// Register a chart type
d3.components.sunburstChart = {
  type: 'sunburst chart',
  schema: {
    type: 'object',
    hierarchy: 'children',
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
          'count'
        ]
      },
      {
        key: 'children',
        type: 'array'
      }
    ]
  },
  sort: null,
  partition: {
    padding: 0,
    round: false
  },
  donut: false,
  stroke: '#fff',
  colorScheme: d3.schemeCategory20c,
  labels: {
    show: false
  },
  tooltip: {
    show: true,
    html: function (d) {
      return d.data.label + ': ' + d.data.value;
    }
  }
};

// Sunburst chart
d3.sunburstChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('sunburstChart', data);
  options = d3.parseOptions('sunburstChart', options);

  // Use the options
  var chart = options.chart;
  var renderer = options.renderer;
  var context = options.context;
  var width = options.width;
  var height = options.height;
  var innerWidth = options.innerWidth;
  var innerHeight = options.innerHeight;
  var stroke = options.stroke;
  var strokeWidth = options.strokeWidth;
  var colorScheme = options.colorScheme;
  var fontSize = options.fontSize;
  var lineHeight = options.lineHeight;

  // Layout and arcs
  var partition = options.partition;
  var radius = Math.min(width, height) / 2;
  var x = d3.scaleLinear()
            .domain([0, radius])
            .range([0, 2 * Math.PI])
            .clamp(true);
  var root = d3.hierarchy(data, function (d) {
                  return d.children;
               })
               .sum(function (d) {
                 return d.children ? 0 : d.value;
               });
  if (typeof options.sort === 'function') {
    root.sort(options.sort);
  }
  d3.partition()
    .size(partition.size || [radius, radius])
    .padding(partition.padding)
    .round(partition.round)(root);

  // Arcs
  var arc = d3.arc()
              .startAngle(function (d) {
                return x(d.x0);
              })
              .endAngle(function (d) {
                return x(d.x1);
              })
              .innerRadius(function (d) {
                return d.y0;
              })
              .outerRadius(function (d) {
                return d.y1;
              })
              .context(context);

  if (renderer === 'svg') {
    // Create the `svg` element
    var svg = d3.select(chart)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

    // Create the `g` elements
    var transform = options.position || d3.translate(width / 2, height / 2);
    var g = svg.append('g')
               .attr('class', 'sunburst')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);
    var donut = options.donut;
    var path = g.selectAll('.arc')
                .data(root.descendants())
                .enter()
                .append('g')
                .attr('class', 'arc')
                .append('path')
                .attr('d', arc)
                .attr('display', function (d) {
                  return donut && d.parent === null ? 'none' : null;
                })
                .attr('fill', function (d) {
                  return color((d.children ? d : d.parent).data.label);
                });

    // Create the tooltip
    var tooltip = options.tooltip;
    if (tooltip.show) {
      var t = d3.select('#' + tooltip.id);
      path.on('mouseover', function (d) {
        var position = d3.mouse(chart);
        t.attr('class', 'tooltip')
         .style('display', 'block');
        t.html(tooltip.html(d))
         .style('left', position[0] + 'px')
         .style('top', position[1] + 'px');
      })
      .on('mousemove', function (d) {
        var position = d3.mouse(chart);
        var offsetX = parseInt(t.style('width')) / 2;
        var offsetY = parseInt(t.style('height')) + lineHeight / 6;
        t.style('left', (position[0] - offsetX) + 'px')
         .style('top', (position[1] - offsetY) + 'px');
      })
      .on('mouseout', function () {
        t.style('display', 'none');
      });
    }

  } else if (renderer === 'canvas') {

  }
};
