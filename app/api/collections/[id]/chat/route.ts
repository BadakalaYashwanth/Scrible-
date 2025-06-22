import { type NextRequest, NextResponse } from "next/server"

// Mock chat history storage
const chatHistory: Record<string, any[]> = {}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const collectionId = params.id

  return NextResponse.json({
    messages: chatHistory[collectionId] || [],
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collectionId = params.id
    const { messages } = await request.json()

    chatHistory[collectionId] = messages

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save chat history" }, { status: 500 })
  }
}
