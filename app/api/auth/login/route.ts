import { NextResponse, type NextRequest } from "next/server"
import { users } from "@/lib/mock-users"
import { generateToken } from "@/lib/simple-token"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 })

    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user || user.password !== password)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })

    const token = generateToken(user.id)

    return NextResponse.json(
      { success: true, token, user: { id: user.id, email: user.email, name: user.name } },
      { status: 200 },
    )
  } catch (err: any) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
