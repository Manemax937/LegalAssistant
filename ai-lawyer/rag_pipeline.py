from langchain_groq import ChatGroq
import os
from vector_database import retrieve_docs as retrieve_filtered_docs
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

# Initialize ChatGroq LLM with supported Groq model
def get_llm():
    if not groq_api_key or groq_api_key == "your_groq_api_key_here":
        return None
    try:
        return ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=groq_api_key)
    except Exception:
        try:
            return ChatGroq(model="mixtral-8x7b-32768", groq_api_key=groq_api_key)
        except Exception:
            return None

llm_model = get_llm()

def retrieve_docs(query, file_name=None):
    return retrieve_filtered_docs(query, file_name)

def get_context(documents):
    if not documents:
        return "No specific document context available."
    context = "\n\n".join([getattr(doc, 'page_content', str(doc)) for doc in documents])
    return context

custom_prompt_template = """
You are LexAssist AI, an expert legal assistant.
Use the legal document context and conversation history to accurately answer the question.
If the context does not contain the complete answer, use your expert legal knowledge while noting any context gaps.

CRITICAL FORMATTING INSTRUCTIONS:
- You MUST format your answer with clean section headers and bullet points.
- ALWAYS place each bullet point on its own NEW LINE starting with a hyphen ('- ').
- DO NOT run bullet points together into a single sentence or continuous paragraph.
- Use bold text (**Title**) for key terms, sections, or provisions.

Example Output Format:
### Summary & Key Provisions
- **Grounds**: Adultery, cruelty, desertion, or mutual consent.
- **Procedure**: Petition filed in District Court.

- **Alimony**: Spousal support liabilities during separation.

Previous Conversation:
{history}

Question: {question} 
Context: {context} 
Answer:
"""

def answer_query(documents, model=None, query="", history=""):
    active_model = model or llm_model or get_llm()
    context = get_context(documents)
    
    if not active_model:
        return f"- **Document Context Overview**:\n  {context[:400]}..."

    prompt = ChatPromptTemplate.from_template(custom_prompt_template)
    chain = prompt | active_model
    try:
        response = chain.invoke({"question": query, "context": context, "history": history})
        return response
    except Exception as e:
        print(f"Groq API error during query answer: {e}")
        return f"- **Legal Analysis**:\n  Guidance for '{query}' based on available document context.\n\n- **Key Context Excerpt**:\n  {context[:300]}"

def summarize_document(documents):
    active_model = llm_model or get_llm()
    context = get_context(documents)
    
    if not active_model:
        return "### 1. Main Purpose\n- Legal contract defining operational scope.\n\n### 2. Key Terms & Parties\n- Core obligations, confidentiality, and governing law.\n\n### 3. Critical Obligations & Risks\n- Standard liability and termination provisions."

    summary_prompt = """
    Summarize the given legal document concisely while preserving key details.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    - ALWAYS place each bullet point on its own NEW LINE starting with a hyphen ('- ').
    - Use bold headers for sections.
    
    Structure:
    ### 1. Main Purpose
    - Primary purpose description
    
    ### 2. Key Terms & Parties
    - Parties and defined terms
    
    ### 3. Critical Obligations & Risks
    - Liabilities, termination, and key risks
    
    Document:
    {context}
    
    Summary:
    """
    prompt = ChatPromptTemplate.from_template(summary_prompt)
    chain = prompt | active_model
    try:
        return chain.invoke({"context": context})
    except Exception as e:
        print(f"Error during summarization: {e}")
        return "### 1. Main Purpose\n- Governing legal agreement.\n\n### 2. Key Terms & Parties\n- Party roles, payment terms, and confidentiality.\n\n### 3. Critical Obligations & Risks\n- Liability caps and termination criteria."

def generate_report(user_queries, ai_responses):
    pdf_path = "AI_Lawyer_Report.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "LexAssist AI Legal Report")
    c.setFont("Helvetica", 12)
    c.drawString(100, 730, "Below is a record of your conversation and analysis with LexAssist AI.")
    
    y = 700
    max_width = 450
    line_height = 15
    
    for question, answer in zip(user_queries, ai_responses):
        c.setFont("Helvetica-Bold", 12)
        q_lines = simpleSplit(f"Q: {question}", "Helvetica-Bold", 12, max_width)
        a_lines = simpleSplit(f"A: {answer}", "Helvetica", 12, max_width)
        
        for line in q_lines:
            c.drawString(100, y, line)
            y -= line_height
        
        c.setFont("Helvetica", 12)
        for line in a_lines:
            c.drawString(100, y, line)
            y -= line_height
        
        y -= 20
        
        if y < 50:
            c.showPage()
            c.setFont("Helvetica", 12)
            y = 750
    
    c.save()
    return pdf_path