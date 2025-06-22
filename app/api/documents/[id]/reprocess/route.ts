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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id
    let document: any = null

    // Find the document
    for (const notebook of notebooks) {
      const foundDoc = notebook.documents.find((doc) => doc.id === documentId)
      if (foundDoc) {
        document = foundDoc
        break
      }
    }

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Update processing status
    document.processingStatus = "processing"
    document.errorMessage = undefined

    // Simulate reprocessing
    setTimeout(() => {
      // Simulate success or failure
      const success = Math.random() > 0.2 // 80% success rate

      if (success) {
        document.processingStatus = "completed"
      } else {
        document.processingStatus = "failed"
        document.errorMessage = "Failed to extract text content. Please try uploading again."
      }
    }, 3000)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Document reprocessing error:", error)
    return NextResponse.json({ error: "Failed to reprocess document" }, { status: 500 })
  }
}
