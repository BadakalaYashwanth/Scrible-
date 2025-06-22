import { type NextRequest, NextResponse } from "next/server"

// Mock storage
const notebooks = [
  {
    id: "1",
    name: "AI Research",
    description: "Papers and articles about artificial intelligence",
    documents: [],
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    name: "Project Documentation",
    description: "Technical documentation and requirements",
    documents: [],
    createdAt: "2024-01-08",
  },
]

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id
    let documentFound = false

    // Remove document from all notebooks
    for (const notebook of notebooks) {
      const initialLength = notebook.documents.length
      notebook.documents = notebook.documents.filter((doc) => doc.id !== documentId)
      if (notebook.documents.length < initialLength) {
        documentFound = true
      }
    }

    if (!documentFound) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document deletion error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
