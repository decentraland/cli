import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { fork } from 'child_process'
import WebSocket from 'ws'
import { PreviewComponents } from '../Preview'

export function setupDebuggingAdapter(components: PreviewComponents, router: Router<any>) {
  router.get('/_scene/debug-adapter', async (ctx) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      return upgradeWebSocketResponse((ws: WebSocket) => {
        if (ws.protocol === 'dcl-scene') {
          const file = require.resolve('dcl-node-runtime')

          const theFork = fork(file, [], {
            // enable two way IPC
            stdio: [0, 1, 2, 'ipc'],
            cwd: process.cwd()
          })

          console.log(`> Creating scene fork #` + theFork.pid)

          theFork.on('close', () => {
            if (ws.readyState === ws.OPEN) {
              ws.close()
            }
          })
          theFork.on('message', (message) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(message)
            }
          })
          ws.on('message', (data) => theFork.send(data.toString()))
          ws.on('close', () => {
            console.log('> Killing fork #' + theFork.pid)
            theFork.kill()
          })
        } else ws.close()
      })
    }
    return { status: 201 }
  })
}
