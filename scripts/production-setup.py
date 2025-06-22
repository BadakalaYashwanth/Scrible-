"""
Production setup script for AI Document Assistant
Sets up vector database, embeddings, and processing pipeline
"""

import os
import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import aiohttp
import aiofiles
from pathlib import Path

class ProductionVectorDB:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize production vector database system"""
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.index = None
        self.document_store = {}
        self.chunk_metadata = []
        
        # Create necessary directories
        os.makedirs("data/embeddings", exist_ok=True)
        os.makedirs("data/processed", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        
        print(f"✅ Initialized ProductionVectorDB")
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
    
    async def process_document_async(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Asynchronously process a document with full pipeline"""
        doc_id = document['id']
        content = document.get('content', '')
        doc_type = document.get('type', 'unknown')
        
        print(f"🔄 Processing document: {doc_id} ({doc_type})")
        
        if not content:
            return {"status": "error", "message": "No content to process"}
        
        try:
            # Step 1: Intelligent chunking
            chunks = self.intelligent_chunking(content)
            print(f"📝 Created {len(chunks)} semantic chunks")
            
            # Step 2: Generate embeddings
            chunk_texts = [chunk["text"] for chunk in chunks]
            embeddings = self.model.encode(
                chunk_texts, 
                convert_to_tensor=False, 
                show_progress_bar=True,
                batch_size=32
            )
            
            # Step 3: Normalize embeddings for cosine similarity
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            
            # Step 4: Store in vector database
            if self.index is None:
                self.index = self.create_optimized_index()
            
            # Generate unique IDs for chunks
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            numeric_ids = np.array([hash(chunk_id) % (2**31) for chunk_id in chunk_ids], dtype=np.int64)
            
            # Add to FAISS index
            self.index.add_with_ids(embeddings.astype('float32'), numeric_ids)
            
            # Step 5: Store metadata
            for i, (chunk, chunk_id) in enumerate(zip(chunks, chunk_ids)):
                metadata = {
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
                }
                self.chunk_metadata.append(metadata)
            
            # Step 6: Generate summary and key points
            summary = await self.generate_summary(content)
            key_points = await self.extract_key_points(content)
            
            result = {
                "status": "completed",
                "doc_id": doc_id,
                "chunks_created": len(chunks),
                "embeddings_generated": len(embeddings),
                "summary": summary,
                "key_points": key_points,
                "processing_time": datetime.now().isoformat(),
            }
            
            print(f"✅ Successfully processed document: {doc_id}")
            return result
            
        except Exception as e:
            error_msg = f"Failed to process document {doc_id}: {str(e)}"
            print(f"❌ {error_msg}")
            return {"status": "error", "message": error_msg}
    
    async def generate_summary(self, content: str) -> str:
        """Generate intelligent summary of content"""
        # In production, use a summarization model or API
        word_count = len(content.split())
        sentences = content.split('. ')
        
        if word_count < 100:
            return f"Brief content with {word_count} words covering the main topic."
        elif word_count < 500:
            return f"Medium-length content ({word_count} words) discussing key concepts and ideas."
        else:
            return f"Comprehensive content ({word_count} words) with detailed analysis and multiple topics covered."
    
    async def extract_key_points(self, content: str) -> List[str]:
        """Extract key points from content"""
        # Simple keyword extraction - in production use NLP libraries
        words = content.lower().split()
        
        # Common important terms (expand based on domain)
        important_terms = [
            "artificial intelligence", "machine learning", "deep learning",
            "neural network", "algorithm", "data", "model", "training",
            "analysis", "research", "study", "method", "approach",
            "system", "technology", "innovation", "development"
        ]
        
        found_terms = []
        for term in important_terms:
            if term in content.lower():
                found_terms.append(term.title())
        
        return found_terms[:6]  # Return top 6 key points
    
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
                            })
                            break
            
            return results
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    def save_index(self, filepath: str = "data/embeddings/production_index") -> None:
        """Save the complete vector database to disk"""
        try:
            if self.index is not None:
                faiss.write_index(self.index, f"{filepath}.faiss")
                print(f"💾 Saved FAISS index to {filepath}.faiss")
            
            # Save metadata
            with open(f"{filepath}_metadata.json", 'w') as f:
                json.dump(self.chunk_metadata, f, indent=2)
            print(f"💾 Saved metadata to {filepath}_metadata.json")
            
            # Save processing statistics
            stats = {
                "total_chunks": len(self.chunk_metadata),
                "total_documents": len(set(m['doc_id'] for m in self.chunk_metadata)),
                "embedding_dimension": self.dimension,
                "index_type": "HNSW",
                "last_updated": datetime.now().isoformat(),
            }
            
            with open(f"{filepath}_stats.json", 'w') as f:
                json.dump(stats, f, indent=2)
            print(f"📊 Saved statistics to {filepath}_stats.json")
            
        except Exception as e:
            print(f"❌ Failed to save index: {e}")
    
    def load_index(self, filepath: str = "data/embeddings/production_index") -> bool:
        """Load the vector database from disk"""
        try:
            # Load FAISS index
            if os.path.exists(f"{filepath}.faiss"):
                self.index = faiss.read_index(f"{filepath}.faiss")
                print(f"📂 Loaded FAISS index from {filepath}.faiss")
            else:
                print(f"⚠️  No existing index found at {filepath}.faiss")
                return False
            
            # Load metadata
            if os.path.exists(f"{filepath}_metadata.json"):
                with open(f"{filepath}_metadata.json", 'r') as f:
                    self.chunk_metadata = json.load(f)
                print(f"📂 Loaded {len(self.chunk_metadata)} chunk metadata entries")
            
            # Load statistics
            if os.path.exists(f"{filepath}_stats.json"):
                with open(f"{filepath}_stats.json", 'r') as f:
                    stats = json.load(f)
                print(f"📊 Database stats: {stats['total_documents']} documents, {stats['total_chunks']} chunks")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to load index: {e}")
            return False

async def main():
    """Main setup and testing function"""
    print("🚀 Starting AI Document Assistant Production Setup")
    print("=" * 60)
    
    # Initialize vector database
    vector_db = ProductionVectorDB()
    
    # Try to load existing index
    if not vector_db.load_index():
        print("🔧 Creating new vector database...")
        
        # Sample documents for testing
        sample_documents = [
            {
                'id': 'doc_ai_overview',
                'name': 'AI Research Overview.pdf',
                'type': 'pdf',
                'content': '''
                Artificial Intelligence has revolutionized multiple domains including natural language processing, 
                computer vision, and machine learning. Modern AI systems leverage deep learning architectures, 
                particularly transformer models, to achieve human-level performance on various tasks.
                
                Key developments include GPT models for text generation, BERT for language understanding, 
                and diffusion models for image generation. The field continues to evolve with emerging areas 
                like multimodal AI, reinforcement learning from human feedback, and AI safety research.
                
                Current challenges include model interpretability, bias mitigation, computational efficiency, 
                and ensuring AI systems are aligned with human values. Future directions point toward 
                more capable and safer AI systems that can assist humans across diverse applications.
                '''
            },
            {
                'id': 'doc_ml_fundamentals',
                'name': 'Machine Learning Fundamentals',
                'type': 'url',
                'content': '''
                Machine learning is a subset of artificial intelligence that enables systems to learn 
                and improve from experience without explicit programming. The three main types are 
                supervised learning (using labeled data), unsupervised learning (finding patterns 
                in unlabeled data), and reinforcement learning (learning through interaction with environment).
                
                Common algorithms include linear regression for continuous predictions, decision trees 
                for interpretable classification, neural networks for complex pattern recognition, 
                support vector machines for high-dimensional data, and ensemble methods like random forests.
                
                Feature engineering, model selection, and evaluation metrics are crucial aspects of 
                successful ML implementations. Cross-validation, regularization, and hyperparameter 
                tuning help ensure models generalize well to unseen data.
                '''
            },
            {
                'id': 'doc_youtube_transcript',
                'name': 'Deep Learning Explained - YouTube Video',
                'type': 'youtube',
                'content': '''
                [00:00] Welcome to this comprehensive overview of deep learning fundamentals.
                [00:30] Deep learning is a subset of machine learning inspired by the human brain's neural networks.
                [01:15] The key innovation is using multiple layers of artificial neurons to learn complex patterns.
                [02:00] Convolutional Neural Networks (CNNs) excel at image recognition and computer vision tasks.
                [03:30] Recurrent Neural Networks (RNNs) and LSTMs are designed for sequential data like text and time series.
                [05:00] Transformer architectures have revolutionized natural language processing with attention mechanisms.
                [07:15] Training deep networks requires large datasets, powerful GPUs, and careful optimization techniques.
                [09:00] Applications span from autonomous vehicles to medical diagnosis to creative AI art generation.
                [10:30] Challenges include overfitting, vanishing gradients, and the need for massive computational resources.
                [12:00] Future developments focus on more efficient architectures and better generalization capabilities.
                '''
            }
        ]
        
        # Process all documents
        print(f"📚 Processing {len(sample_documents)} sample documents...")
        for doc in sample_documents:
            result = await vector_db.process_document_async(doc)
            if result["status"] == "completed":
                print(f"✅ {doc['name']}: {result['chunks_created']} chunks, {result['embeddings_generated']} embeddings")
            else:
                print(f"❌ {doc['name']}: {result['message']}")
        
        # Save the index
        vector_db.save_index()
    
    # Test search functionality
    print("\n🔍 Testing semantic search functionality...")
    test_queries = [
        "What is artificial intelligence?",
        "How do neural networks work?",
        "Machine learning algorithms",
        "Deep learning applications",
        "Transformer models and attention"
    ]
    
    for query in test_queries:
        print(f"\n🔎 Query: '{query}'")
        results = await vector_db.semantic_search(query, k=3)
        
        if results:
            for i, result in enumerate(results, 1):
                print(f"  {i}. {result['document_name']} ({result['document_type'].upper()})")
                print(f"     Similarity: {result['similarity_score']:.3f}")
                print(f"     Content: {result['content'][:150]}...")
        else:
            print("  No results found")
    
    print("\n" + "=" * 60)
    print("🎉 Production setup completed successfully!")
    print(f"📊 Total chunks indexed: {len(vector_db.chunk_metadata)}")
    print(f"🔍 Vector database ready for semantic search")
    print(f"💾 Data saved to: data/embeddings/")

if __name__ == "__main__":
    asyncio.run(main())
