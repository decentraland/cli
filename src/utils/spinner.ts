import * as ora from 'ora'

let spinner

export function create(message: string) {
  if (spinner) {
    spinner.succeed()
  }

  spinner = ora(message).start()
}

export function fail(message?: string) {
  if (spinner) {
    spinner.fail(message)
  }
}

export function succeed(message?: string) {
  if (spinner) {
    spinner.succeed(message)
  }
}
