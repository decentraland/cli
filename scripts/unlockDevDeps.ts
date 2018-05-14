import fs = require('fs')

/**
 * Removed all dev dependencies from the package-lock.json
 * This is needed because there is no mainstream way of achieving this.
 * Otherwise, you'd need to prune your dev deps, but they are needed for the publiosh script.
 * This is meant to run right before `npm shrinkwrap`.
 */
export function unlockDevDependencies() {
  const lockFile = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
  const unlockedDeps = Object.keys(lockFile.dependencies).reduce((deps, key) => {
    const dep = lockFile.dependencies[key]
    if (dep.dev === true) {
      return deps
    }
    return { ...deps, [key]: dep }
  }, {})
  lockFile.dependencies = unlockedDeps
  fs.writeFileSync('package-lock.json', JSON.stringify(lockFile, null, 4))
}

unlockDevDependencies()
