export interface MockUser {
  id: string
  email: string
  password: string // ⚠︎ plain text – DEMO ONLY. Replace with hashed passwords in production.
  name: string
  createdAt: string
}

export const users: MockUser[] = [
  {
    id: "1", // This matches the notebook store user ID
    email: "demo@scrible.ai",
    password: "password123",
    name: "Demo User",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
]
