import { NextResponse, type NextRequest } from "next/server"
import { parseUserId } from "@/lib/simple-token"
import { notebookStore } from "@/lib/notebook-store"

function getUserFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null

    const token = authHeader.substring(7)
    return parseUserId(token)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const userNotebooks = notebookStore.getUserNotebooks(userId)
    return NextResponse.json({ notebooks: userNotebooks })
  } catch (error) {
    console.error("Failed to load notebooks:", error)
    return NextResponse.json({ error: "Failed to load notebooks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const notebook = notebookStore.createNotebook(userId, name.trim(), description?.trim() || "")
    return NextResponse.json({ success: true, notebook })
  } catch (error) {
    console.error("Notebook creation error:", error)
    return NextResponse.json({ error: "Failed to create notebook" }, { status: 500 })
  }
}
