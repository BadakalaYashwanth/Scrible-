import { NextResponse, type NextRequest } from "next/server"
import { parseUserId } from "@/lib/simple-token"
import { users } from "@/lib/mock-users"
import { notebookStore } from "@/lib/notebook-store"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  const userId = parseUserId(token)

  const debugInfo = {
    timestamp: new Date().toISOString(),
    auth: {
      hasAuthHeader: !!authHeader,
      tokenPreview: token ? token.substring(0, 20) + "..." : null,
      parsedUserId: userId,
      userExists: userId ? users.some((u) => u.id === userId) : false,
    },
    users: users.map((u) => ({ id: u.id, email: u.email, name: u.name })),
    notebooks: userId ? notebookStore.getUserNotebooks(userId) : [],
  }

  return NextResponse.json(debugInfo)
}
