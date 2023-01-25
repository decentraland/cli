import { handleSocketLinearProtocol } from '@dcl/mini-comms/dist/logic/handle-linear-protocol'
import { PreviewComponents } from '../Preview'
import { AboutResponse } from '@dcl/protocol/out-ts/bff/http-endpoints.gen'
import { WebSocket } from 'ws'
import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'

/**
 * This module handles the BFF mock and communications server for the preview mode.
 * It runs using @dcl/mini-comms implementing RFC-5
 */

export async function setupBffAndComms(
  components: PreviewComponents,
  router: Router<PreviewComponents>
) {
  router.get('/about', async (ctx) => {
    const host = ctx.url.host

    const body: AboutResponse = {
      bff: { healthy: false },
      comms: {
        healthy: true,
        protocol: 'v3',
        fixedAdapter: `ws-room:${ctx.url.protocol.replace(
          /^http/,
          'ws'
        )}//${host}/mini-comms/room-1`
      },
      configurations: {
        realmName: 'LocalPreview'
      },
      content: {
        healthy: true,
        publicUrl: `${ctx.url.protocol}//${ctx.url.host}/content`
      },
      lambdas: {
        healthy: true,
        publicUrl: `${ctx.url.protocol}//${ctx.url.host}/lambdas`
      },
      healthy: true
    }

    return { body }
  })

  router.get('/mini-comms/:roomId', async (ctx) => {
    return upgradeWebSocketResponse((ws: WebSocket) => {
      if (ws.protocol === 'rfc5' || ws.protocol === 'rfc4') {
        ws.on('error', (error) => {
          console.error(error)
          ws.close()
        })

        ws.on('close', () => {
          console.debug('Websocket closed')
        })

        handleSocketLinearProtocol(components, ws, ctx.params.roomId).catch(
          (err) => {
            console.info(err)
            ws.close()
          }
        )
      }
    })
  })
}
