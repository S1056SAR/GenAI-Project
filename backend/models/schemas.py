from pydantic import BaseModel

class RAGQueryRequest(BaseModel):
    query: str

class RAGQueryResponse(BaseModel):
    answer: str
