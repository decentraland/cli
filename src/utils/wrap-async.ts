export function wrapAsync(
  fn: (args: any, callback: () => void) => Promise<void>
): (this: any, args: any, callback: () => void) => void {
  return function(args, cb) {
    fn
      .call(this, args, cb)
      .then(() => cb())
      .catch((err: Error) => {
        this.log(err.message);
        cb();
      });
  };
}
