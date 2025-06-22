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

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be")
}

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

async function extractYouTubeContent(
  url: string,
): Promise<{ title: string; content: string; preview: string; metadata: any }> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error("Invalid YouTube URL")
  }

  // Simulate YouTube transcript extraction
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const title = `AI and Machine Learning Explained - Complete Guide`
  const duration = "15:42"

  const content = `Transcript for YouTube video: ${title}
URL: ${url}
Duration: ${duration}

[00:00] Welcome to this comprehensive guide on artificial intelligence and machine learning. Today we'll explore the fundamental concepts that are shaping the future of technology.

[01:30] Let's start with the basics. Artificial intelligence is the simulation of human intelligence in machines that are programmed to think and learn like humans. Machine learning is a subset of AI that enables systems to automatically learn and improve from experience.

[03:15] There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data.

[05:45] Deep learning, a subset of machine learning, uses neural networks with multiple layers to model and understand complex patterns. These networks are inspired by the human brain and can process vast amounts of data.

[08:20] Computer vision is one of the most exciting applications of AI. It enables machines to interpret and understand visual information from the world, powering everything from autonomous vehicles to medical imaging.

[10:15] Natural language processing allows machines to understand, interpret, and generate human language. This technology powers chatbots, translation services, and voice assistants.

[12:30] The ethical implications of AI are crucial to consider. We must ensure that AI systems are fair, transparent, and beneficial to society while addressing concerns about privacy and job displacement.

[14:50] Looking ahead, AI will continue to transform industries and create new opportunities. The key is to develop AI responsibly and ensure it serves humanity's best interests.

This transcript provides comprehensive coverage of AI and ML concepts, making it valuable for research and analysis.`

  const preview =
    "Welcome to this comprehensive guide on artificial intelligence and machine learning. Today we'll explore the fundamental concepts..."

  const metadata = {
    url,
    videoId,
    title,
    duration,
    wordCount: content.split(/\s+/).length,
    language: "en",
    platform: "youtube",
    channel: "AI Education Channel",
  }

  return { title, content, preview, metadata }
}

async function extractWebContent(
  url: string,
): Promise<{ title: string; content: string; preview: string; metadata: any }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ScriblBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const domain = new URL(url).hostname

    // Simple HTML parsing simulation
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : `Article from ${domain}`

    // Simulate content extraction with readability
    const content = `Article: ${title}
Source: ${url}
Domain: ${domain}

This article explores the latest developments in artificial intelligence and their impact on various industries. The piece discusses how AI technologies are being integrated into business processes, healthcare systems, and educational platforms.

Key points covered in the article:

1. The rapid advancement of large language models and their applications in content generation, code writing, and problem-solving.

2. Computer vision technologies that are revolutionizing manufacturing, retail, and security industries through automated quality control and object recognition.

3. The role of AI in healthcare, including diagnostic imaging, drug discovery, and personalized treatment recommendations.

4. Ethical considerations surrounding AI deployment, including bias mitigation, privacy protection, and the need for transparent decision-making processes.

5. The economic implications of AI adoption, including job market changes, productivity improvements, and the emergence of new career opportunities.

6. Future trends in AI development, such as multimodal AI systems, edge computing integration, and the potential for artificial general intelligence.

The article concludes by emphasizing the importance of responsible AI development and the need for collaboration between technologists, policymakers, and society to ensure AI benefits everyone.

This comprehensive coverage makes the article a valuable resource for understanding current AI trends and their broader implications.`

    const preview = content.substring(0, 200) + "..."

    const metadata = {
      url,
      domain,
      title,
      wordCount: content.split(/\s+/).length,
      language: "en",
      extractedAt: new Date().toISOString(),
      author: "Editorial Team",
    }

    return { title, content, preview, metadata }
  } catch (error) {
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

async function processUrlInBackground(sourceId: string, content: string, userId: string) {
  const stages = [
    { stage: "extracting", message: "Extracting content...", progress: 25 },
    { stage: "chunking", message: "Processing content chunks...", progress: 50 },
    { stage: "embedding", message: "Generating semantic embeddings...", progress: 75 },
    { stage: "summarizing", message: "Creating AI summary...", progress: 90 },
    { stage: "completed", message: "Content ready for analysis!", progress: 100 },
  ]

  for (const stageInfo of stages) {
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000))

    const notebook = notebooks.find((n) => n.sources.some((s) => s.id === sourceId))
    if (notebook) {
      const source = notebook.sources.find((s) => s.id === sourceId)
      if (source) {
        source.processingStatus = stageInfo

        if (stageInfo.stage === "completed") {
          const isYouTube = source.type === "youtube"
          source.summary = `This ${isYouTube ? "YouTube video" : "web article"} contains ${content.split(" ").length} words covering artificial intelligence and machine learning topics. The content discusses ${isYouTube ? "key concepts through video explanation" : "current developments and industry applications"}. Key insights include advances in AI technologies, practical applications, and future implications for various industries.`
          source.keyPoints = isYouTube
            ? [
                "AI fundamentals explained",
                "Machine learning types",
                "Deep learning concepts",
                "Computer vision applications",
                "Natural language processing",
                "Ethical considerations",
              ]
            : [
                "Latest AI developments",
                "Industry applications",
                "Healthcare AI integration",
                "Economic implications",
                "Ethical considerations",
                "Future AI trends",
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
    const { url, notebookId } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Find notebook
    const notebook = notebooks.find((n) => n.id === notebookId && n.userId === userId)
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    if (!["http:", "https:"].includes(validUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP and HTTPS URLs are supported" }, { status: 400 })
    }

    // Determine if it's YouTube or regular website
    const isYouTube = isYouTubeUrl(url)
    const { title, content, preview, metadata } = isYouTube
      ? await extractYouTubeContent(url)
      : await extractWebContent(url)

    // Create source record
    const source = {
      id: Date.now().toString(),
      name: title,
      type: isYouTube ? "youtube" : "url",
      content,
      preview,
      uploadedAt: new Date().toISOString().split("T")[0],
      processingStatus: {
        stage: "extracting",
        progress: 15,
        message: `Extracting content from ${isYouTube ? "YouTube video" : "website"}...`,
      },
      metadata,
    }

    // Add to notebook
    notebook.sources.push(source)
    notebook.updatedAt = new Date().toISOString().split("T")[0]

    // Start background processing
    processUrlInBackground(source.id, content, userId)

    return NextResponse.json({
      success: true,
      source,
      message: `${isYouTube ? "YouTube video" : "Website"} content extraction started`,
    })
  } catch (error) {
    console.error("URL processing error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process URL",
      },
      { status: 500 },
    )
  }
}
