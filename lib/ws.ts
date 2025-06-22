import type { WebSocket } from "ws"

const clients = new Set<WebSocket>()

export function addClient(ws: WebSocket) {
  clients.add(ws)
  ws.on("close", () => clients.delete(ws))
}

export function broadcast(data: unknown) {
  const payload = JSON.stringify(data)
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload)
    }
  }
}
