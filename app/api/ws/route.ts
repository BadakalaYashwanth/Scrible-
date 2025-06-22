import type { NextRequest } from "next/server"
import { addClient } from "@/lib/ws"
import { WebSocketServer } from "ws"

export const runtime = "node"

// A singleton WebSocketServer – keep it on the global scope
const wss: WebSocketServer =
  // @ts-expect-error – attach once
  globalThis.__SCRIBLE_WSS__ ??
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (globalThis.__SCRIBLE_WSS__ = new WebSocketServer({ noServer: true }))

export async function GET(req: NextRequest) {
  const { socket, headers } = (req as any).node
  // Only upgrade requests that ask for websocket
  if (headers.get("upgrade") !== "websocket") {
    return new Response("Upgrade Required", { status: 426 })
  }

  // Upgrade the connection
  return new Promise((resolve) => {
    wss.handleUpgrade(socket, req.headers, (ws) => {
      addClient(ws)
      ws.send(JSON.stringify({ type: "hello", message: "🧠 Scrible WebSocket connected" }))
    })

    // Handshake successful – the response is left to the ws lib
    resolve(new Response(null, { status: 101 }))
  })
}
