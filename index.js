var through = require('through2')
var tapout = require('tap-out')
var duplexer = require('duplexer')
var symbols = require('figures')
var chalk = require('chalk')
var yaml = require('js-yaml')

var s = {
  err: chalk.red,
  test: chalk.blue,
  ok: chalk.green,
  heading: chalk.reset,
  mute: chalk.gray,
  raw: chalk.gray,
  trace: chalk.gray
}

function tapSpec (options) {
  if (!options) options = {}
  var out = through()
  var tap = tapout()
  var stream = duplexer(tap, out)

  if (!options.min) {
    tap.on('test', function (t) {
      out.push('\n' + '  ' + s.heading(t.name) + '\n')
    })
  }

  tap.on('fail', function (t) {
    stream.failed = true
  })

  tap.on('comment', function (t) {
    out.push('  ' + s.raw(t.raw) + '\n')
  })

  if (!options.min) {
    tap.on('fail', function (t) {
      out.push('  ' + s.err(symbols.cross) + ' ' + s.err(t.name) + '\n')
    })

    tap.on('pass', function (t) {
      out.push('  ' + s.ok(symbols.tick) + ' ' + s.test(t.name) + '\n')
    })
  }

  tap.on('output', function (results) {
    if (results.plans.length < 1) {
      stream.failed = true
    }

    if (results.fail.length > 0) {
      stream.failed = true
    }

    if (!options.min) out.push('\n')

    if (results.fail.length > 0) {
      if (!options.min) {
        out.push('  ' + s.err(Array(columns() - 3).join(symbols.line)) + '\n')
      }

      results.fail.forEach(function (t) {
        out.push('\n  ' + s.err(symbols.cross) + ' ' + s.err(t.name) + '\n')
        out.push(formatErr(t.error))
      })

      out.push('\n')

      if (!options.min) {
        out.push('  ' + s.err(Array(process.stdout.columns - 3).join(symbols.line)) + '\n')
      }

      out.push('  ' +
        s.err(symbols.cross) + ' ' +
        s.err(results.fail.length + ' failed') + ' ' +
        s.mute(results.pass.length + ' passed') +
        '\n')
    } else {
      if (options.min) out.push('\n')
      out.push('  ' + s.ok(results.pass.length + ' passed '+ symbols.tick) + '\n')
    }
  })

  return stream
}

function formatErr (error) {
  // 'test exited without ending'
  if (!error.at || !error.at.file) { return '' }

  var err = yaml.safeLoad(error.raw)

  var out = ''
  out += '    ' +
    s.trace(relative(error.at.file) +
    ':' + error.at.line +
    ':' + error.at.character + ':')

  if ((~['equal', 'deepEqual', 'deepLooseEqual'].indexOf(err.operator)) ||
    (err.operator === 'throws' && err.expected)) {
    out += ' ' + s.trace(err.operator) + '\n'
    out += '    ' + s.err('- ') + err.expected.replace(/\n/g, '\n      ') + '\n'
    out += '    ' + s.ok('+ ') + err.actual.replace(/\n/g, '\n      ') + '\n'
  } else if (~['notEqual', 'notDeepEqual', 'notDeepLooseEqual'].indexOf(err.operator)) {
    out += ' ' + s.trace(err.operator) + '\n'
    out += '    ' + s.ok('> ') + err.actual.replace(/\n/g, '\n      ') + '\n'
  } else {
    out += ' ' + s.trace(err.operator) + '\n'
  }
  if (error.stack) {
    // TODO: clean stack trace
    out += '    ' + s.trace(error.stack.replace(/\n/g, '\n      '))
  }

  return out
}

function relative (path) {
  return path.replace(process.cwd() + require('path').sep, '')
}

function columns () {
  return process.stdout.columns || 30
}

module.exports = tapSpec
