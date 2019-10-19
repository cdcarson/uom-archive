const bs = require("browser-sync").create();

bs.init({
  watch: true,
  server: {
    baseDir: './docs',
    directory: false
  }
});