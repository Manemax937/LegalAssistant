from langchain_community.document_loaders import PDFPlumberLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os
import shutil

pdfs_directory = 'pdfs/'  # Folder to store PDFs
FAISS_DB_PATH = "vectorstore/db_faiss"

def upload_pdf(file):
    if not os.path.exists(pdfs_directory):
        os.makedirs(pdfs_directory)

    file_path = os.path.join(pdfs_directory, file.name)
    with open(file_path, "wb") as f:
        f.write(file.getbuffer())
    
    return file_path

def load_pdf(file_path):
    loader = PDFPlumberLoader(file_path)
    documents = loader.load()
    return documents

def create_chunks(documents, file_name):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True
    )
    text_chunks = text_splitter.split_documents(documents)
    
    for chunk in text_chunks:
        chunk.metadata["source"] = file_name
    
    return text_chunks

_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return _embedding_model

def index_pdf(file_path):
    file_name = os.path.basename(file_path)
    documents = load_pdf(file_path)
    text_chunks = create_chunks(documents, file_name)

    if not text_chunks:
        return None

    model = get_embedding_model()
    if os.path.exists(os.path.join(FAISS_DB_PATH, "index.faiss")):
        try:
            faiss_db = FAISS.load_local(FAISS_DB_PATH, model, allow_dangerous_deserialization=True)
            faiss_db.add_documents(text_chunks)
            faiss_db.save_local(FAISS_DB_PATH)
            return faiss_db
        except Exception as e:
            print(f"Error merging with existing vector index: {e}")

    faiss_db = FAISS.from_documents(text_chunks, model)
    faiss_db.save_local(FAISS_DB_PATH)
    return faiss_db

def retrieve_docs(query, file_name=None):
    if not os.path.exists(os.path.join(FAISS_DB_PATH, "index.faiss")):
        return []
        
    try:
        model = get_embedding_model()
        faiss_db = FAISS.load_local(FAISS_DB_PATH, model, allow_dangerous_deserialization=True)
        
        if file_name:
            # 1. Try vector similarity search with explicit source metadata filter
            try:
                filtered_docs = faiss_db.similarity_search(query, k=6, filter={"source": file_name})
                if filtered_docs:
                    return filtered_docs
            except Exception as fe:
                print(f"Metadata filter search exception: {fe}")

            # 2. Search broader pool of chunks and filter manually by source file name
            retrieved_docs = faiss_db.similarity_search(query, k=30)
            filtered_docs = [doc for doc in retrieved_docs if doc.metadata.get("source") == file_name]
            if filtered_docs:
                return filtered_docs
                
            # 3. CRITICAL FIX: If no chunks match target file_name, return [] (empty list)
            # so api_server.py extracts text directly from the target PDF file on disk.
            # NEVER fallback to returning chunks from a different document!
            return []

        return faiss_db.similarity_search(query, k=6)
    except Exception as e:
        print(f"Error retrieving docs from vector database: {e}")
        return []
