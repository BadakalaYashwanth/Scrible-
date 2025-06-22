/**
 * Centralized notebook storage for development
 * In production, this would be replaced with a real database
 */

interface Notebook {
  id: string
  userId: string
  name: string
  description: string
  sources: any[]
  createdAt: string
  updatedAt: string
  totalSources: number
  readySources: number
  overallSummary?: string
  keyInsights?: string[]
}

class NotebookStore {
  private notebooks = new Map<string, Notebook>()
  private nextId = 1

  constructor() {
    // Initialize with demo data for the simple token system
    // User ID "1" corresponds to the demo user from simple-token system
    this.notebooks.set("1", {
      id: "1",
      userId: "1", // This matches the user ID from the simple token system
      name: "AI Research",
      description: "Papers and articles about artificial intelligence",
      sources: [],
      createdAt: "2024-01-10",
      updatedAt: "2024-01-10",
      totalSources: 0,
      readySources: 0,
    })

    this.notebooks.set("2", {
      id: "2",
      userId: "1", // Same user
      name: "Project Documentation",
      description: "Technical documentation and requirements",
      sources: [],
      createdAt: "2024-01-08",
      updatedAt: "2024-01-08",
      totalSources: 0,
      readySources: 0,
    })
  }

  createNotebook(userId: string, name: string, description: string): Notebook {
    const id = (this.nextId++).toString()
    const notebook: Notebook = {
      id,
      userId,
      name,
      description,
      sources: [],
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      totalSources: 0,
      readySources: 0,
    }

    this.notebooks.set(id, notebook)
    return notebook
  }

  getUserNotebooks(userId: string): Notebook[] {
    return Array.from(this.notebooks.values())
      .filter((notebook) => notebook.userId === userId)
      .map((notebook) => ({
        ...notebook,
        totalSources: notebook.sources.length,
        readySources: notebook.sources.filter((s) => s.processingStatus?.stage === "completed").length,
      }))
  }

  getNotebook(id: string, userId: string): Notebook | null {
    const notebook = this.notebooks.get(id)
    if (!notebook || notebook.userId !== userId) {
      return null
    }
    return {
      ...notebook,
      totalSources: notebook.sources.length,
      readySources: notebook.sources.filter((s) => s.processingStatus?.stage === "completed").length,
    }
  }

  updateNotebook(id: string, userId: string, updates: Partial<Notebook>): boolean {
    const notebook = this.notebooks.get(id)
    if (!notebook || notebook.userId !== userId) {
      return false
    }

    const updatedNotebook = {
      ...notebook,
      ...updates,
      updatedAt: new Date().toISOString().split("T")[0],
    }

    this.notebooks.set(id, updatedNotebook)
    return true
  }

  deleteNotebook(id: string, userId: string): boolean {
    const notebook = this.notebooks.get(id)
    if (!notebook || notebook.userId !== userId) {
      return false
    }

    return this.notebooks.delete(id)
  }

  addSourceToNotebook(notebookId: string, userId: string, source: any): boolean {
    const notebook = this.notebooks.get(notebookId)
    if (!notebook || notebook.userId !== userId) {
      return false
    }

    notebook.sources.push(source)
    notebook.updatedAt = new Date().toISOString().split("T")[0]
    return true
  }
}

// Export singleton instance
export const notebookStore = new NotebookStore()
