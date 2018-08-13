export async function closeServer(ok, message): Promise<void> {
  await fetch(`/api/close?ok=${ok}&reason=${message}`)
}
