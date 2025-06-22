import { NextResponse, type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Mock storage
const notebooks: Array<{
  id: string
  userId: string
  name: string
  description: string
  sources: any[]
  createdAt: string
  updatedAt: string
}> = [
  {
    id: "1",
    userId: "1",
    name: "AI Research",
    description: "Papers and articles about artificial intelligence",
    sources: [],
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
]

function getUserFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sourceId = params.id
    let sourceFound = false

    // Remove source from user's notebooks
    for (const notebook of notebooks.filter((n) => n.userId === userId)) {
      const initialLength = notebook.sources.length
      notebook.sources = notebook.sources.filter((source) => source.id !== sourceId)
      if (notebook.sources.length < initialLength) {
        sourceFound = true
        notebook.updatedAt = new Date().toISOString().split("T")[0]
      }
    }

    if (!sourceFound) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Source deletion error:", error)
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 })
  }
}
