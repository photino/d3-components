/*!
 * Timeline Diagram
 * References: https://bl.ocks.org/bunkat/2338034
 */

// Register a chart type
d3.components.timelineDiagram = {
  type: 'timeline diagram',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'date',
        type: 'date',
        mappings: [
          'time',
          'year'
        ]
      },
      {
        key: 'text',
        type: 'string',
        mappings: [
          'content',
          'info',
          'name'
        ]
      },
      {
        key: 'img',
        type: 'string',
        mappings: [
          'icon',
          'image',
          'picture',
          'photo'
        ]
      }
    ]
  },
  sort: 'ascending(date)',
  scale: 'scaleTime',
  axis: {
    show: true,
    label: true,
    nice: false,
    format: '%Y',
    stroke: 'currentColor',
    strokeWidth: 1,
    fill: 'currentColor',
    fontSize: '0.5em',
    domain: {
      stroke: 'currentColor',
      strokeWidth: 1
    },
    ticks: {
      number: 8,
      sizeInner: 0,
      sizeOuter: 0,
      padding: 4,
      format: ''
    }
  },
  items: {
    stroke: 'currentColor',
    strokeWidth: 1,
    fill: 'currentColor',
    fontSize: '0.65em'
  },
  connectors: {
    dx: 0,
    dy: '3.5%',
    stroke: 'currentColor',
    strokeWidth: 1
  },
  knots: {
    radius: '0.5%',
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: '#fff'
  },
  images: {
    maxWidth: '6%',
    maxHeight: '6%'
  },
  tooltip: {
    html: function (d) {
      return d3.timeFormat('%Y-%m-%d')(d.date);
    }
  }
};

// Timeline diagram
d3.timelineDiagram = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('timelineDiagram', data);
  options = d3.parseOptions('timelineDiagram', options);

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

  // Domain
  var domain = options.domain;
  if (Array.isArray(domain) && domain.length) {
    domain = domain.map(function (d) {
      return new Date(d);
    });
    data = data.filter(function (d) {
      return d.date >= domain[0] && d.date < domain[1];
    });
  } else {
    domain = d3.extent(data, function (d) {
      return d.date;
    });
  }
  if (d3.type(options.sort) === 'function') {
    data.sort(options.sort);
  }
  if (options.scale === 'scalePoint') {
    domain = data.map(function (d) {
      return d.date;
    });
  }

  // Scale
  var axis = options.axis;
  var scale = d3[options.scale]()
                .domain(domain)
                .rangeRound([0, innerWidth]);
  if (axis.nice) {
    scale.nice();
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Axis
    var origin = options.origin || [0, innerHeight / 2];
    var startX = origin[0];
    var startY = origin[1];
    d3.setAxes(g, {
      width: innerWidth,
      height: startY,
      scaleX: scale,
      axisX: axis
    });
    if (axis.label) {
      var format = d3.timeFormat(axis.format);
      g.append('text')
       .attr('class', 'label')
       .attr('x', startX - fontSize / 2)
       .attr('y', startY + lineHeight / 8)
       .attr('font-size', axis.fontSize)
       .attr('fill', axis.fill)
       .attr('text-anchor', 'end')
       .text(format(domain[0]));
      g.append('text')
       .attr('class', 'label')
       .attr('x', innerWidth + fontSize / 2)
       .attr('y', startY + lineHeight / 8)
       .attr('font-size', axis.fontSize)
       .attr('fill', axis.fill)
       .attr('text-anchor', 'start')
       .text(format(domain[1]));
    }

    // Items
    var items = options.items;
    var images = options.images;
    var imgWidth = images.maxWidth;
    var imgHeight = images.maxHeight;
    var connectors = options.connectors;
    var dx = connectors.dx;
    var dy = connectors.dy;
    var xmax = [0, 0];
    var ymax = [dy, dy];
    g.selectAll('.item')
     .data(data)
     .enter()
     .append('g')
     .attr('class', 'item')
     .attr('transform', function (d, i) {
       var idx = i % 2;
       var x = scale(d.date);
       var y = ymax[idx];
       d.width = imgHeight * (d.width / d.height) || imgWidth;
       d.height = Math.min(d.height || Infinity, imgHeight);
       if (i > 1 && xmax[idx] + d.width > x) {
         y += 2 * dy + d.height;
       } else {
         y = dy;
       }
       xmax[idx] = x;
       ymax[idx] = y;
       d.dx = d.hasOwnProperty('dx') ? Number(d.dx) : dx * (y > dy ? y / dy : 1);
       d.dy = d.hasOwnProperty('dy') ? Number(d.dy) : (idx ? y : -y);
       return d3.translate(x, origin[1]);
     });

    // Connectors
    g.selectAll('.item')
     .append('line')
     .attr('class', 'connector')
     .attr('x1', 0)
     .attr('y1', 0)
     .attr('x2', function (d) {
       return d.dx;
     })
     .attr('y2', function (d) {
       return d.dy;
     })
     .attr('stroke', connectors.stroke)
     .attr('stroke-width', connectors.strokeWidth);

    // Images
    g.selectAll('.item')
     .append('image')
     .attr('href', function (d) {
       return d.img;
     })
     .attr('x', function (d) {
       return d.dx - d.width / 2;
     })
     .attr('y', function (d) {
       return d.dy + (d.dy > 0 ? lineHeight : -d.height - lineHeight);
     })
     .attr('width', function (d) {
       return d.width;
     })
     .attr('height', function (d) {
       return d.height;
     });

    // Texts
    g.selectAll('.item')
     .append('text')
     .attr('x', function (d) {
       return d.dx;
     })
     .attr('y', function (d) {
       return d.dy + lineHeight / (d.dy > 0 ? 2 : -4);
     })
     .attr('font-size', items.fontSize)
     .attr('fill', items.fill)
     .attr('text-anchor', 'middle')
     .text(function (d) {
       return d.text;
     });

    // Knots
    var knots = options.knots;
    var multicolor = knots.multicolor;
    g.selectAll('.item')
     .append('circle')
     .attr('class', 'knot')
     .attr('cx', 0)
     .attr('cy', 0)
     .attr('r', knots.radius)
     .attr('stroke', function (d, i) {
       return (multicolor ? d.color || colorScheme[i] : null) || knots.stroke;
     })
     .attr('stroke-width', knots.strokeWidth)
     .attr('fill', function (d, i) {
       return (multicolor ? d.color  || colorScheme[i] : null) || knots.fill;
     });

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.knot');
    d3.setTooltip(chart, tooltip);

  }
};
