export type LinkerResponse = {
  address: string
  signature: string
  network: string
}

export async function closeServer(ok, message: LinkerResponse): Promise<void> {
  await fetch(`/api/close?ok=${ok}&reason=${JSON.stringify(message)}`)
}
