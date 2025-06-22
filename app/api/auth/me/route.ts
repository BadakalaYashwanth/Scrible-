import { NextResponse, type NextRequest } from "next/server"
import { users } from "@/lib/mock-users"
import { parseUserId } from "@/lib/simple-token"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    const userId = parseUserId(token)

    if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

    const user = users.find((u) => u.id === userId)
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (err: any) {
    console.error("Auth/me error:", err)
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 })
  }
}
