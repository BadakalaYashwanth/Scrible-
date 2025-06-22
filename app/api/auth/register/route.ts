import { NextResponse, type NextRequest } from "next/server"
import { users, type MockUser } from "@/lib/mock-users"
import { generateToken } from "@/lib/simple-token"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password || !name) return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })

    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (exists) return NextResponse.json({ error: "User already exists with this email" }, { status: 400 })

    const user: MockUser = {
      id: (users.length + 1).toString(),
      email: email.toLowerCase(),
      password, // plaintext – DEMO ONLY
      name: name.trim(),
      createdAt: new Date().toISOString(),
    }
    users.push(user)

    const token = generateToken(user.id)

    return NextResponse.json(
      { success: true, token, user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    )
  } catch (err: any) {
    console.error("Register error:", err)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
