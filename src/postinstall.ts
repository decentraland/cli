import { postInstall, cliInstalled } from './utils/analytics'
;(async function() {
  await postInstall()
  await cliInstalled()
})()
