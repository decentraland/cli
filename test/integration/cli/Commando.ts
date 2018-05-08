import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

export interface IOptions {
  silent: boolean
}

export interface IMatcherOptions {
  matchMany: boolean
}

class Commando extends EventEmitter {
  private proc: ChildProcess
  private matchers: { pattern: RegExp; response: (mag: string) => string; options: IMatcherOptions }[] = []

  constructor(command: string, opts: IOptions = { silent: false }) {
    super()
    const parts = command.split(' ')
    this.proc = spawn(parts[0], parts.slice(1))

    if (!opts.silent) {
      this.proc.stdout.pipe(process.stdout)
    }

    this.proc.stdout.on('data', data => this.onData(data.toString()))
    this.proc.stderr.on('data', data => this.emit('err', data.toString()))
    this.proc.on('close', () => this.emit('end'))
  }

  when(pattern: string | RegExp, response: (msg: string) => string, options: IMatcherOptions = { matchMany: false }) {
    this.matchers.push({ pattern: new RegExp(pattern), response, options })
    return this
  }

  private onData(data: string) {
    this.matchers.some((match, i) => {
      if (data.match(match.pattern)) {
        const res = match.response(data)
        if (res) {
          this.proc.stdin.write(res)
        }
        if (!match.options.matchMany) {
          this.matchers.splice(i, 1)
        }
        return true
      }
    })
  }
}

export default Commando
