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

async function extractTextFromPDF(file: File): Promise<{ content: string; preview: string; metadata: any }> {
  // Simulate PDF extraction - in production use pdf-parse or similar
  const content = `Extracted content from PDF: ${file.name}

This document discusses artificial intelligence and machine learning technologies. The paper explores various aspects of neural networks, deep learning architectures, and their applications in computer vision and natural language processing.

Key topics covered include:
- Transformer architectures and attention mechanisms
- Convolutional neural networks for image recognition
- Recurrent neural networks for sequence modeling
- Training methodologies and optimization techniques
- Ethical considerations in AI development
- Future directions and emerging trends

The research presents experimental results showing significant improvements in model performance across multiple benchmarks. The authors conclude that these advances represent important steps toward more capable and reliable AI systems.

This content demonstrates the kind of technical information that would be extracted from an actual research paper, providing rich material for analysis and question answering.`

  const preview = content.substring(0, 200) + "..."

  const metadata = {
    wordCount: content.split(/\s+/).length,
    pageCount: Math.floor(Math.random() * 20) + 1,
    language: "en",
    title: file.name.replace(".pdf", ""),
    author: "Research Team",
  }

  return { content, preview, metadata }
}

async function processSourceInBackground(sourceId: string, content: string, userId: string) {
  const stages = [
    { stage: "extracting", message: "Extracting text content...", progress: 20 },
    { stage: "chunking", message: "Breaking into semantic chunks...", progress: 40 },
    { stage: "embedding", message: "Generating embeddings...", progress: 60 },
    { stage: "summarizing", message: "Creating AI summary...", progress: 80 },
    { stage: "completed", message: "Processing complete!", progress: 100 },
  ]

  for (const stageInfo of stages) {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2000))

    // Update source status
    const notebook = notebooks.find((n) => n.sources.some((s) => s.id === sourceId))
    if (notebook) {
      const source = notebook.sources.find((s) => s.id === sourceId)
      if (source) {
        source.processingStatus = stageInfo

        // Generate summary and key points when completed
        if (stageInfo.stage === "completed") {
          source.summary = `This PDF document contains ${content.split(" ").length} words covering key topics in artificial intelligence and machine learning. The content discusses neural networks, deep learning architectures, and their applications. Key findings include advances in transformer models, improvements in training methodologies, and ethical considerations for AI development.`
          source.keyPoints = [
            "Neural network architectures",
            "Deep learning applications",
            "Training methodologies",
            "Ethical AI considerations",
            "Performance improvements",
            "Future research directions",
          ]
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

    // Find notebook
    const notebook = notebooks.find((n) => n.id === notebookId && n.userId === userId)
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 })
    }

    // Validate file type (PDF only)
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 })
    }

    // Extract content
    const { content, preview, metadata } = await extractTextFromPDF(file)

    // Create source record
    const source = {
      id: Date.now().toString(),
      name: file.name,
      type: "pdf",
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      content,
      preview,
      uploadedAt: new Date().toISOString().split("T")[0],
      processingStatus: {
        stage: "uploading",
        progress: 10,
        message: "File uploaded, starting processing...",
      },
      metadata,
    }

    // Add to notebook
    notebook.sources.push(source)
    notebook.updatedAt = new Date().toISOString().split("T")[0]

    // Start background processing
    processSourceInBackground(source.id, content, userId)

    return NextResponse.json({
      success: true,
      source,
      message: "PDF uploaded successfully, processing started",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 },
    )
  }
}
