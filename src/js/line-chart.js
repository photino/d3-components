/*!
 * Line Chart
 */

// Register a chart type
d3.components.lineChart = {
  type: 'line chart',
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
  labels: {
    show: false
  },
  tooltip: {
    html: function (d, i) {
      return 'Datum ' + i;
    }
  }
};

// Line chart
d3.lineChart = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('lineChart', data);
  options = d3.parseOptions('lineChart', options);

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

  if (renderer === 'svg') {
    // Create the plot
    var plot = d3.createPlot(chart, options);
    var svg = plot.svg;
    var g = plot.container;

  }

};
