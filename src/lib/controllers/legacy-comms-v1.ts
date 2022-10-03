import { Router } from '@well-known-components/http-server'
import WebSocket from 'ws'
import { PreviewComponents } from '../Preview'
import proto from '../adapters/proto/broker'

// Handles Comms V1
export function setupCommsV1(
  _components: PreviewComponents,
  _router: Router<any>
) {
  const connections = new Set<WebSocket>()
  const topicsPerConnection = new WeakMap<WebSocket, Set<string>>()
  let connectionCounter = 0

  const aliasToUserId = new Map<number, string>()

  function getTopicList(socket: WebSocket): Set<string> {
    let set = topicsPerConnection.get(socket)
    if (!set) {
      set = new Set()
      topicsPerConnection.set(socket, set)
    }
    return set
  }

  return {
    adoptWebSocket(ws: WebSocket, userId: string) {
      const alias = ++connectionCounter

      aliasToUserId.set(alias, userId)

      console.log('Acquiring comms connection.')

      connections.add(ws)

      ws.on('message', (message) => {
        const data = message as Buffer
        const msgType =
          proto.CoordinatorMessage.deserializeBinary(data).getType()

        if (msgType === proto.MessageType.PING) {
          ws.send(data)
        } else if (msgType === proto.MessageType.TOPIC) {
          const topicMessage = proto.TopicMessage.deserializeBinary(data)

          const topic = topicMessage.getTopic()

          const topicFwMessage = new proto.TopicFWMessage()
          topicFwMessage.setType(proto.MessageType.TOPIC_FW)
          topicFwMessage.setFromAlias(alias)
          topicFwMessage.setBody(topicMessage.getBody_asU8())

          const topicData = topicFwMessage.serializeBinary()

          // Reliable/unreliable data
          connections.forEach(($) => {
            if (ws !== $) {
              if (getTopicList($).has(topic)) {
                $.send(topicData)
              }
            }
          })
        } else if (msgType === proto.MessageType.TOPIC_IDENTITY) {
          const topicMessage =
            proto.TopicIdentityMessage.deserializeBinary(data)

          const topic = topicMessage.getTopic()

          const topicFwMessage = new proto.TopicIdentityFWMessage()
          topicFwMessage.setType(proto.MessageType.TOPIC_IDENTITY_FW)
          topicFwMessage.setFromAlias(alias)
          topicFwMessage.setIdentity(aliasToUserId.get(alias)!)
          topicFwMessage.setRole(proto.Role.CLIENT)
          topicFwMessage.setBody(topicMessage.getBody_asU8())

          const topicData = topicFwMessage.serializeBinary()

          // Reliable/unreliable data
          connections.forEach(($) => {
            if (ws !== $) {
              if (getTopicList($).has(topic)) {
                $.send(topicData)
              }
            }
          })
        } else if (msgType === proto.MessageType.SUBSCRIPTION) {
          const topicMessage = proto.SubscriptionMessage.deserializeBinary(data)
          const rawTopics = topicMessage.getTopics()
          const topics = Buffer.from(rawTopics as string).toString('utf8')
          const set = getTopicList(ws)

          set.clear()
          topics.split(/\s+/g).forEach(($) => set.add($))
        }
      })

      ws.on('close', () => connections.delete(ws))

      setTimeout(() => {
        const welcome = new proto.WelcomeMessage()
        welcome.setType(proto.MessageType.WELCOME)
        welcome.setAlias(alias)
        const data = welcome.serializeBinary()

        ws.send(data, (err) => {
          if (err) {
            try {
              ws.close()
            } catch {}
          }
        })
      }, 100)
    }
  }
}
