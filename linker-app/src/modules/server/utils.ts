export type Network = {
  id: number
  name: string
  label?: string
}

export type LinkerResponse = {
  address: string
  signature: string
  network: Network
}

export async function closeServer(ok, message: LinkerResponse): Promise<void> {
  await fetch(`/api/close?ok=${ok}&reason=${JSON.stringify(message)}`)
}
