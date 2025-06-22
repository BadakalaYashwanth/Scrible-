"""
Setup script for initializing the vector database for Scrible
This script sets up FAISS or ChromaDB for storing document embeddings
"""

import os
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import json
from typing import List, Dict, Any

class VectorDBSetup:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the vector database setup"""
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.index = None
        self.document_metadata = []
        
    def create_faiss_index(self) -> faiss.Index:
        """Create a FAISS index for similarity search"""
        # Using IndexFlatIP for inner product (cosine similarity)
        index = faiss.IndexFlatIP(self.dimension)
        
        # Optionally wrap with IndexIDMap for custom IDs
        index = faiss.IndexIDMap(index)
        
        print(f"Created FAISS index with dimension {self.dimension}")
        return index
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Add documents to the vector database"""
        if self.index is None:
            self.index = self.create_faiss_index()
        
        texts = []
        doc_ids = []
        
        for doc in documents:
            # Extract text chunks from document
            chunks = self.chunk_text(doc['content'], chunk_size=500, overlap=50)
            
            for i, chunk in enumerate(chunks):
                texts.append(chunk)
                doc_ids.append(f"{doc['id']}_chunk_{i}")
                
                # Store metadata
                self.document_metadata.append({
                    'doc_id': doc['id'],
                    'chunk_id': f"{doc['id']}_chunk_{i}",
                    'chunk_index': i,
                    'document_name': doc['name'],
                    'document_type': doc['type'],
                    'content': chunk
                })
        
        # Generate embeddings
        print(f"Generating embeddings for {len(texts)} text chunks...")
        embeddings = self.model.encode(texts, convert_to_tensor=False)
        
        # Normalize embeddings for cosine similarity
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        # Add to FAISS index
        ids = np.array([hash(doc_id) % (2**31) for doc_id in doc_ids], dtype=np.int64)
        self.index.add_with_ids(embeddings.astype('float32'), ids)
        
        print(f"Added {len(embeddings)} embeddings to the index")
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)
            
            if i + chunk_size >= len(words):
                break
                
        return chunks
    
    def search_similar(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if self.index is None:
            return []
        
        # Generate query embedding
        query_embedding = self.model.encode([query], convert_to_tensor=False)
        query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)
        
        # Search in FAISS index
        scores, indices = self.index.search(query_embedding.astype('float32'), k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1:  # Valid result
                # Find metadata by reconstructing the hash
                for metadata in self.document_metadata:
                    if hash(metadata['chunk_id']) % (2**31) == idx:
                        results.append({
                            'content': metadata['content'],
                            'document_name': metadata['document_name'],
                            'document_type': metadata['document_type'],
                            'chunk_index': metadata['chunk_index'],
                            'similarity_score': float(score)
                        })
                        break
        
        return results
    
    def save_index(self, filepath: str) -> None:
        """Save the FAISS index to disk"""
        if self.index is not None:
            faiss.write_index(self.index, f"{filepath}.faiss")
            
            # Save metadata
            with open(f"{filepath}_metadata.json", 'w') as f:
                json.dump(self.document_metadata, f, indent=2)
            
            print(f"Saved index and metadata to {filepath}")
    
    def load_index(self, filepath: str) -> None:
        """Load the FAISS index from disk"""
        try:
            self.index = faiss.read_index(f"{filepath}.faiss")
            
            # Load metadata
            with open(f"{filepath}_metadata.json", 'r') as f:
                self.document_metadata = json.load(f)
            
            print(f"Loaded index and metadata from {filepath}")
        except FileNotFoundError:
            print(f"Index file not found at {filepath}")

def main():
    """Main setup function"""
    print("Setting up Scrible Vector Database...")
    
    # Initialize vector DB
    vector_db = VectorDBSetup()
    
    # Sample documents for testing
    sample_documents = [
        {
            'id': 'doc1',
            'name': 'AI Research Paper.pdf',
            'type': 'pdf',
            'content': '''
            Artificial Intelligence has revolutionized many fields including natural language processing,
            computer vision, and machine learning. The transformer architecture, introduced in the paper
            "Attention Is All You Need", has become the foundation for many modern AI systems.
            Large Language Models like GPT and BERT have shown remarkable capabilities in understanding
            and generating human-like text. These models are trained on vast amounts of text data and
            can perform various tasks such as translation, summarization, and question answering.
            '''
        },
        {
            'id': 'doc2',
            'name': 'Machine Learning Basics.txt',
            'type': 'txt',
            'content': '''
            Machine Learning is a subset of artificial intelligence that focuses on algorithms that can
            learn from and make predictions on data. There are three main types of machine learning:
            supervised learning, unsupervised learning, and reinforcement learning.
            Supervised learning uses labeled data to train models, while unsupervised learning finds
            patterns in unlabeled data. Reinforcement learning involves agents learning through
            interaction with an environment to maximize rewards.
            '''
        }
    ]
    
    # Add documents to vector database
    vector_db.add_documents(sample_documents)
    
    # Test search functionality
    print("\nTesting search functionality...")
    query = "What is the transformer architecture?"
    results = vector_db.search_similar(query, k=3)
    
    print(f"\nQuery: {query}")
    print("Results:")
    for i, result in enumerate(results, 1):
        print(f"{i}. Document: {result['document_name']}")
        print(f"   Similarity: {result['similarity_score']:.3f}")
        print(f"   Content: {result['content'][:200]}...")
        print()
    
    # Save the index
    os.makedirs('data', exist_ok=True)
    vector_db.save_index('data/scrible_index')
    
    print("Vector database setup completed successfully!")

if __name__ == "__main__":
    main()
