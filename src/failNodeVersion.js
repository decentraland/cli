const minNodeVersionDev = 16;
const nodeVersion = process.versions.node;
if (nodeVersion) {
  const majorVersion = parseInt(nodeVersion.split(".")[0]);
  if (majorVersion < minNodeVersionDev) {
    console.error(
      `Error: Decentraland CLI is developed over node version ${minNodeVersionDev} or greater, current is ${majorVersion}.\n`
    );
    process.exit(1);
  }
}
