const gulp = require('gulp');


gulp.task('html',  () => {
  delete require.cache[require.resolve('./build')]
  const build = require('./build');
  return build();
});

gulp.task('css', () => {
  const sass = require('gulp-sass');
  sass.compiler = require('node-sass');
  const cleanCSS = require('gulp-clean-css');
  const autoprefixer = require('gulp-autoprefixer');
  return gulp.src('./src/assets/scss/style.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dst/assets/css'))
})

gulp.task('img', () => {
  
  return gulp.src('./src/assets/img/**')
    .pipe(gulp.dest('./dst/assets/img/'));
})

gulp.task('watch', gulp.series('img', 'css', 'html', () => {
  gulp.watch('./build.js', gulp.series('html'));
  gulp.watch('./src/html/**/*.twig', gulp.series('html'));
  gulp.watch('./src/assets/scss/**/*.scss', gulp.series('css'));
  gulp.watch('./src/assets/img/**', gulp.series('img'));
}));


