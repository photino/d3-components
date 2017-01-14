/*!
 * Pie Chart
 */

// Register a chart type
d3.components.pieChart = {
  type: 'pie chart',
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
  donutRatio: 0,
  innerRadius: 0,
  labels: {
    show: false,
    fill: '#fff',
    minAngle: Math.PI / 12,
    text: function (d) {
      return d.data.label;
    }
  },
  legend: {
    show: true,
    symbol: {
      width: '1.294427em',
      height: '0.8em'
    },
    text: function (d) {
      return d.data.label;
    }
  },
  tooltip: {
    show: true,
    html: function (d) {
      var percentage = (d.endAngle - d.startAngle) / (2 * Math.PI);
      return d.data.label + ': ' + d3.format('.1%')(percentage);
    }
  }
};

// Pie chart
d3.pieChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('pieChart', data);
  options = d3.parseOptions('pieChart', options);

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
  var maxRatio = options.maxRatio;
  var donutRatio = options.donutRatio;
  var outerRadius = options.outerRadius || Math.min(innerWidth, innerHeight) / 2;
  var innerRadius = options.innerRadius || outerRadius * donutRatio;
  if (d3.type(innerRadius) === 'number' && d3.type(outerRadius) === 'number') {
    innerRadius = Math.min(innerRadius, outerRadius * maxRatio);
  }

  // Shape and arcs
  var arcs = d3.pie()
              .sort(options.sort)
              .value(function (d) {
                return d.disabled ? 0 : d.value;
              })(data);
  var arc = d3.arc()
              .innerRadius(innerRadius)
              .outerRadius(outerRadius)
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
               .attr('class', 'pie')
               .attr('transform', transform)
               .attr('stroke', stroke)
               .attr('stroke-width', strokeWidth);

    // Create the `path` elements
    var color = d3.scaleOrdinal(colorScheme);
    var colorFunction = function (d) {
      return color(d.data.label);
    };
    var path = g.selectAll('.arc')
                .data(arcs)
                .enter()
                .append('g')
                .attr('class', 'arc')
                .append('path')
                .attr('d', arc)
                .attr('fill', colorFunction);

    // Create the labels
    var labels = options.labels;
    if (labels.show) {
      g.selectAll('.arc')
       .append('text')
       .attr('class', 'label')
       .attr('x', function (d) {
         return arc.centroid(d)[0];
       })
       .attr('y', function (d) {
         return arc.centroid(d)[1];
       })
       .attr('text-anchor', 'middle')
       .attr('fill', labels.fill)
       .text(labels.text)
       .attr('opacity', function (d) {
         var angle = d.endAngle - d.startAngle;
         return angle >= labels.minAngle ? 1 : 0;
       });
    }

    // Create the legend
    var legend = options.legend;
    if (legend.show) {
      var legendPosition = legend.position;
      var legendSymbol = legend.symbol;
      var symbolWidth = Math.round(legendSymbol.width);
      var symbolHeight = Math.round(legendSymbol.height);
      var textColor = options.textColor;
      var disabledTextColor = options.disabledTextColor;
      var item = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', legendPosition)
                    .attr('cursor', 'pointer')
                    .selectAll('.legend-item')
                    .data(arcs)
                    .enter()
                    .append('g')
                    .attr('class', function (d) {
                      return 'legend-item' + (d.data.disabled ? ' disabled' : '');
                    });

      item.append('rect')
          .attr('width', symbolWidth)
          .attr('height', symbolHeight)
          .attr('x', 0)
          .attr('y', function (d, i) {
            return lineHeight * (i + 1) - symbolHeight;
          })
          .attr('fill', function (d) {
            return d.data.disabled ? disabledTextColor : color(d.data.label);
          });

      item.append('text')
          .text(legend.text)
          .attr('x', symbolWidth + fontSize / 4)
          .attr('y', function (d, i) {
            return lineHeight * (i + 1);
          })
          .attr('fill', function (d) {
            return d.data.disabled ? disabledTextColor : textColor;
          });

      item.on('click', function (d) {
        var label = d.data.label;
        var disabled = d.data.disabled;
        data.some(function (d) {
          if (d.label === label) {
            d.disabled = !disabled;
            return true;
          }
          return false;
        });
        svg.remove();
        d3.pieChart(data, options);
      });
    }

    // Create the tooltip
    var tooltip = options.tooltip;
    if (tooltip.show) {
      var t = d3.select('#' + tooltip.id);
      g.selectAll('.arc')
       .on('mouseover', function (d) {
         var position = d3.mouse(chart);
         d3.select(this)
           .select('path')
           .attr('fill', d3.color(color(d.data.label)).darker());
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
         d3.select(this)
           .select('path')
           .attr('fill', colorFunction);
         t.style('display', 'none');
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
