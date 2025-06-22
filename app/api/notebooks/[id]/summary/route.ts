import { NextResponse, type NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Mock notebook storage
const notebooks: Array<{
  id: string
  userId: string
  name: string
  description: string
  sources: any[]
  createdAt: string
  updatedAt: string
  overallSummary?: string
  keyInsights?: string[]
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const notebookId = params.id
    const notebook = notebooks.find((n) => n.id === notebookId && n.userId === userId)

    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 })
    }

    const readySources = notebook.sources.filter((s) => s.processingStatus?.stage === "completed")
    if (readySources.length === 0) {
      return NextResponse.json({ error: "No ready sources to summarize" }, { status: 400 })
    }

    // Combine all source content
    const combinedContent = readySources
      .map((source) => `${source.name}:\n${source.content || source.summary || "No content available"}`)
      .join("\n\n---\n\n")

    let overallSummary = ""
    let keyInsights: string[] = []

    if (OPENAI_API_KEY) {
      try {
        // Generate overall summary
        const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert research assistant. Provide a comprehensive summary of the provided sources, highlighting key themes, findings, and connections between the materials.",
              },
              {
                role: "user",
                content: `Please provide a comprehensive summary of these research sources:\n\n${combinedContent.substring(0, 8000)}`,
              },
            ],
            max_tokens: 800,
            temperature: 0.3,
          }),
        })

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          overallSummary = summaryData.choices?.[0]?.message?.content || ""
        }

        // Generate key insights
        const insightsResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert research assistant. Extract 4-6 key insights from the provided sources. Each insight should be a concise, actionable finding or important theme.",
              },
              {
                role: "user",
                content: `Please extract key insights from these research sources:\n\n${combinedContent.substring(0, 8000)}`,
              },
            ],
            max_tokens: 400,
            temperature: 0.3,
          }),
        })

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json()
          const insightsText = insightsData.choices?.[0]?.message?.content || ""
          keyInsights = insightsText
            .split("\n")
            .filter((line) => line.trim() && (line.includes("•") || line.includes("-") || line.match(/^\d+\./)))
            .map((line) => line.replace(/^[•\-\d.]\s*/, "").trim())
            .filter((insight) => insight.length > 10)
            .slice(0, 6)
        }
      } catch (error) {
        console.error("OpenAI API error:", error)
      }
    }

    // Fallback if OpenAI fails
    if (!overallSummary) {
      overallSummary = `This notebook contains ${readySources.length} sources covering various topics. The sources include ${readySources.map((s) => s.type).join(", ")} materials with a total of ${readySources.reduce((acc, s) => acc + (s.metadata?.wordCount || 0), 0).toLocaleString()} words of content.`
    }

    if (keyInsights.length === 0) {
      keyInsights = [
        "Multiple sources provide comprehensive coverage of the topic",
        "Content spans different formats and perspectives",
        "Rich material available for detailed analysis",
        "Sources complement each other with varied insights",
      ]
    }

    // Update notebook
    notebook.overallSummary = overallSummary
    notebook.keyInsights = keyInsights
    notebook.updatedAt = new Date().toISOString().split("T")[0]

    return NextResponse.json({
      success: true,
      summary: overallSummary,
      insights: keyInsights,
    })
  } catch (error) {
    console.error("Summary generation error:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
