import * as ora from 'ora'

let spinner

export function create(message: string) {
  if (!process.stdout.isTTY) {
    return console.log(message)
  }

  if (spinner) {
    spinner.succeed()
  }

  spinner = ora(message).start()
}

export function fail(message?: string) {
  if (!process.stdout.isTTY && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.fail(message)
  }
}

export function succeed(message?: string) {
  if (!process.stdout.isTTY && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.succeed(message)
    spinner = null
  }
}
