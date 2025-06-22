import { type NextRequest, NextResponse } from "next/server"

// Mock document storage
const documents: any[] = []
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

async function extractTextFromFile(file: File): Promise<string> {
  // Simulate text extraction - in real app, use libraries like pdf-parse, mammoth, etc.
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".txt")) {
    return await file.text()
  } else if (fileName.endsWith(".pdf")) {
    // Simulate PDF text extraction
    return `Extracted text from PDF: ${file.name}\n\nThis is simulated content from a PDF document. In a real implementation, you would use a library like pdf-parse to extract actual text content from the PDF file. The content would include all the text, paragraphs, and readable content from the document.`
  } else if (fileName.endsWith(".docx")) {
    // Simulate DOCX text extraction
    return `Extracted text from DOCX: ${file.name}\n\nThis is simulated content from a Word document. In a real implementation, you would use a library like mammoth to extract actual text content from the DOCX file. The content would preserve the document structure and formatting.`
  }

  return "Unable to extract text from this file type."
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const notebookId = formData.get("notebookId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|docx|txt)$/)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." },
        { status: 400 },
      )
    }

    // Extract text content
    const content = await extractTextFromFile(file)

    // Create document record
    const document = {
      id: Date.now().toString(),
      name: file.name,
      type: file.name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : file.name.toLowerCase().endsWith(".docx")
          ? "docx"
          : "txt",
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      content,
      uploadedAt: new Date().toISOString().split("T")[0],
      processingStatus: "completed" as const,
      notebookId,
    }

    // Add to documents array
    documents.push(document)

    // Update notebook
    const notebook = notebooks.find((n) => n.id === notebookId)
    if (notebook) {
      notebook.documents.push(document)
    }

    // Simulate vector embedding process
    setTimeout(async () => {
      try {
        await fetch("/api/embeddings/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id, content }),
        })
      } catch (error) {
        console.error("Failed to process embeddings:", error)
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      document,
      message: "Document uploaded and processed successfully",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
