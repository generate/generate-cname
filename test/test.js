'use strict';

var isTravis = process.env.CI || process.env.TRAVIS;
require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var generate = require('generate');
var Enquirer = require('enquirer');
var npm = require('npm-install-global');
var del = require('delete');
var generator = require('..');
var pkg = require('../package');
var unmute;
var app;

var fixtures = path.resolve.bind(path, __dirname, 'fixtures');
var actual = path.resolve.bind(path, __dirname, 'actual');

function exists(name, re, cb) {
  if (typeof re === 'function') {
    cb = re;
    re = new RegExp(/./);
  }

  return function(err) {
    if (err) return cb(err);
    var filepath = actual(name);
    fs.stat(filepath, function(err, stat) {
      if (err) return cb(err);
      assert(stat);
      var str = fs.readFileSync(filepath, 'utf8');
      assert(re.test(str));
      del(actual(), cb);
    });
  };
}

describe('generate-cname', function() {
  if (!process.env.CI && !process.env.TRAVIS) {
    before(function(cb) {
      npm.maybeInstall('generate', cb);
    });
  }

  beforeEach(function(cb) {
    app = generate({silent: true});
    app.cwd = actual();
    app.option('dest', actual());

    var enquirer = new Enquirer();
    enquirer.on('prompt', function(prompt) {
      unmute = prompt.mute();

      prompt.on('ask', function() {
        prompt.rl.emit('line', 'https://foo.com');
      });
    });

    app.option('enquirer', enquirer);
    app.use(generator);
    del(actual(), cb);
  });

  afterEach(function(cb) {
    unmute();
    del(actual(), cb);
  });

  describe('tasks', function() {
    it('should run the `default` task with .build', function(cb) {
      app.build('default', exists('CNAME', cb));
    });

    it('should run the `default` task with .generate', function(cb) {
      app.generate('default', exists('CNAME', cb));
    });
  });

  describe('generator (CLI)', function() {
    it('should run the default task using the `generate-cname` name', function(cb) {
      if (isTravis) {
        this.skip();
        return;
      }
      app.generate('generate-cname', exists('CNAME', cb));
    });

    it('should run the default task using the `generator` generator alias', function(cb) {
      if (isTravis) {
        this.skip();
        return;
      }
      app.generate('cname', exists('CNAME', cb));
    });
  });

  describe('generator (API)', function() {
    it('should run the default task on the generator', function(cb) {
      app.register('cname', generator);
      app.generate('cname', exists('CNAME', cb));
    });

    it('should run the `cname` task', function(cb) {
      app.register('cname', generator);
      app.generate('cname:cname', exists('CNAME', cb));
    });

    it('should run the `default` task when defined explicitly', function(cb) {
      app.register('cname', generator);
      app.generate('cname:default', exists('CNAME', cb));
    });
  });

  describe('sub-generator', function() {
    it('should work as a sub-generator', function(cb) {
      app.register('foo', function(foo) {
        foo.register('cname', generator);
      });
      app.generate('foo.cname', exists('CNAME', cb));
    });

    it('should run the `default` task by default', function(cb) {
      app.register('foo', function(foo) {
        foo.register('cname', generator);
      });
      app.generate('foo.cname', exists('CNAME', cb));
    });

    it('should run the `cname:default` task when defined explicitly', function(cb) {
      app.register('foo', function(foo) {
        foo.register('cname', generator);
      });
      app.generate('foo.cname:default', exists('CNAME', cb));
    });

    it('should run the `cname:cname` task', function(cb) {
      app.register('foo', function(foo) {
        foo.register('cname', generator);
      });
      app.generate('foo.cname:cname', exists('CNAME', cb));
    });

    it('should work with nested sub-generators', function(cb) {
      app
        .register('foo', generator)
        .register('bar', generator)
        .register('baz', generator);
      app.generate('foo.bar.baz', exists('CNAME', cb));
    });
  });
});
