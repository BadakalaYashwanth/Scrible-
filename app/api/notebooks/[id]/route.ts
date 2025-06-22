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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const notebook = notebookStore.getNotebook(params.id, userId)
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    return NextResponse.json({ notebook })
  } catch (error) {
    console.error("Failed to load notebook:", error)
    return NextResponse.json({ error: "Failed to load notebook" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const success = notebookStore.deleteNotebook(params.id, userId)

    if (!success) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notebook deletion error:", error)
    return NextResponse.json({ error: "Failed to delete notebook" }, { status: 500 })
  }
}
