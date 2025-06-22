import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual database in production
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

export async function GET() {
  // Update counts
  const updatedCollections = collections.map((collection) => ({
    ...collection,
    totalSources: collection.sources.length,
    readySources: collection.sources.filter((s) => s.processingStatus?.stage === "completed").length,
  }))

  return NextResponse.json({ collections: updatedCollections })
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const newCollection = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || "",
      sources: [],
      createdAt: new Date().toISOString().split("T")[0],
      totalSources: 0,
      readySources: 0,
    }

    collections.push(newCollection)

    return NextResponse.json({
      success: true,
      collection: newCollection,
    })
  } catch (error) {
    console.error("Collection creation error:", error)
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 })
  }
}
