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
  var failures = []
  var lastTest

  if (!options.min) {
    tap.on('test', function (t) {
      out.push('\n' + '  ' + s.heading(t.name) + '\n')
    })
  }
  tap.on('test', function (t) {
    lastTest = t
  })

  tap.on('fail', function (t) {
    failures.push({ test: lastTest, assertion: t })
    stream.failed = true
  })

  tap.on('comment', function (t) {
    out.push('  ' + s.raw(t.raw) + '\n')
  })

  if (!options.min) {
    tap.on('fail', function (t) {
      out.push('  ' + s.err(symbols.cross) + ' ' + s.test(t.name) +
        ' ' + s.err(symbols.arrowRight + ' not ' + t.error.operator) + '\n')
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

    out.push('\n')

    if (failures.length > 0) {
      out.push('  ' + chalk.bold('Failures:') + '\n')

      failures.forEach(function (fail) {
        var test = fail.test
        var t = fail.assertion
        out.push('\n  ' + s.err(symbols.cross) + ' ' +
          s.err(test.name) + ' ' + s.mute(symbols.arrowRight) + ' ' +
          s.err(t.name) + '\n')
        try {
          out.push(formatErr(t.error))
        } catch (e) {
          console.log(e)
        }
      })

      out.push('\n')

      out.push('  ' +
        s.mute(results.fail.length + ' failed,') + ' ' +
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

  var in1 = '  '
  var in2 = '    '
  var in3 = '      '
  var inE = in2 + s.err('- ') // Expected
  var inA = in2 + s.ok('+ ') // Actual
  var out = ''
  out += in2 +
    s.trace(relative(error.at.file) +
    ':' + error.at.line +
    ':' + error.at.character + ':')

  if ((~['equal', 'deepEqual', 'deepLooseEqual'].indexOf(err.operator)) ||
    (err.operator === 'throws' && err.expected)) {
    out += ' ' + s.trace(err.operator) + '\n'
    out += inE + str(err.expected).replace(/\n/g, '\n' + inE) + '\n'
    out += inA + str(err.actual).replace(/\n/g, '\n' + inA) + '\n'
  } else if (~['notEqual', 'notDeepEqual', 'notDeepLooseEqual'].indexOf(err.operator)) {
    out += ' ' + s.trace(err.operator) + '\n'
    out += inA + str(err.actual).replace(/\n/g, '\n' + inA) + '\n'
  } else {
    out += in1 + s.trace(err.operator) + '\n'
  }
  if (error.stack) {
    // TODO: clean stack trace
    out += in2 + s.trace(error.stack.replace(/\n/g, '\n' + in3))
  }

  return out
}

function relative (path) {
  return path.replace(process.cwd() + require('path').sep, '')
}

function str (object) {
  if (typeof object === 'string') return object
  return require('util').inspect(object, { depth: null })
}

module.exports = tapSpec
