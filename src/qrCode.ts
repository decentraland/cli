import * as qrcode from 'qrcode-terminal'

export function showQR(data: string): Promise<void> {
  return new Promise(resolve => {
    qrcode.generate(data, { small: true }, qr => {
      console.log(qr)
      resolve()
    })
  })
}
