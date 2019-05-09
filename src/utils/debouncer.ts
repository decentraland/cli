// Debouncer high order function
// taken from https://github.com/menduz/mzcore/blob/master/src/mz.ts

export type Debouncer<T extends CallableFunction> = T & {
  // Executes immediatly. Cancels the pending execution.
  now: T
  // Cancels the pending execution.
  cancel: () => void
}

export function debouncer<T extends CallableFunction>(fn: T, defTimeout: number): Debouncer<T> {
  let timer: any = null

  const ret: Debouncer<T> = (() => {
    timer && clearTimeout(timer)
    const a = arguments
    timer = setTimeout(function() {
      const f = fn as any
      f.apply(null, a)
      timer = null
    }, defTimeout)
    return timer
  }) as any

  ret.now = function() {
    timer && clearTimeout(timer)
    timer = null
    return (fn as any).apply(null, arguments)
  } as any

  ret.cancel = function() {
    timer && clearTimeout(timer)
    timer = null
  }

  return ret
}
