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

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

async function getYouTubeTranscript(videoId: string): Promise<{ title: string; transcript: string }> {
  // In a real implementation, you would use:
  // - youtube-transcript-api
  // - YouTube Data API v3
  // - Or other YouTube transcript extraction libraries

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Simulate transcript extraction
  const title = `YouTube Video ${videoId}`
  const transcript = `Transcript for YouTube video: ${videoId}\n\nThis is a simulated transcript extraction. In a real implementation, you would use libraries like youtube-transcript-api or the YouTube Data API to extract the actual transcript/captions from the video.\n\nThe transcript would include:\n- Timestamped text segments\n- Speaker identification (if available)\n- Proper formatting and punctuation\n- Multiple language support\n\nThis content would then be processed and made searchable within your document collection.`

  return { title, transcript }
}

export async function POST(request: NextRequest) {
  try {
    const { url, notebookId } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL format" }, { status: 400 })
    }

    // Get transcript
    const { title, transcript } = await getYouTubeTranscript(videoId)

    // Create document record
    const document = {
      id: Date.now().toString(),
      name: title,
      type: "youtube" as const,
      content: transcript,
      uploadedAt: new Date().toISOString().split("T")[0],
      processingStatus: "completed" as const,
      notebookId,
    }

    // Update notebook
    const notebook = notebooks.find((n) => n.id === notebookId)
    if (notebook) {
      notebook.documents.push(document)
    }

    // Process embeddings in background
    setTimeout(async () => {
      try {
        await fetch("/api/embeddings/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id, content: transcript }),
        })
      } catch (error) {
        console.error("Failed to process embeddings:", error)
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      document,
      message: "YouTube transcript extracted successfully",
    })
  } catch (error) {
    console.error("YouTube upload error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process YouTube video",
      },
      { status: 500 },
    )
  }
}
