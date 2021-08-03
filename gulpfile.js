const fs = require('fs')
const autoprefixer = require('autoprefixer')
const browserSync = require('browser-sync')
const del = require('del')
const gulp = require('gulp')
const mqpacker = require('mqpacker')
const noop = require('gulp-noop')
const notify = require('gulp-notify')
const plumber = require('gulp-plumber')
const postcss = require('gulp-postcss')
const pug = require('gulp-pug')
const rename = require('gulp-rename')
const sourcemaps = require('gulp-sourcemaps')
const sass = require('gulp-sass')(require('sass'))

const isDevelopment = process.env.NODE_ENV === 'development' ? true : false
const isProduction = process.env.NODE_ENV === 'production' ? true : false

const ROOT = ''
const SRC = 'src/'
const ASSETS = `assets/`
const PUG = [`${SRC}pages/**/*.pug`, `!${SRC}pages/_*.pug`]
const SASS = `${SRC}${ASSETS}sass/`
const DIST = 'dist'
const CSS = `${DIST}${ROOT}/${ASSETS}css/`

gulp.task('pug', done => {
  gulp
    .src(PUG)
    .pipe(
      plumber({ errorHandler: notify.onError('Error: <%= error.message %>') })
    )
    .pipe(
      pug({
        pretty: true,
        basedir: SRC,
        locals: {
          ROOT: ROOT,
          _JSON: {
            meta: JSON.parse(fs.readFileSync(`${SRC}json/meta.json`, 'utf-8') || 'null')
          },
          TIMESTAMP: Date.now()
        }
      })
    )
    .pipe(
      rename(path => {
        if (path.basename !== 'index') {
          path.dirname += `/${path.basename}`
          path.basename = 'index'
        }
      })
    )
    .pipe(gulp.dest(`${DIST}${ROOT}/`))
  done()
})

gulp.task('sass', done => {
  gulp
    .src([`${SASS}**/*.sass`, `!${SASS}**/_*.sass`])
    .pipe(
      plumber({ errorHandler: notify.onError('Error: <%= error.message %>') })
    )
    .pipe(sourcemaps.init())
    .pipe(sass({ compress: false }))
    .pipe(
      postcss([
        autoprefixer(),
        mqpacker()
      ])
    )
    .pipe(isDevelopment ? sourcemaps.write('.') : noop())
    .pipe(gulp.dest(CSS))
  done()
})

gulp.task('copy', done => {
  gulp
    .src([`${SRC}static/**/*`], { base: SRC })
    .pipe(rename(path => {
      let dirname = ''
      dirname = path.dirname.replace(/^static/g, '')
      dirname = dirname.replace(/^\//g, '')
      path.dirname = dirname
    }))
    .pipe(gulp.dest(`${DIST}${ROOT}/`))
  gulp
    .src(
      [`${SRC}${ASSETS}**/*`, `!${SASS}**`],
      { base: SRC }
    )
    .pipe(gulp.dest(`${DIST}${ROOT}/`))
  done()
})

gulp.task('clean', () => {
  return del(DIST)
})

gulp.task('browser-sync', done => {
  browserSync.init({
    port: 8080,
    server: {
      root: ROOT,
      baseDir: DIST,
      notify: true
    }
  })
  done()
})

gulp.task('watch', done => {
  gulp.watch([`${SRC}**/*.pug`, `${SRC}**/*.json`], gulp.task('pug'))
  gulp.watch([`${SASS}**/*.sass`], gulp.task('sass'))
  gulp.watch([`${SRC}${ASSETS}**/*`, `!${SASS}**`], gulp.task('copy'))
  gulp.watch([`${SRC}static/**/*`], gulp.task('copy'))
  done()
})

gulp.task(
  'default',
  gulp.series(
    'clean',
    'copy',
    gulp.parallel('pug', 'sass'),
    'watch',
    'browser-sync'
  )
)

gulp.task(
  'build',
  gulp.series(
    'clean',
    'copy',
    gulp.parallel('pug', 'sass'))
)

