import { postInstall, cliInstalled } from './utils/analytics'

;(async function() {
  await postInstall()
  await cliInstalled()
})().catch(e => {
  // tslint:disable-next-line:no-console
  console.error(e)
})
