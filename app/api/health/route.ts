import { NextResponse } from "next/server"
import { notebookStore } from "@/lib/notebook-store"

export async function GET() {
  try {
    // Test notebook store
    const testNotebooks = notebookStore.getUserNotebooks("1")

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        auth: "operational",
        notebooks: testNotebooks ? "operational" : "degraded",
        sources: "operational",
        chat: "operational",
      },
      debug: {
        notebookCount: testNotebooks.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
