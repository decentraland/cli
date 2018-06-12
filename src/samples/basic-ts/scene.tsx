import { createElement, ScriptableScene } from 'metaverse-api'

const networkHz = 6
const interval = 1000 / networkHz

export default class RollerCoaster extends ScriptableScene<any, { time: number }> {
  state = { time: 0 }

  timeout = setInterval(() => {
    this.setState({
      time: performance.now() * 0.0001
    })
  }, interval)

  sceneWillUnmount() {
    clearInterval(this.timeout)
  }

  async render() {
    const { time } = this.state

    const size = 2

    const x = Math.cos(time) * Math.cos(time) * size
    const y = Math.cos(time) * Math.sin(time) * size
    const z = Math.sin(time) * size

    return (
      <scene>
        <entity position={{ x: 5, y: 4, z: 5 }}>
          <entity
            id="train"
            position={{ x, y, z }}
            rotation={{ x: Math.cos(time) * 40, y: Math.sin(time) * 40, z: 0 }}
            transition={{
              position: { duration: interval },
              rotation: { duration: interval }
            }}
          >
            <box position={{ x: 0, y: -1, z: 0 }} color="#000000" scale={{ x: 3, y: 0.4, z: 5 }} />
            <box position={{ x: 1.5, y: 0, z: 0 }} color="#FF0000" scale={{ x: 0.2, y: 1, z: 5 }} />
            <box position={{ x: -1.5, y: 0, z: 0 }} color="#FFFF00" scale={{ x: 0.2, y: 1, z: 5 }} />

            <box position={{ x: 0, y: 0, z: 2.5 }} color="#00FF00" scale={{ x: 3, y: 1, z: 0.2 }} />
            <box position={{ x: 0, y: 0, z: -2.5 }} color="#0000FF" scale={{ x: 3, y: 1, z: 0.2 }} />
          </entity>
        </entity>
      </scene>
    )
  }
}
