"""
Production-ready vector database setup for Scrible
This script sets up a complete vector search system with real embeddings
"""

import os
import json
import numpy as np
from typing import List, Dict, Any, Optional
import asyncio
import aiohttp
from sentence_transformers import SentenceTransformer
import faiss
from datetime import datetime

class ProductionVectorDB:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", index_path: str = "data/production_index"):
        """Initialize production vector database"""
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.index_path = index_path
        self.index = None
        self.document_store = {}
        self.chunk_metadata = []
        
        # Create data directory
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        
        print(f"Initialized ProductionVectorDB with model: {model_name}")
        print(f"Embedding dimension: {self.dimension}")
    
    def create_index(self) -> faiss.Index:
        """Create optimized FAISS index for production"""
        # Use IndexHNSWFlat for better performance with large datasets
        index = faiss.IndexHNSWFlat(self.dimension, 32)  # 32 is M parameter
        index.hnsw.efConstruction = 200  # Higher value = better recall, slower build
        index.hnsw.efSearch = 100  # Higher value = better recall, slower search
        
        # Wrap with IndexIDMap for custom document IDs
        index = faiss.IndexIDMap(index)
        
        print("Created optimized FAISS HNSW index for production")
        return index
    
    def chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 64) -> List[str]:
        """Split text into overlapping chunks optimized for embeddings"""
        # Split by sentences first to maintain semantic coherence
        sentences = text.replace('\n', ' ').split('. ')
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            # Check if adding this sentence would exceed chunk size
            if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap
                words = current_chunk.split()
                overlap_text = ' '.join(words[-overlap//4:]) if len(words) > overlap//4 else ""
                current_chunk = overlap_text + " " + sentence if overlap_text else sentence
            else:
                current_chunk += ". " + sentence if current_chunk else sentence
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def process_document(self, document: Dict[str, Any]) -> None:
        """Process a single document and add to vector database"""
        if self.index is None:
            self.index = self.create_index()
        
        doc_id = document['id']
        content = document.get('content', '')
        
        if not content:
            print(f"Warning: Document {doc_id} has no content")
            return
        
        # Chunk the document
        chunks = self.chunk_text(content)
        print(f"Processing document {doc_id}: {len(chunks)} chunks")
        
        # Generate embeddings for all chunks
        embeddings = self.model.encode(chunks, convert_to_tensor=False, show_progress_bar=True)
        
        # Normalize embeddings for cosine similarity
        embeddings = embeddings / np.l
