# ✏️ Scrible — Your Smart AI Research Notebook

> **Tagline:** *Your smart AI research notebook, reimagined.*

Scrible is an AI-powered digital notebook that lets you upload, organize, and interact with your own knowledge sources — generating source-grounded summaries, Q&A answers, timelines, FAQs, and audio overviews in a “podcast” style, all from your own content.

---

## 🚀 Live Demo

👉 **Prototype:** [https://v0-scrible-prototype.vercel.app/](https://v0-scrible-prototype.vercel.app/)

---

## 🎯 Features

- ✅ **Multi-source Upload**: PDFs, Google Docs, text files, URLs, YouTube transcripts.
- ✅ **Source-Grounded Q&A**: Ask free-form questions and get answers with inline citations.
- ✅ **Automatic Summaries**: Generate executive summaries, bullet points, timelines, FAQs, comparison tables.
- ✅ **Audio Overviews**: Convert summaries into natural-sounding audio “podcasts.”
- ✅ **Notebook Organization**: Create folders, tags, and manage metadata for easy search.
- ✅ **Prompt Playground**: Experiment with custom instructions and prompt templates.
- ✅ **Collaboration & Sharing**: Share notebooks securely with view or edit access.
- ✅ **Multilingual Support**: Summaries and audio in multiple languages.
- ✅ **Usage Insights & Logs**: Revisit, refine, or download your results.
- ✅ **Privacy-First**: Secure storage, user content isolated per user.

---

## ⚙️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **LLM/RAG:** OpenAI, Gemini, or open-source LLMs with vector DB
- **Vector DB:** Pinecone, Weaviate, Qdrant, or Supabase Vector
- **Storage:** AWS S3 or Supabase Storage for user uploads
- **TTS:** ElevenLabs, Google TTS, or Coqui TTS for audio
- **Auth:** Supabase Auth, Firebase Auth, or Auth0
- **Deployment:** Vercel

---

## 🗂️ Project Structure

```plaintext
/ 📁 src
  ├── components/     # Reusable UI components
  ├── pages/          # Next.js routes
  ├── lib/            # LLM & vector DB logic
  ├── styles/         # Tailwind and custom CSS
  ├── hooks/          # Custom React hooks
  └── utils/          # File parsing, chunking, TTS
/ 📁 public
  └── assets/         # Logos, icons, audio previews

🚀 Getting Started Locally
1️⃣ Clone the repository
git clone https://github.com/your-username/scrible.git
cd scrible
2️⃣ Install dependencies
bash
Copy
Edit
npm install
# or
yarn install
3️⃣ Create a .env.local
Add your environment variables:

env
Copy
Edit
OPENAI_API_KEY=your_openai_api_key
VECTOR_DB_URL=your_vector_db_endpoint
STORAGE_BUCKET=your_bucket_url
4️⃣ Run the dev server
bash
Copy
Edit
npm run dev
# or
yarn dev
Visit http://localhost:3000

✅ Success Criteria
AI answers are always source-grounded with clear citations.

Audio overviews sound natural, multi-speaker optional.

UX is seamless: upload ➜ explore ➜ share.

User data stays private and secure.

Handles large projects (20–50 sources) reliably.

✨ Future Enhancements
Real-time co-editing of notebooks

Visual mind maps connecting ideas

Automatic glossary generation

Custom chatbot personas

Mobile app with offline audio playback

🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.
