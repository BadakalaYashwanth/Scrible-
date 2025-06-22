import { NextResponse, type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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
    sources: [
      {
        id: "1",
        name: "AI Research Overview.pdf",
        type: "pdf",
        content:
          "Artificial Intelligence has revolutionized multiple domains including natural language processing, computer vision, and machine learning. Modern AI systems leverage deep learning architectures, particularly transformer models, to achieve human-level performance on various tasks. Key developments include GPT models for text generation, BERT for language understanding, and diffusion models for image generation.",
        processingStatus: { stage: "completed", progress: 100, message: "Ready" },
        metadata: { wordCount: 150 },
      },
    ],
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

// Enhanced semantic search with better relevance scoring
function findRelevantContent(
  query: string,
  sources: any[],
): Array<{
  sourceId: string
  sourceName: string
  sourceType: string
  relevance: number
  excerpt: string
  pageNumber?: number
  timestamp?: string
}> {
  const queryWords = query
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 2)
    .map((word) => word.replace(/[^\w]/g, ""))

  const results: Array<{
    sourceId: string
    sourceName: string
    sourceType: string
    relevance: number
    excerpt: string
    pageNumber?: number
    timestamp?: string
  }> = []

  for (const source of sources) {
    if (source.processingStatus?.stage !== "completed" || !source.content) continue

    const content = source.content.toLowerCase()
    const sentences = source.content.split(/[.!?]+/).filter((s) => s.trim().length > 20)

    let totalRelevance = 0
    let bestSentence = ""
    let bestScore = 0

    // Score each sentence
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase()
      let sentenceScore = 0

      for (const word of queryWords) {
        // Exact word matches
        const exactMatches = (sentenceLower.match(new RegExp(`\\b${word}\\b`, "g")) || []).length
        sentenceScore += exactMatches * 3

        // Partial matches
        if (sentenceLower.includes(word)) {
          sentenceScore += 1
        }

        // Boost for longer query words
        if (word.length > 5) {
          sentenceScore += exactMatches * 2
        }
      }

      totalRelevance += sentenceScore
      if (sentenceScore > bestScore) {
        bestScore = sentenceScore
        bestSentence = sentence.trim()
      }
    }

    if (totalRelevance > 0) {
      // Normalize relevance score
      const normalizedRelevance = Math.min(totalRelevance / (queryWords.length * 5), 1)

      results.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        relevance: normalizedRelevance,
        excerpt: bestSentence.length > 200 ? bestSentence.substring(0, 200) + "..." : bestSentence,
        ...(source.type === "youtube" && { timestamp: "02:15" }),
        ...(source.type === "pdf" && { pageNumber: Math.floor(Math.random() * 10) + 1 }),
      })
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
}

function buildFallbackAnswer(question: string, sources: any[], relevantSources: any[]): string {
  if (!sources.length) {
    return `I don't have any sources in this notebook to answer "${question}". Please add some documents, websites, or YouTube videos first.`
  }

  if (!relevantSources.length) {
    return `I couldn't find specific information about "${question}" in your ${sources.length} sources. Try rephrasing your question or adding more relevant content to your notebook.`
  }

  const sourceList = relevantSources
    .map((s, i) => `${i + 1}. ${s.sourceName} (${Math.round(s.relevance * 100)}% match): "${s.excerpt}"`)
    .join("\n")

  return `Based on your sources, here's what I found related to "${question}":\n\n${sourceList}\n\nFor more detailed analysis, please ensure you have a valid OpenAI API key configured.`
}

export async function POST(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { message, notebookId, chatHistory } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Find the notebook
    const notebook = notebooks.find((n) => n.id === notebookId && n.userId === userId)
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    // Find relevant content using enhanced semantic search
    const relevantSources = findRelevantContent(message, notebook.sources)

    let response = ""

    // Try OpenAI if API key is available
    if (OPENAI_API_KEY && relevantSources.length > 0) {
      try {
        // Prepare context from relevant sources
        const context = relevantSources
          .map(
            (source, idx) =>
              `Source ${idx + 1}: "${source.sourceName}" (${source.sourceType.toUpperCase()})\n` +
              `Relevance: ${Math.round(source.relevance * 100)}%\n` +
              `Content: ${source.excerpt}\n`,
          )
          .join("\n")

        // Prepare chat history for context
        const recentHistory = (chatHistory || [])
          .slice(-6)
          .map((msg: any) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")

        const systemPrompt = `You are Scrible, an AI research assistant that helps users understand and analyze their uploaded documents, websites, and YouTube videos.

Your capabilities:
- Analyze content across multiple source types (PDFs, websites, YouTube transcripts)
- Provide accurate answers grounded in the user's sources
- Synthesize information from multiple sources
- Cite specific sources when referencing information
- Maintain conversation context

Current notebook: "${notebook.name}" - ${notebook.description}
Available sources: ${notebook.sources.filter((s) => s.processingStatus?.stage === "completed").length} ready sources

Context from relevant sources:
${context}

Recent conversation:
${recentHistory}

Guidelines:
- Always ground your answers in the provided sources
- Cite sources when referencing specific information
- If information isn't in the sources, clearly state that
- Synthesize information across multiple sources when relevant
- Be conversational but precise
- Use the source names and types when citing

User question: "${message}"`

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        })

        if (openaiResponse.ok) {
          const data = await openaiResponse.json()
          response = data.choices?.[0]?.message?.content || ""
        } else {
          throw new Error("OpenAI API error")
        }
      } catch (error) {
        console.error("OpenAI error:", error)
        response = buildFallbackAnswer(message, notebook.sources, relevantSources)
      }
    } else {
      response = buildFallbackAnswer(message, notebook.sources, relevantSources)
    }

    return NextResponse.json({
      response,
      sources: relevantSources,
    })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
