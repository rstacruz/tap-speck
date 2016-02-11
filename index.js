var through = require('through2')
var tapout = require('tap-out')
var duplexer = require('duplexer')
var symbols = require('figures')
var chalk = require('chalk')

var s = {
  err: chalk.red,
  mute: chalk.reset,
  ok: chalk.green,
  heading: chalk.underline
}

function tapSpec (spec, options) {
  var out = through()
  var tap = tapout()
  var stream = duplexer(tap, out)

  tap.on('test', function (t) {
    out.push('\n' + '  ' + s.heading(t.name) + '\n')
  })

  tap.on('fail', function (t) {
    out.push('  ' + s.err(symbols.cross) + ' ' + s.err(t.name) + '\n')
    tapSpec.failed = true
  })

  tap.on('comment', function (t) {
    out.push('  ' + t.raw + '\n')
  })

  tap.on('pass', function (t) {
    out.push('  ' + s.ok(symbols.tick) + ' ' + s.mute(t.name) + '\n')
  })

  tap.on('output', function (results) {
    if (results.plans.length < 1) {
      tapSpec.failed = true
    }

    if (results.fail.length > 0) {
      tapSpec.failed = true
    }

    out.push('\n  ' +
      results.pass.length + ' pass, ' +
      results.fail.length + ' failed\n')
  })

  return stream
}

module.exports = tapSpec
