/**
 * Gulpfile for d3-components
 */

var gulp = require('gulp');
var header = require('gulp-header');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var uglifyJS = require('gulp-uglify');
var pug = require('gulp-pug');

var pkg = require('./package.json');
var version = pkg.version;
var banner = '/*! D3 Components v<%= version %> | (c) 2016 Zan Pan | MIT license */\n';

gulp.task('default', [
  'jshint',
  'concat-js',
  'minify-js',
  'compile-docs',
  'watch'
]);

gulp.task('jshint', function () {
  gulp.src([
      'src/js/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('concat-js', function () {
  gulp.src([
      'src/js/bar-chart.js',
      'src/js/bubble-chart.js',
      'src/js/pie-chart.js',
    ])
    .pipe(concat('d3-components-' + version + '.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('minify-js', ['concat-js'], function () {
  gulp.src('dist/d3-components-' + version + '.js')
    .pipe(uglifyJS())
    .pipe(header(banner, {
      version : version
    }))
    .pipe(rename('d3-components-' + version + '.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('compile-docs', function () {
  gulp.src('src/docs/!(layout|links).pug')
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('docs/'));
});

gulp.task('watch', function () {
  gulp.watch('src/js/*.js', [
    'jshint',
    'concat-js',
    'minify-js'
  ]);

  gulp.watch('src/docs/{*,*/}*.pug', [
    'compile-docs'
  ]);
});
