from langchain_classic.chains import RetrievalQA
from backend.core.llm import get_llm
from backend.rag.ingestion import get_retriever

def get_rag_chain():
    llm = get_llm()
    retriever = get_retriever()
    
    # Simple RetrievalQA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True
    )
    return qa_chain

async def rag_answer(query: str) -> str:
    try:
        chain = get_rag_chain()
        # invoke is synchronous in this simple chain, but we wrap in async for API
        result = chain.invoke({"query": query})
        return result["result"]
    except Exception as e:
        print(f"RAG Error: {e}")
        # Fallback if no documents found or other error
        if "No documents found" in str(e): # simplistic check
             return "No documents indexed yet."
        return f"Error: {str(e)}"
