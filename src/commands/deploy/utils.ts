import { LinkerResponse } from '@dcl/linker-dapp/types/modules/server/utils'
import chalk from 'chalk'
import opn from 'opn'
import { Decentraland } from '../../lib/Decentraland'
import { ErrorType, fail } from '../../utils/errors'

import * as spinner from '../../utils/spinner'

export function failWithSpinner(message: string, error?: any): void {
  spinner.fail(message)
  fail(ErrorType.DEPLOY_ERROR, error)
}

export function deployLinkerReady(
  dcl: Decentraland,
  onSuccess: (response: LinkerResponse) => void
) {
  dcl.on('link:ready', (url) => {
    console.log(
      chalk.bold('You need to sign the content before the deployment:')
    )
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(() => {
      try {
        // tslint:disable-next-line: no-floating-promises
        void opn(url)
      } catch (e) {
        console.log(`Unable to open browser automatically`)
      }
    }, 5000)

    dcl.on('link:success', (response: LinkerResponse) => {
      onSuccess(response)
    })
  })
}
