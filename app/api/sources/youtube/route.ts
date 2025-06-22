import { type NextRequest, NextResponse } from "next/server"

// Mock collections storage
const collections = [
  {
    id: "1",
    name: "Research Papers",
    description: "Academic papers and research documents",
    sources: [],
    createdAt: "2024-01-10",
    totalSources: 0,
    readySources: 0,
  },
  {
    id: "2",
    name: "Project Documentation",
    description: "Technical documentation and project resources",
    sources: [],
    createdAt: "2024-01-08",
    totalSources: 0,
    readySources: 0,
  },
]

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

async function getYouTubeTranscript(
  videoId: string,
  url: string,
): Promise<{ title: string; transcript: string; metadata: any }> {
  // In production, use:
  // - youtube-transcript-api for transcript extraction
  // - YouTube Data API v3 for video metadata
  // - yt-dlp for comprehensive video information
  // - AssemblyAI or similar for audio transcription if no captions

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Simulate video metadata extraction
  const title = `YouTube Video: Advanced AI Concepts - ${videoId}`
  const duration = "15:42"
  const channelName = "AI Education Channel"

  // Simulate transcript extraction
  const transcript = `Transcript for YouTube video: ${videoId}\nURL: ${url}\nTitle: ${title}\nDuration: ${duration}\nChannel: ${channelName}\n\nThis is a simulated transcript extraction. In a real implementation, you would use:\n\n1. **YouTube Transcript API**: For extracting official captions/subtitles\n2. **YouTube Data API v3**: For video metadata, descriptions, and comments\n3. **yt-dlp**: For comprehensive video information extraction\n4. **Speech-to-Text APIs**: For videos without captions (AssemblyAI, Google Speech-to-Text, etc.)\n\nThe transcript would include:\n- Timestamped text segments for precise referencing\n- Speaker identification when available\n- Proper punctuation and formatting\n- Multiple language support\n- Confidence scores for transcribed text\n- Chapter markers and key moments\n\nTimestamped content example:\n[00:00] Welcome to today's discussion on artificial intelligence\n[00:15] We'll be covering machine learning fundamentals\n[01:30] Deep learning architectures and their applications\n[03:45] Natural language processing techniques\n[07:20] Computer vision and image recognition\n[10:15] Ethical considerations in AI development\n[12:30] Future trends and emerging technologies\n[14:50] Conclusion and key takeaways\n\nThis transcript content is then processed for semantic search, allowing users to find specific moments in the video and ask questions about the content discussed.`

  const metadata = {
    videoId,
    url,
    title,
    duration,
    channelName,
    wordCount: transcript.split(/\s+/).length,
    language: "en",
    extractedAt: new Date().toISOString(),
    platform: "youtube",
  }

  return { title, transcript, metadata }
}

async function processYouTubeInBackground(sourceId: string, content: string) {
  const stages = [
    { stage: "extracting", message: "Extracting video transcript...", progress: 20 },
    { stage: "chunking", message: "Processing transcript segments...", progress: 40 },
    { stage: "embedding", message: "Creating semantic embeddings...", progress: 70 },
    { stage: "indexing", message: "Building searchable index...", progress: 90 },
    { stage: "completed", message: "Video transcript ready!", progress: 100 },
  ]

  for (const stageInfo of stages) {
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1500))

    const collection = collections.find((c) => c.sources.some((s) => s.id === sourceId))
    if (collection) {
      const source = collection.sources.find((s) => s.id === sourceId)
      if (source) {
        source.processingStatus = stageInfo

        if (stageInfo.stage === "completed") {
          source.summary = `YouTube video transcript from ${source.metadata?.channelName || "channel"} (${source.metadata?.duration || "unknown duration"}). Contains ${content.split(" ").length} words of video content processed for AI analysis.`
          source.keyPoints = [
            "Video content overview",
            "Key discussion points",
            "Important timestamps",
            "Main concepts covered",
          ]
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, collectionId } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
    }

    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID is required" }, { status: 400 })
    }

    // Find collection
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL format" }, { status: 400 })
    }

    // Get transcript and metadata
    const { title, transcript, metadata } = await getYouTubeTranscript(videoId, url)

    // Create source record
    const source = {
      id: Date.now().toString(),
      name: title,
      type: "youtube" as const,
      content: transcript,
      uploadedAt: new Date().toISOString().split("T")[0],
      processingStatus: {
        stage: "extracting",
        progress: 10,
        message: "Extracting YouTube transcript...",
      },
      metadata,
    }

    // Add to collection
    collection.sources.push(source)

    // Start background processing
    processYouTubeInBackground(source.id, transcript)

    return NextResponse.json({
      success: true,
      source,
      message: "YouTube video processing started",
    })
  } catch (error) {
    console.error("YouTube processing error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process YouTube video",
      },
      { status: 500 },
    )
  }
}
