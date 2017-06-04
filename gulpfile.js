
/**
 * Gulpfile for d3-components
 */

var gulp = require('gulp');
var header = require('gulp-header');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglifyJS = require('gulp-uglify');
var ghPages = require('gulp-gh-pages');
var pug = require('gulp-pug');

var pkg = require('./package.json');
var version = pkg.version;
var banner = '/*! D3 Components v<%= version %> | (c) 2017 Zan Pan | MIT license */\n';

gulp.task('default', [
  'concat-js',
  'minify-js',
  'compile-docs',
  'watch'
]);

gulp.task('concat-js', function () {
  gulp.src([
      'src/js/core.js',
      'src/js/bar-chart.js',
      'src/js/pie-chart.js',
      'src/js/line-chart.js',
      'src/js/bubble-chart.js',
      'src/js/radar-chart.js',
      'src/js/sunburst-chart.js',
      'src/js/choropleth-map.js',
      'src/js/bubble-map.js',
      'src/js/contour-plot.js'
    ])
    .pipe(concat('d3-components-' + version + '.js'))
    .pipe(gulp.dest('dist/'))
    .pipe(gulp.dest('docs/dist/'));
});

gulp.task('minify-js', ['concat-js'], function () {
  gulp.src('dist/d3-components-' + version + '.js')
    .pipe(uglifyJS())
    .pipe(header(banner, {
      version : version
    }))
    .pipe(rename('d3-components-' + version + '.min.js'))
    .pipe(gulp.dest('dist/'))
    .pipe(gulp.dest('docs/dist/'));
});

gulp.task('compile-docs', function () {
  gulp.src('src/docs/!(layout|links).pug')
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('docs/'));

  gulp.src('src/docs/api/!(components).pug')
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('docs/api/'));
});

gulp.task('watch', function () {
  gulp.watch('src/js/*.js', [
    'concat-js',
    'minify-js'
  ]);

  gulp.watch('src/docs/{*,*/}*.pug', [
    'compile-docs'
  ]);
});

gulp.task('publish', function() {
  return gulp.src('./docs/**/*')
    .pipe(ghPages({
      branch: 'gh-pages',
      message: 'Update version ' + version
    }));
});
