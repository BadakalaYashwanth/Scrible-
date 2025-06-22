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
    sources: [
      {
        id: "1",
        name: "AI Research Overview.pdf",
        type: "pdf",
        content:
          "Artificial Intelligence has revolutionized multiple domains including natural language processing, computer vision, and machine learning. Modern AI systems leverage deep learning architectures, particularly transformer models, to achieve human-level performance on various tasks.",
        processingStatus: { stage: "completed", progress: 100, message: "Ready" },
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

function performAdvancedSearch(
  query: string,
  sources: any[],
): Array<{
  sourceId: string
  sourceName: string
  sourceType: string
  relevance: number
  excerpt: string
  context: string
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
    context: string
  }> = []

  for (const source of sources) {
    if (source.processingStatus?.stage !== "completed" || !source.content) continue

    const content = source.content.toLowerCase()
    const sentences = source.content.split(/[.!?]+/).filter((s) => s.trim().length > 10)

    // Find matching sentences with context
    const matchingSentences = sentences
      .map((sentence, index) => ({
        sentence: sentence.trim(),
        index,
        score: 0,
      }))
      .filter(({ sentence }) => {
        const sentenceLower = sentence.toLowerCase()
        return queryWords.some((word) => sentenceLower.includes(word))
      })

    if (matchingSentences.length > 0) {
      // Calculate relevance scores
      let totalRelevance = 0
      let bestMatch = matchingSentences[0]
      let bestScore = 0

      for (const match of matchingSentences) {
        const sentenceLower = match.sentence.toLowerCase()
        let sentenceScore = 0

        for (const word of queryWords) {
          // Exact word boundary matches get higher score
          const exactMatches = (sentenceLower.match(new RegExp(`\\b${word}\\b`, "g")) || []).length
          sentenceScore += exactMatches * 3

          // Partial matches
          if (sentenceLower.includes(word)) {
            sentenceScore += 1
          }

          // Boost for longer, more specific words
          if (word.length > 5) {
            sentenceScore += exactMatches * 2
          }
        }

        match.score = sentenceScore
        totalRelevance += sentenceScore

        if (sentenceScore > bestScore) {
          bestScore = sentenceScore
          bestMatch = match
        }
      }

      // Create context from surrounding sentences
      const contextStart = Math.max(0, bestMatch.index - 1)
      const contextEnd = Math.min(sentences.length, bestMatch.index + 2)
      const context = sentences.slice(contextStart, contextEnd).join(". ").trim()

      // Normalize relevance
      const normalizedRelevance = Math.min(totalRelevance / (queryWords.length * 5), 1)

      results.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        relevance: normalizedRelevance,
        excerpt: bestMatch.sentence.length > 200 ? bestMatch.sentence.substring(0, 200) + "..." : bestMatch.sentence,
        context: context.length > 300 ? context.substring(0, 300) + "..." : context,
      })
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10)
}

export async function POST(request: NextRequest) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { query, notebookId } = await request.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Find the notebook
    const notebook = notebooks.find((n) => n.id === notebookId && n.userId === userId)
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    // Perform advanced semantic search
    const searchResults = performAdvancedSearch(query, notebook.sources)

    return NextResponse.json({
      results: searchResults,
      totalResults: searchResults.length,
      query: query.trim(),
      searchedSources: notebook.sources.filter((s) => s.processingStatus?.stage === "completed").length,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 })
  }
}
