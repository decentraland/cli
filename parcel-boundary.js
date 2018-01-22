document.addEventListener('DOMContentLoaded', () => {
  const scene = window.scene;
  if (!scene) return;

  var oReq = new XMLHttpRequest();
  oReq.onload = injectBoundaries;
  oReq.open("get", "../scene.json", true);
  oReq.send();

  function injectBoundaries (e) {
    var sceneMetadata = JSON.parse(this.responseText);
    // Get the bounds of the parcel
    var parcels = sceneMetadata.scene.parcels.map(p => p.split(',')).map((p) => new THREE.Vector2(parseInt(p[0]), parseInt(p[1])))

    var boundsForOffset = new THREE.Box2().setFromPoints(parcels)
    // Offset so that the north-west most tile is at 0,0
    parcels.forEach((p) => p.sub(boundsForOffset.min))

    var bounds = new THREE.Box2().setFromPoints(parcels)

    // Create a 1 parcel buffer
    bounds.expandByScalar(1)

    function contains (v) {
      return !!(parcels.find((p) => p.equals(v)))
    }

    var geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01)

    function mergeBox (location, scale) {
      var mesh = new THREE.Mesh()
      mesh.position.copy(location)
      mesh.geometry = new THREE.BoxGeometry(scale.x, scale.y, scale.z)
      mesh.updateMatrix()
      geometry.merge(mesh.geometry, mesh.matrix)
    }

    var x, y

    var thickness = 0.2

    // Add x direction borders
    for (x = bounds.min.x; x < bounds.max.x + 1; x++) {
      for (y = bounds.min.y; y < bounds.max.y + 1; y++) {
        var p = new THREE.Vector2(x, y)

        var pAcross = p.clone()
        pAcross.x += 1

        var pAbove = p.clone()
        pAbove.y += 1

        // add border on right
        if (contains(p) && !contains(pAcross)) {
          mergeBox(new THREE.Vector3(p.x * 10 + 5, 0, p.y * 10), new THREE.Vector3(thickness, thickness, 10 + thickness))
        } else if (!contains(p) && contains(pAcross)) {
          mergeBox(new THREE.Vector3(p.x * 10 + 5, 0, p.y * 10), new THREE.Vector3(thickness, thickness, 10 + thickness))
        }

        // add border on bottom
        if (contains(p) && !contains(pAbove)) {
          mergeBox(new THREE.Vector3(p.x * 10, 0, p.y * 10 + 5), new THREE.Vector3(10 + thickness, thickness, thickness))
        } else if (!contains(p) && contains(pAbove)) {
          mergeBox(new THREE.Vector3(p.x * 10, 0, p.y * 10 + 5), new THREE.Vector3(10 + thickness, thickness, thickness))
        }
      }
    }

    var material = new THREE.MeshBasicMaterial( { color: '#ff00aa' } );
    var mesh = new THREE.Mesh( geometry, material );
    scene.add(mesh)
    return geometry
  }
});

