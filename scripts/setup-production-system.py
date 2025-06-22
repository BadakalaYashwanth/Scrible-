"""
Production setup script for Scrible - NotebookLM Clone
Sets up vector database, document processing, and AI pipeline
"""

import os
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import PyPDF2
import requests
from bs4 import BeautifulSoup
import youtube_dl
import openai

class ScriblProductionSystem:
    def __init__(self, openai_api_key: str = None, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the Scrible production system"""
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.index = None
        self.document_store = {}
        self.chunk_metadata = []
        
        # OpenAI setup
        if openai_api_key:
            openai.api_key = openai_api_key
        
        # Create necessary directories
        os.makedirs("data/documents", exist_ok=True)
        os.makedirs("data/embeddings", exist_ok=True)
        os.makedirs("data/processed", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        
        print("🚀 Scrible Production System Initialized")
        print(f"📊 Model: {model_name}")
        print(f"🔢 Embedding dimension: {self.dimension}")
    
    def create_optimized_index(self) -> faiss.Index:
        """Create production-optimized FAISS index"""
        # Use HNSW for better performance with large datasets
        index = faiss.IndexHNSWFlat(self.dimension, 32)
        index.hnsw.efConstruction = 200
        index.hnsw.efSearch = 100
        
        # Wrap with IndexIDMap for custom document IDs
        index = faiss.IndexIDMap(index)
        
        print("🚀 Created optimized FAISS HNSW index")
        return index
    
    def intelligent_chunking(self, text: str, chunk_size: int = 512, overlap: int = 64) -> List[Dict[str, Any]]:
        """Advanced text chunking with semantic awareness"""
        # Split by sentences to maintain semantic coherence
        sentences = text.replace('\n', ' ').split('. ')
        chunks = []
        current_chunk = ""
        current_sentences = []
        
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check if adding this sentence exceeds chunk size
            test_chunk = current_chunk + ". " + sentence if current_chunk else sentence
            
            if len(test_chunk) > chunk_size and current_chunk:
                # Finalize current chunk
                chunk_info = {
                    "text": current_chunk.strip(),
                    "sentence_count": len(current_sentences),
                    "char_count": len(current_chunk),
                    "start_sentence": current_sentences[0] if current_sentences else "",
                    "end_sentence": current_sentences[-1] if current_sentences else "",
                }
                chunks.append(chunk_info)
                
                # Start new chunk with overlap
                overlap_sentences = current_sentences[-overlap//50:] if len(current_sentences) > overlap//50 else []
                current_chunk = ". ".join(overlap_sentences)
                current_sentences = overlap_sentences.copy()
                
            current_chunk = test_chunk
            current_sentences.append(sentence)
        
        # Add final chunk
        if current_chunk.strip():
            chunk_info = {
                "text": current_chunk.strip(),
                "sentence_count": len(current_sentences),
                "char_count": len(current_chunk),
                "start_sentence": current_sentences[0] if current_sentences else "",
                "end_sentence": current_sentences[-1] if current_sentences else "",
            }
            chunks.append(chunk_info)
        
        return chunks
    
    def extract_pdf_content(self, pdf_path: str) -> Dict[str, Any]:
        """Extract text content from PDF using PyPDF2"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page_num, page in enumerate(pdf_reader.pages):
                    text += page.extract_text() + "\n"
                
                metadata = {
                    "page_count": len(pdf_reader.pages),
                    "word_count": len(text.split()),
                    "char_count": len(text),
                    "language": "en",  # Could be detected
                    "extraction_method": "PyPDF2"
                }
                
                return {
                    "content": text.strip(),
                    "metadata": metadata,
                    "success": True
                }
        except Exception as e:
            return {
                "content": "",
                "metadata": {},
                "success": False,
                "error": str(e)
            }
    
    def extract_web_content(self, url: str) -> Dict[str, Any]:
        """Extract content from web pages using BeautifulSoup"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; ScriblBot/1.0)'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No title"
            
            # Extract main content (prioritize article, main, or body)
            content_selectors = ['article', 'main', '[role="main"]', '.content', '#content', 'body']
            content = ""
            
            for selector in content_selectors:
                elements = soup.select(selector)
                if elements:
                    content = elements[0].get_text()
                    break
            
            if not content:
                content = soup.get_text()
            
            # Clean up content
            lines = (line.strip() for line in content.splitlines())
            content = '\n'.join(line for line in lines if line)
            
            metadata = {
                "url": url,
                "title": title_text,
                "domain": requests.utils.urlparse(url).netloc,
                "word_count": len(content.split()),
                "char_count": len(content),
                "extraction_method": "BeautifulSoup"
            }
            
            return {
                "content": content,
                "metadata": metadata,
                "success": True
            }
            
        except Exception as e:
            return {
                "content": "",
                "metadata": {},
                "success": False,
                "error": str(e)
            }
    
    def extract_youtube_content(self, url: str) -> Dict[str, Any]:
        """Extract transcript from YouTube videos"""
        try:
            # Configure youtube-dl
            ydl_opts = {
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'skip_download': True,
                'quiet': True
            }
            
            with youtube_dl.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                title = info.get('title', 'Unknown Title')
                duration = info.get('duration', 0)
                description = info.get('description', '')
                
                # Try to get subtitles/transcript
                subtitles = info.get('subtitles', {})
                auto_captions = info.get('automatic_captions', {})
                
                transcript = ""
                
                # Prefer manual subtitles over auto-generated
                if 'en' in subtitles:
                    # Download and parse subtitle file
                    subtitle_url = subtitles['en'][0]['url']
                    subtitle_response = requests.get(subtitle_url)
                    transcript = self.parse_subtitle_content(subtitle_response.text)
                elif 'en' in auto_captions:
                    # Use auto-generated captions
                    caption_url = auto_captions['en'][0]['url']
                    caption_response = requests.get(caption_url)
                    transcript = self.parse_subtitle_content(caption_response.text)
                else:
                    # Fallback to description if no transcript available
                    transcript = description
                
                metadata = {
                    "url": url,
                    "title": title,
                    "duration": duration,
                    "video_id": info.get('id', ''),
                    "uploader": info.get('uploader', ''),
                    "word_count": len(transcript.split()),
                    "extraction_method": "youtube-dl"
                }
                
                return {
                    "content": transcript,
                    "metadata": metadata,
                    "success": True
                }
                
        except Exception as e:
            return {
                "content": "",
                "metadata": {},
                "success": False,
                "error": str(e)
            }
    
    def parse_subtitle_content(self, subtitle_text: str) -> str:
        """Parse subtitle/caption content to extract clean text"""
        # This is a simplified parser - in production, use proper subtitle parsers
        lines = subtitle_text.split('\n')
        text_lines = []
        
        for line in lines:
            line = line.strip()
            # Skip timestamp lines and empty lines
            if line and not line.startswith('<') and '-->' not in line and not line.isdigit():
                text_lines.append(line)
        
        return ' '.join(text_lines)
    
    async def process_document_async(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Process a document with full RAG pipeline"""
        doc_id = document['id']
        doc_type = document['type']
        doc_path = document.get('path', '')
        doc_url = document.get('url', '')
        
        print(f"🔄 Processing document: {doc_id} ({doc_type})")
        
        try:
            # Step 1: Extract content based on type
            if doc_type == 'pdf':
                extraction_result = self.extract_pdf_content(doc_path)
            elif doc_type == 'url':
                extraction_result = self.extract_web_content(doc_url)
            elif doc_type == 'youtube':
                extraction_result = self.extract_youtube_content(doc_url)
            else:
                raise ValueError(f"Unsupported document type: {doc_type}")
            
            if not extraction_result['success']:
                return {
                    "status": "failed",
                    "error": extraction_result.get('error', 'Content extraction failed')
                }
            
            content = extraction_result['content']
            metadata = extraction_result['metadata']
            
            # Step 2: Intelligent chunking
            chunks = self.intelligent_chunking(content)
            print(f"📝 Created {len(chunks)} semantic chunks")
            
            # Step 3: Generate embeddings
            chunk_texts = [chunk["text"] for chunk in chunks]
            embeddings = self.model.encode(
                chunk_texts, 
                convert_to_tensor=False, 
                show_progress_bar=True,
                batch_size=32
            )
            
            # Step 4: Normalize embeddings for cosine similarity
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            
            # Step 5: Store in vector database
            if self.index is None:
                self.index = self.create_optimized_index()
            
            # Generate unique IDs for chunks
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            numeric_ids = np.array([hash(chunk_id) % (2**31) for chunk_id in chunk_ids], dtype=np.int64)
            
            # Add to FAISS index
            self.index.add_with_ids(embeddings.astype('float32'), numeric_ids)
            
            # Step 6: Store metadata
            for i, (chunk, chunk_id) in enumerate(zip(chunks, chunk_ids)):
                chunk_metadata = {
                    'doc_id': doc_id,
                    'chunk_id': chunk_id,
                    'chunk_index': i,
                    'document_name': document.get('name', 'Unknown'),
                    'document_type': doc_type,
                    'content': chunk["text"],
                    'sentence_count': chunk["sentence_count"],
                    'char_count': chunk["char_count"],
                    'embedding_id': int(numeric_ids[i]),
                    'processed_at': datetime.now().isoformat(),
                    'metadata': metadata
                }
                self.chunk_metadata.append(chunk_metadata)
            
            # Step 7: Generate summary using OpenAI
            summary = await self.generate_summary(content, metadata)
            key_points = await self.extract_key_points(content, metadata)
            
            result = {
                "status": "completed",
                "doc_id": doc_id,
                "chunks_created": len(chunks),
                "embeddings_generated": len(embeddings),
                "summary": summary,
                "key_points": key_points,
                "metadata": metadata,
                "processing_time": datetime.now().isoformat(),
            }
            
            print(f"✅ Successfully processed document: {doc_id}")
            return result
            
        except Exception as e:
            error_msg = f"Failed to process document {doc_id}: {str(e)}"
            print(f"❌ {error_msg}")
            return {"status": "failed", "error": error_msg}
    
    async def generate_summary(self, content: str, metadata: Dict) -> str:
        """Generate intelligent summary using OpenAI"""
        try:
            if not openai.api_key:
                return self.generate_fallback_summary(content, metadata)
            
            # Truncate content if too long
            max_content_length = 6000
            truncated_content = content[:max_content_length]
            if len(content) > max_content_length:
                truncated_content += "... [content truncated]"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert research assistant. Provide a comprehensive but concise summary of the given content, highlighting key themes, main arguments, and important findings."
                    },
                    {
                        "role": "user",
                        "content": f"Please summarize this content:\n\nTitle: {metadata.get('title', 'N/A')}\nType: {metadata.get('extraction_method', 'N/A')}\n\nContent:\n{truncated_content}"
                    }
                ],
                max_tokens=300,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"OpenAI summary generation failed: {e}")
            return self.generate_fallback_summary(content, metadata)
    
    def generate_fallback_summary(self, content: str, metadata: Dict) -> str:
        """Generate fallback summary without OpenAI"""
        word_count = len(content.split())
        doc_type = metadata.get('extraction_method', 'document')
        title = metadata.get('title', 'Untitled')
        
        if word_count < 100:
            return f"Brief {doc_type} titled '{title}' with {word_count} words covering the main topic."
        elif word_count < 1000:
            return f"Medium-length {doc_type} titled '{title}' ({word_count} words) discussing key concepts and ideas in detail."
        else:
            return f"Comprehensive {doc_type} titled '{title}' ({word_count} words) with extensive analysis covering multiple topics and detailed insights."
    
    async def extract_key_points(self, content: str, metadata: Dict) -> List[str]:
        """Extract key points using OpenAI or fallback method"""
        try:
            if not openai.api_key:
                return self.extract_fallback_key_points(content)
            
            # Truncate content if too long
            max_content_length = 6000
            truncated_content = content[:max_content_length]
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Extract 4-6 key points from the given content. Each point should be a concise, important insight or finding. Return as a numbered list."
                    },
                    {
                        "role": "user",
                        "content": f"Extract key points from:\n\n{truncated_content}"
                    }
                ],
                max_tokens=200,
                temperature=0.3
            )
            
            key_points_text = response.choices[0].message.content.strip()
            
            # Parse the numbered list
            key_points = []
            for line in key_points_text.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    # Remove numbering/bullets
                    clean_point = line.split('.', 1)[-1].strip() if '.' in line else line[1:].strip()
                    if clean_point:
                        key_points.append(clean_point)
            
            return key_points[:6]  # Limit to 6 points
            
        except Exception as e:
            print(f"OpenAI key points extraction failed: {e}")
            return self.extract_fallback_key_points(content)
    
    def extract_fallback_key_points(self, content: str) -> List[str]:
        """Extract key points using simple heuristics"""
        # Simple keyword-based extraction
        important_terms = [
            "artificial intelligence", "machine learning", "deep learning",
            "neural network", "algorithm", "data", "model", "training",
            "analysis", "research", "study", "method", "approach",
            "system", "technology", "innovation", "development",
            "conclusion", "result", "finding", "discovery"
        ]
        
        sentences = content.split('. ')
        scored_sentences = []
        
        for sentence in sentences:
            score = 0
            sentence_lower = sentence.lower()
            
            # Score based on important terms
            for term in important_terms:
                if term in sentence_lower:
                    score += len(term.split())
            
            # Boost sentences with certain patterns
            if any(pattern in sentence_lower for pattern in ['important', 'key', 'significant', 'crucial', 'main']):
                score += 2
            
            if score > 0 and len(sentence.split()) > 5:
                scored_sentences.append((sentence.strip(), score))
        
        # Sort by score and take top sentences
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        key_points = [sentence for sentence, score in scored_sentences[:6]]
        
        if not key_points:
            key_points = [
                "Document contains valuable information",
                "Content covers relevant topics",
                "Material provides insights for analysis",
                "Source contributes to research knowledge"
            ]
        
        return key_points
    
    async def semantic_search(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        """Perform semantic search across all documents"""
        if self.index is None or len(self.chunk_metadata) == 0:
            return []
        
        try:
            # Generate query embedding
            query_embedding = self.model.encode([query], convert_to_tensor=False)
            query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)
            
            # Search in FAISS index
            scores, indices = self.index.search(query_embedding.astype('float32'), k)
            
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx != -1:  # Valid result
                    # Find metadata by embedding ID
                    for metadata in self.chunk_metadata:
                        if metadata['embedding_id'] == idx:
                            results.append({
                                'content': metadata['content'],
                                'document_name': metadata['document_name'],
                                'document_type': metadata['document_type'],
                                'chunk_index': metadata['chunk_index'],
                                'similarity_score': float(score),
                                'doc_id': metadata['doc_id'],
                                'chunk_id': metadata['chunk_id'],
                                'metadata': metadata.get('metadata', {})
                            })
                            break
            
            return results
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    async def answer_question(self, question: str, context_limit: int = 5) -> Dict[str, Any]:
        """Answer questions using RAG (Retrieval-Augmented Generation)"""
        try:
            # Step 1: Retrieve relevant context
            relevant_chunks = await self.semantic_search(question, k=context_limit)
            
            if not relevant_chunks:
                return {
                    "answer": "I don't have enough information in the knowledge base to answer this question.",
                    "sources": [],
                    "confidence": 0.0
                }
            
            # Step 2: Prepare context for generation
            context = "\n\n".join([
                f"Source: {chunk['document_name']} ({chunk['document_type']})\n{chunk['content']}"
                for chunk in relevant_chunks
            ])
            
            # Step 3: Generate answer using OpenAI
            if openai.api_key:
                response = await openai.ChatCompletion.acreate(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful research assistant. Answer the user's question based on the provided context. Be accurate and cite your sources. If the context doesn't contain enough information, say so clearly."
                        },
                        {
                            "role": "user",
                            "content": f"Context:\n{context}\n\nQuestion: {question}\n\nPlease provide a comprehensive answer based on the context above."
                        }
                    ],
                    max_tokens=500,
                    temperature=0.3
                )
                
                answer = response.choices[0].message.content.strip()
            else:
                # Fallback answer
                answer = f"Based on the available sources, here are the most relevant excerpts related to '{question}':\n\n"
                for i, chunk in enumerate(relevant_chunks[:3], 1):
                    answer += f"{i}. From {chunk['document_name']}: {chunk['content'][:200]}...\n\n"
            
            return {
                "answer": answer,
                "sources": [
                    {
                        "document": chunk['document_name'],
                        "type": chunk['document_type'],
                        "similarity": chunk['similarity_score'],
                        "excerpt": chunk['content'][:200] + "..." if len(chunk['content']) > 200 else chunk['content']
                    }
                    for chunk in relevant_chunks
                ],
                "confidence": min(relevant_chunks[0]['similarity_score'] if relevant_chunks else 0, 1.0)
            }
            
        except Exception as e:
            print(f"❌ Question answering error: {e}")
            return {
                "answer": "I encountered an error while processing your question. Please try again.",
                "sources": [],
                "confidence": 0.0
            }
    
    def save_system_state(self, filepath: str = "data/scrible_system") -> None:
        """Save the complete system state"""
        try:
            if self.index is not None:
                faiss.write_index(self.index, f"{filepath}.faiss")
                print(f"💾 Saved FAISS index to {filepath}.faiss")
            
            # Save metadata
            with open(f"{filepath}_metadata.json", 'w') as f:
                json.dump(self.chunk_metadata, f, indent=2)
            print(f"💾 Saved metadata to {filepath}_metadata
