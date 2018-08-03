import * as DCL from 'decentraland-api'
import { setState, getState } from './State'

export default class HouseScene extends DCL.ScriptableScene {
  sceneDidMount() {
    this.eventSubscriber.on('door_click', () => {
      setState({ isDoorClosed: !getState().isDoorClosed })
    })
  }

  async render() {
    const doorRotation = {
      x: 0,
      y: getState().isDoorClosed ? 0 : 90,
      z: 0
    }

    return (
      <scene position={{ x: 5, y: 0, z: 5 }}>
        <entity rotation={doorRotation} transition={{ rotation: { duration: 1000, timing: 'ease-in' } }}>
          <box id="door" scale={{ x: 1, y: 2, z: 0.05 }} position={{ x: 0.5, y: 1, z: 0 }} color="#00FF00" />
        </entity>
        <box position={{ x: 2, y: 1, z: 0 }} scale={{ x: 2, y: 2, z: 0.05 }} color="#0000FF" />
        <box position={{ x: -1, y: 1, z: 0 }} scale={{ x: 2, y: 2, z: 0.05 }} color="#0000FF" />
      </scene>
    )
  }
}
