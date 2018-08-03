import * as DCL from 'decentraland-api'

export default class SampleScene extends DCL.ScriptableScene {
  async render() {
    return (
      <scene>
        <box position={{ x: 5, y: 0.5, z: 5 }} rotation={{ x: 0, y: 45, z: 0 }} color="#4CC3D9" />
        <sphere position={{ x: 6, y: 1.25, z: 4 }} color="#EF2D5E" />
        <cylinder position={{ x: 7, y: 0.75, z: 3 }} radius={0.5} scale={{ x: 0, y: 1.5, z: 0 }} color="#FFC65D" />
        <plane position={{ x: 5, y: 0, z: 6 }} rotation={{ x: -90, y: 0, z: 0 }} scale={4} color="#7BC8A4" />
      </scene>
    )
  }
}
