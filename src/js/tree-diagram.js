/*!
 * Tree Diagram
 * References: https://bl.ocks.org/mbostock/4339184
 */

// Register a chart type
d3.components.treeDiagram = {
  type: 'tree diagram',
  schema: {
    type: 'object',
    entries: [
      {
        key: 'label',
        type: 'string',
        mappings: [
          'name'
        ]
      },
      {
        key: 'parent',
        type: 'string',
        mappings: [
          'category'
        ]
      },
      {
        key: 'value',
        type: 'number',
        optional: true,
        mappings: [
          'count',
          'percentage',
          'ratio'
        ]
      },
      {
        key: 'image',
        type: 'string',
        optional: true,
        mappings: [
          'icon',
          'img',
          'logo',
          'photo',
          'picture'
        ]
      }
    ]
  },
  hierarchy: {
    root: true,
    collapsed: false,
    successive: false,
    separation: function (a, b) {
      return a.parent == b.parent ? 1 : 2;
    }
  },
  curves: {
    stroke: 'currentColor',
    fill: 'none',
    arrow: {
      show: false,
      size: '1.5%',
      stroke: 'currentColor',
      strokeWidth: 0,
      fill: 'currentColor'
    }
  },
  vertices: {
    show: true,
    radius: '0.5%',
    width: '5%',
    height: '2%',
    stroke: '#1f77b4',
    strokeWidth: 1,
    fill: '#1f77b4',
    cursor: 'pointer'
  },
  labels: {
    show: true,
    dx: '1.5%',
    dy: '0.5%',
    stroke: 'none',
    fill: 'currentColor',
    fontSize: '0.85em',
    maxWidth: '5.1em'
  },
  images: {
    show: false,
    maxWidth: '6%',
    maxHeight: '4%'
  },
  tooltip: {
    html: function (d) {
      return d.data.parent + ' &rarr; ' + d.data.label;
    }
  },
  margin: {
    top: '2em',
    right: '6em',
    bottom: '2em',
    left: '6em'
  }
};

// Tree diagram
d3.treeDiagram = function (data, options) {
  // Parse plotting data and options
  data = d3.parseData('treeDiagram', data);
  options = d3.parseOptions('treeDiagram', options);

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

  // Layout
  var hierarchy = options.hierarchy;
  var stratify = d3.stratify()
                   .id(function (d) {
                     return d.label;
                   })
                   .parentId(function (d) {
                     return d.parent;
                   });
  var tree = d3.tree()
               .size([innerHeight, innerWidth])
               .separation(hierarchy.separation);
  var path = d3.linkHorizontal()
               .x(function (d) {
                 return d.y;
               })
               .y(function (d) {
                 return d.x;
               });

  // Preprocess data
  if (hierarchy.collapsed) {
    var parent = '';
    data.some(function (d) {
      if (!d.parent) {
        parent = d.label;
        return true;
      }
      return false;
    });
    data.forEach(function (d) {
      if (d.parent) {
        var collapsed = d.parent === parent;
        d.collapsed = collapsed;
        d.display = collapsed ? 'block' : 'none';
      } else {
        d.collapsed = false;
        d.display = 'block';
      }
    });
  }

  if (renderer === 'svg') {
    // Create canvas
    var svg = d3.createPlot(chart, options);
    var g = svg.select('.container')
               .attr('transform', d3.translate(margin.left, margin.top));

    // Links
    dispatch.on('init.links', function (root) {
      var curves = options.curves;
      var links = g.selectAll('.link')
                   .data(tree(root).links());
      links.exit()
           .remove();
      links.enter()
           .append('path')
           .attr('class', 'link')
           .merge(links)
           .attr('d', path)
           .attr('stroke', curves.stroke)
           .attr('stroke-width', curves.strokeWidth)
           .attr('fill', curves.fill)
           .attr('display', function (d) {
             return d.target.data.display;
           });
      if (!hierarchy.root) {
        g.selectAll('.link')
         .filter(function (d) {
           return !d.source.parent;
         })
         .attr('display', 'none');
      }
      d3.setArrows(chart, {
        arrow: curves.arrow,
        path: g.selectAll('.link')
      });
    });

    // Nodes
    dispatch.on('init.nodes', function (root) {
      var successive = hierarchy.successive;
      var nodes = g.selectAll('.node')
                   .data(root.descendants());
      nodes.exit()
           .remove();
      nodes.enter()
           .append('g')
           .attr('class', function (d) {
             return 'node' + (d.parent ? '' : ' node-root') +
               (d.children ? ' node-branch' : ' node-leaf');
           })
           .merge(nodes)
           .attr('transform', function (d) {
             return d3.translate(d.y, d.x);
           })
           .attr('display', function (d) {
             return d.data.display;
           });
      g.selectAll('.node-branch')
       .on('click', function (d) {
         var depth = d.depth + 1;
         var label = d.data.label;
         var collapsed = !d.data.collapsed;
         var descendants = d.descendants();
         var labels = descendants.map(function (descendant) {
                                   return descendant.data.label;
                                 });
         data.forEach(function (d) {
           var index = labels.indexOf(d.label);
           if (index !== -1) {
             if (collapsed || !successive) {
               d.collapsed = collapsed;
               d.display = collapsed && index ? 'none' : 'block';
             } else {
               var descendant = descendants[index];
               if (descendant.depth <= depth) {
                 d.collapsed = descendant.children && index;
                 d.display = 'block';
               }
             }
           }
         });
         dispatch.call('init', this, stratify(data));
         dispatch.call('update', this, g.selectAll('.node'));
       });
    });

    // Vertices
    dispatch.on('update.vertices', function (node) {
      var vertices = options.vertices;
      if (vertices.show) {
        var vertexRadius = vertices.radius;
        var vertex = node.select('.vertex');
        if (vertex.empty()) {
          vertex = node.append('circle')
                       .attr('class', 'vertex')
                       .attr('cx', 0)
                       .attr('cy', 0);
        }
        vertex.attr('r', function (d) {
                return d.data.radius || vertexRadius;
              })
              .attr('stroke', vertices.stroke)
              .attr('stroke-width', vertices.strokeWidth)
              .attr('fill', function (d) {
                return d.data.collapsed ? vertices.fill : '#fff';
              });
        node.filter('.node-branch')
            .attr('cursor', vertices.cursor);
        if (!hierarchy.root) {
          node.filter('.node-root')
              .attr('display', 'none');
        }
      }
    });

    // Labels
    dispatch.on('update.labels', function (node) {
      var labels = options.labels;
      if (labels.show) {
        var dx = labels.dx;
        var dy = labels.dy + lineHeight / 12;
        var textAnchor = labels.textAnchor;
        var maxWidth = labels.maxWidth;
        var label = node.select('.label');
        if (label.empty()) {
          label = node.append('text')
                      .attr('class', 'label');
        }
        label.text(function (d) {
               return d.data.label;
             })
             .attr('dx', function (d) {
               return d.data.dx ||
                 (d.children && !d.data.collapsed ? (d.parent ? 0 : -dx) : dx);
             })
             .attr('dy', function (d) {
               return d.data.dy ||
                 (d.parent && d.children && !d.data.collapsed ? 4 : 1) * dy;
             })
             .attr('text-anchor', function (d) {
               return d.data.textAnchor || textAnchor ||
                 d.children && !d.data.collapsed ?
                 (d.parent ? 'middle' : 'end') : 'start';
             })
             .attr('stroke', labels.stroke)
             .attr('fill', labels.fill)
             .attr('font-size', labels.fontSize)
             .attr('lengthAdjust', 'spacingAndGlyphs')
             .attr('textLength', function (d) {
               var textLength = d3.select(this).node().getComputedTextLength();
               return textLength > maxWidth ? maxWidth : null;
             });
      }
    });

    // Images
    dispatch.on('update.images', function (node) {
      var labels = options.labels;
      var images = options.images;
      var imgWidth = images.maxWidth;
      var imgHeight = images.maxHeight;
      var vertices = options.vertices;
      var vertexWidth = vertices.radius + vertices.strokeWidth;
      if (images.show) {
        var icon = node.select('.icon');
        if (icon.empty()) {
          icon = node.append('image')
                     .attr('class', 'icon');
        }
        icon.attr('href', function (d) {
              d.data.width = imgHeight * (d.data.width / d.data.height) || imgWidth;
              d.data.height = Math.min(d.data.height || Infinity, imgHeight);
              return d.data.image;
            })
            .attr('width', function (d) {
              return d.data.width;
            })
            .attr('height', function (d) {
              return d.data.height;
            })
            .attr('x', function (d) {
              var x = -d.data.width / 2;
              return labels.show ? (2 * x + vertexWidth) : x;
            })
            .attr('y', function (d) {
              var y = -d.data.height / 2;
              return y;
            });
      }
    });

    // Tooltip
    dispatch.on('update.tooltip', function (node) {
      var tooltip = options.tooltip;
      tooltip.target = node;
      d3.setTooltip(chart, tooltip);
    });

    dispatch.call('init', this, stratify(data));
    dispatch.call('update', this, g.selectAll('.node'));

  }
};
