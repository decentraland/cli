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
export function removeEmptyKeys(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  Object.keys(obj)
    .filter(k => !!obj[k])
    .forEach(k => (result[k] = obj[k]))
  return result
}

export function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && !Array.isArray(obj) && !!obj
}
