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

async function extractContentFromUrl(url: string): Promise<{ title: string; content: string }> {
  try {
    // In a real implementation, you would use libraries like:
    // - puppeteer for dynamic content
    // - cheerio for HTML parsing
    // - readability for article extraction

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ScriblBot/1.0)",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Simple HTML parsing simulation
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname

    // Simulate content extraction
    const content = `Content extracted from: ${url}\n\nTitle: ${title}\n\nThis is simulated content extraction from the webpage. In a real implementation, you would use libraries like Puppeteer, Cheerio, or Mozilla's Readability to extract the main content from the webpage, removing navigation, ads, and other non-essential elements.\n\nThe extracted content would include the main article text, headings, and other relevant information from the page.`

    return { title, content }
  } catch (error) {
    throw new Error(`Failed to fetch content from URL: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, notebookId } = await request.json()

    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!notebookId) {
      return NextResponse.json({ error: "Notebook ID is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Extract content from URL
    const { title, content } = await extractContentFromUrl(url)

    // Create document record
    const document = {
      id: Date.now().toString(),
      name: title,
      type: "url" as const,
      content,
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
          body: JSON.stringify({ documentId: document.id, content }),
        })
      } catch (error) {
        console.error("Failed to process embeddings:", error)
      }
    }, 1000)

    return NextResponse.json({
      success: true,
      document,
      message: "URL content extracted successfully",
    })
  } catch (error) {
    console.error("URL upload error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process URL",
      },
      { status: 500 },
    )
  }
}
