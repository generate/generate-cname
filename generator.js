'use strict';

var isValid = require('is-valid-app');
var prompt = require('helper-prompt');
var Confirm = require('prompt-confirm');

module.exports = function(app) {
  // return if already registered
  if (!isValid(app, 'generate-cname')) return;

  /**
   * Register template engine and prompt helper.
   * Set the engine as the default.
   */

  app.engine('hbs', require('engine-handlebars'));
  app.asyncHelper('prompt', prompt({
    enquirer: app.options.enquirer,
    save: false
  }));

  /**
   * Generates a `CNAME` file to the current working directory or
   * specified `--dest`.
   *
   * ```sh
   * $ gen cname
   * $ gen cname --dest ./foo
   * ```
   * @name cname
   * @api public
   */

  app.task('default', ['cname']);
  app.task('cname', function(cb) {
    return app.src('templates/_CNAME', { cwd: __dirname })
      .pipe(app.conflicts(app.cwd))
      .pipe(app.renderFile('hbs'))
      .pipe(app.dest(function(file) {
        file.basename = 'CNAME';
        return app.cwd;
      }))
  });

  /**
   * Prompt the user to generate a CNAME file.
   *
   * ```sh
   * $ gen cname:prompt
   * $ gen cname:prompt-cname # alias for plugin usage
   * ```
   * @name prompt
   * @api public
   */

  app.task('prompt', ['prompt-cname']);
  app.task('prompt-cname', function(cb) {
    return new Confirm('Want to generate a CNAME file?')
      .run().then(function(cname) {
        app.build(cname ? 'cname' : 'noop', cb);
      })
  });

  app.task('noop', {silent: true}, function(cb) {
    cb();
  });
};
