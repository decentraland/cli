export function getOrElse(value: any, def: any) {
  return value !== undefined ? value : def
}

/**
 * Returns an object with the specified attributes with null as value
 */
export function createEmptyObj(attributes: string[], obj: any = {}) {
  attributes.forEach(attr => {
    obj[attr] = null
  })
  return obj
}

/**
 * Filter undefined keys from provided object
 */
export function removeEmptyKeys(obj: any) {
  const result = {}
  Object.keys(obj)
    .filter(k => !!obj[k])
    .forEach(k => (result[k] = obj[k]))
  return result
}
