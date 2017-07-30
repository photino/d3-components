/*!
 * Mosaic Plot
 */

// Register a chart type
d3.components.mosaicPlot = {
  type: 'mosaic plot',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'column',
        type: 'string',
        mappings: [
          'category'
        ]
      },
      {
        key: 'row',
        type: 'string',
        mappings: [
          'year'
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
  coloring: 'series',
  scaleX: {
    uniform: false,
    paddingInner: 0.1,
    paddingOuter: 0,
    paddingMidst: 0
  },
  scaleY: {
    uniform: false,
    paddingInner: 0.1,
    paddingOuter: 0
  },
  scaleZ: {
    uniform: false,
    independent: false,
    paddingMidst: 0
  },
  labels: {
    show: false,
    stroke: 'none',
    fill: '#fff',
    fontSize: '3%',
    minWidth: '6%',
    minHeight: '3%',
    text: function (d) {
      return d.value;
    }
  },
  tooltip: {
    html: function (d) {
      var html = 'column = ' + d.column + '<br/>row = ' + d.row;
      if (d.series) {
        html += '<br/>series = ' + d.series;
      }
      return html + '<br/>value = ' + d.value;
    }
  }
};

// Mosaic Plot
d3.mosaicPlot = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('mosaicPlot', data);
  options = d3.parseOptions('mosaicPlot', options);

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

  // Rows and columns
  var rows = options.rows || [];
  var columns = options.columns || [];
  var groups = options.series || [];
  if (!rows.length) {
    rows = d3.set(data, function (d) {
      return d.row;
    }).values();
  }
  if (!columns.length) {
    columns = d3.set(data, function (d) {
      return d.column;
    }).values();
  }
  if (!groups.length) {
    groups = d3.set(data, function (d) {
      return d.series;
    }).values();
  }

  // Layout
  var scaleX = options.scaleX;
  var scaleY = options.scaleY;
  var scaleZ = options.scaleZ;
  var x = d3.scaleBand()
            .domain(columns)
            .range([0, innerWidth])
            .paddingInner(scaleX.paddingInner)
            .paddingOuter(scaleX.paddingOuter);
  var y = d3.scaleBand()
            .domain(rows)
            .range([0, innerHeight])
            .paddingInner(scaleY.paddingInner)
            .paddingOuter(scaleY.paddingOuter);

  // Columns
  var columnMap = d3.map();
  var uniformX = scaleX.uniform;
  if (!uniformX) {
    var columnOffset = 0;
    var columnValues = columns.map(function (column) {
      return d3.sum(data, function (d) {
        return d.column === column ? d.value : 0;
      });
    });
    var columnAverage = d3.mean(columnValues);
    columns.forEach(function (column, index) {
      var columnRatio = columnValues[index] / columnAverage;
      columnMap.set(column, {
        ratio: columnRatio,
        offset: columnOffset
      });
      columnOffset += columnRatio - 1;
    });
  }

  // Rows
  var rowMap = d3.map();
  var uniformY = scaleY.uniform;
  var uniformZ = scaleZ.uniform;
  var independent = scaleZ.independent;
  if (!uniformY) {
    var rowOffset = 0;
    var firstRowOffset = 0;
    var rowValues = rows.map(function (row) {
      return d3.sum(data, function (d) {
        return d.row === row ? d.value : 0;
      });
    });
    var rowAverage = d3.mean(rowValues);
    rows.forEach(function (row, index) {
      var rowRatio = rowValues[index] / rowAverage;
      var rowData = data.filter(function (d) {
        return d.row === row;
      })
      var groupValues = groups.map(function (group) {
        return d3.sum(rowData, function (d) {
          return String(d.series) === group ? d.value : 0;
        });
      });
      var groupAverage = d3.mean(groupValues);
      groups.forEach(function (group, idx) {
        var groupRatio = rowRatio * (uniformZ ? 1 : groupValues[idx] / groupAverage);
        rowMap.set(row + '.' + group, {
          ratio: groupRatio,
          offset: rowOffset
        });
        rowOffset += groupRatio - 1;
      });
      if (index === 0) {
        firstRowOffset = rowOffset;
      }
      if (!independent) {
        columns.forEach(function (column) {
          var groupOffset = firstRowOffset - rowOffset;
          var columnData = rowData.filter(function (d) {
            return d.column === column;
          });
          var cellValues = groups.map(function (group) {
            return d3.sum(columnData, function (d) {
              return String(d.series) === group ? d.value : 0;
            });
          });
          var cellAverage = d3.mean(cellValues);
          groups.forEach(function (group, idx) {
            var cellRatio = rowRatio * (uniformZ ? 1 : cellValues[idx] / cellAverage);
            rowMap.set(row + '.' + column + '.' + group, {
              ratio: cellRatio,
              offset: groupOffset
            });
            groupOffset += cellRatio - 1;
          });
        });
      }
    });
  }

  // Colors
  var coloring = options.coloring;
  var colors = d3.scaleOrdinal()
                 .range(colorScheme);
  if (coloring === 'row') {
    colors.domain(rows);
  } else if (coloring === 'column') {
    colors.domain(columns);
  } else if (coloring === 'series') {
    colors.domain(groups);
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Mosaics
    var bandwidthX = x.bandwidth();
    var bandwidthY = y.bandwidth() / groups.length;
    var paddingMidstY = bandwidthY * scaleZ.paddingMidst;
    g.selectAll('.mosaic')
     .data(data)
     .enter()
     .append('g')
     .attr('class', 'mosaic')
     .attr('transform', function (d) {
       var index = groups.indexOf(d.series);
       var modifier = (independent ? '': '.' + d.column) + '.' + d.series;
       var offsetX = uniformX ? 0 : columnMap.get(d.column).offset;
       var offsetY = uniformY ? 0 : rowMap.get(d.row + modifier).offset;
       d.x = d.x || x(d.column) + bandwidthX * offsetX;
       d.y = d.y || y(d.row) + bandwidthY * offsetY;
       if (index !== -1) {
         d.y += (bandwidthY + paddingMidstY) * index;
       }
       return d3.translate(d.x, d.y);
     })
     .append('rect')
     .attr('x', 0)
     .attr('y', 0)
     .attr('width', function (d) {
       var ratio = uniformX ? 1 : columnMap.get(d.column).ratio;
       d.width = d.width || bandwidthX * ratio;
       return d.width;
     })
     .attr('height', function (d) {
       var modifier = (independent ? '': '.' + d.column) + '.' + d.series;
       var ratio = uniformY ? 1 : rowMap.get(d.row + modifier).ratio;
       d.height = (d.height || bandwidthY * ratio) - paddingMidstY;
       return d.height;
     })
     .attr('stroke', stroke)
     .attr('fill', function (d) {
       d.color = d.color || colors(d[coloring]);
       return d.color;
     });

    // Labels
    var labels = options.labels;
    if (labels.show) {
      var labelMinWidth = labels.minWidth;
      var labelMinHeight = labels.minHeight;
      g.selectAll('.mosaic')
       .append('text')
       .attr('x', function (d) {
         return d.width / 2;
       })
       .attr('y', function (d) {
         return d.height / 2 + lineHeight / 4;
       })
       .attr('text-anchor', 'middle')
       .attr('stroke', labels.stroke)
       .attr('fill', labels.fill)
       .attr('font-size', labels.fontSize)
       .attr('display', function (d) {
         return d.width < labelMinWidth || d.height < labelMinHeight ? 'none' : 'block';
       })
       .text(labels.text);
    }

    // Tooltip
    var tooltip = options.tooltip;
    tooltip.target = g.selectAll('.mosaic');
    d3.setTooltip(chart, tooltip);

  }

};
