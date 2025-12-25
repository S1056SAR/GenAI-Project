"""
EduSynth Journey Agent - Smart Learning Path System
====================================================
An intelligent agent for creating adaptive learning paths with:
- Syllabus analysis and curriculum design
- Progressive node-based learning
- RAG-powered content generation
- Interactive quiz generation
"""

import json
import re
from typing import List, Dict
from langchain_core.messages import SystemMessage, HumanMessage
from backend.core.llm import get_llm
from backend.rag.ingestion import get_retriever
from backend.models.journey import JourneyNode, JourneyState


class JourneyAgent:
    """
    Intelligent agent for managing learning journeys.
    
    Responsibilities:
    1. Design curriculum from syllabus text
    2. Generate lesson content for each node
    3. Create assessment quizzes
    """
    
    def __init__(self):
        self.curriculum_llm = get_llm(mode="smart")  # 70B for curriculum design
        self.content_llm = get_llm(mode="smart")      # 70B for quality content
    
    def design_curriculum(self, syllabus_text: str) -> List[JourneyNode]:
        """
        Analyzes syllabus and creates a structured learning path.
        
        Returns a list of JourneyNodes ordered from foundational to advanced.
        """
        print("=" * 60)
        print("[CURRICULUM DESIGNER]")
        print("=" * 60)
        
        system_prompt = """You are an expert Curriculum Designer with decades of experience in educational technology.

YOUR TASK: Analyze the given syllabus and create a progressive learning path.

REQUIREMENTS:
1. Create exactly 5-7 learning nodes (levels)
2. Order from foundational concepts to advanced topics
3. Each node should be completable in 10-15 minutes
4. Ensure logical progression where each node builds on previous ones

OUTPUT FORMAT (strict JSON, no additional text):
```json
[
  {
    "id": "node_1",
    "title": "Concise Topic Name (2-5 words)",
    "description": "One sentence learning objective starting with 'Learn to...' or 'Understand...'"
  },
  {
    "id": "node_2",
    "title": "Next Topic",
    "description": "Learning objective"
  }
]
```

RULES:
- First node must cover prerequisites/foundations
- Last node should be the most advanced or a capstone
- Titles should be engaging and specific
- Descriptions should clearly state what learner will achieve"""

        user_prompt = f"""Analyze this syllabus and design a learning path:

SYLLABUS:
{syllabus_text[:4000]}

Generate the learning path JSON now:"""

        try:
            response = self.curriculum_llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            content = response.content
            
            # Robust JSON extraction
            json_match = re.search(r"```json\n(.*?)```", content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            else:
                # Try to find JSON array directly
                array_match = re.search(r"\[.*\]", content, re.DOTALL)
                if array_match:
                    content = array_match.group(0)
            
            # Clean control characters
            content = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", content)
            content = content.strip()
            
            if not content:
                raise ValueError("Empty JSON content")
            
            data = json.loads(content)
            
            # Build nodes
            nodes = []
            for i, item in enumerate(data):
                node = JourneyNode(
                    id=item.get("id", f"node_{i+1}"),
                    title=item.get("title", f"Topic {i+1}"),
                    description=item.get("description", "Learning objective"),
                    status="locked"
                )
                nodes.append(node)
            
            # Unlock first node
            if nodes:
                nodes[0].status = "unlocked"
                print(f"   Created {len(nodes)} learning nodes:")
                for node in nodes:
                    status_icon = "[UNLOCKED]" if node.status == "unlocked" else "[LOCKED]"
                    print(f"   {status_icon} {node.id}: {node.title}")
            
            return nodes
            
        except json.JSONDecodeError as e:
            print(f"   JSON Parse Error: {e}")
            print(f"   Raw content: {content[:200]}...")
        except Exception as e:
            print(f"   Curriculum design failed: {e}")
        
        # Fallback curriculum
        print("   Using fallback curriculum")
        return [
            JourneyNode(id="node_1", title="Introduction", description="Learn the basics", status="unlocked"),
            JourneyNode(id="node_2", title="Core Concepts", description="Understand key ideas", status="locked"),
            JourneyNode(id="node_3", title="Advanced Topics", description="Master advanced concepts", status="locked")
        ]

    def generate_node_content(self, node_title: str, user_id: str = "default_user") -> Dict:
        """
        Generates lesson content and quiz for a specific node.
        
        Uses RAG to ground content in user's uploaded materials.
        
        Returns:
        {
            "content_summary": "Markdown lesson content",
            "quiz_questions": [{"question": "...", "options": [...], "correct_answer": 0}]
        }
        """
        print("=" * 60)
        print(f"[CONTENT GENERATOR]: {node_title}")
        print("=" * 60)
        print(f"   User: {user_id}")
        
        # Step 1: Retrieve relevant context
        context = ""
        try:
            retriever = get_retriever(user_id=user_id)
            docs = retriever.invoke(node_title)
            context = "\n\n---\n\n".join([d.page_content for d in docs[:4]])
            print(f"   Retrieved {len(docs)} relevant documents")
        except Exception as e:
            print(f"   Retrieval error: {e}")
            context = "No specific documents found for this topic."
        
        # Step 2: Generate content and quiz
        system_prompt = """You are EduSynth, an expert AI tutor creating micro-learning content.

YOUR TASK: Create a focused lesson and assessment quiz for a learning module.

LESSON REQUIREMENTS:
1. Length: 3-4 paragraphs (readable in 5-10 minutes)
2. Structure: Introduction → Core explanation → Examples → Summary
3. Use Markdown formatting (headers, bold, lists)
4. Base content on provided context when available
5. Be engaging and conversational

QUIZ REQUIREMENTS:
1. Create exactly 3 Multiple Choice Questions (MCQs)
2. Questions should test understanding, not just recall
3. Each question has 4 options
4. Only ONE correct answer per question
5. Include a mix of difficulty levels

OUTPUT FORMAT (strict JSON):
```json
{
  "content_summary": "## Topic Title\\n\\nFirst paragraph introducing the topic...\\n\\n### Key Concepts\\n\\n- Point 1\\n- Point 2\\n\\nFurther explanation...",
  "quiz_questions": [
    {
      "question": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0
    },
    {
      "question": "Second question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 2
    },
    {
      "question": "Third question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 1
    }
  ]
}
```

CRITICAL: correct_answer is the INDEX (0-3) of the correct option, not the text."""

        user_prompt = f"""Create a lesson for this topic:

TOPIC: {node_title}

REFERENCE CONTEXT (from user's documents):
{context[:3000] if context else "No specific context available. Generate based on general knowledge."}

Generate the lesson and quiz JSON now:"""

        try:
            response = self.content_llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            content = response.content
            
            # Robust JSON extraction
            json_match = re.search(r"```json\n(.*?)```", content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            else:
                # Try to find JSON object directly
                obj_match = re.search(r"\{.*\}", content, re.DOTALL)
                if obj_match:
                    content = obj_match.group(0)
            
            # Clean content
            content = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", content)
            # Fix common JSON issues
            content = content.replace("\\n", "\n")  # Keep actual newlines
            content = content.strip()
            
            if not content:
                raise ValueError("Empty content from LLM")
            
            data = json.loads(content)
            
            # Validate structure
            if "content_summary" not in data:
                data["content_summary"] = f"## {node_title}\n\nContent not available."
            if "quiz_questions" not in data or not isinstance(data["quiz_questions"], list):
                data["quiz_questions"] = []
            
            # Validate quiz questions
            valid_questions = []
            for q in data["quiz_questions"]:
                if all(k in q for k in ["question", "options", "correct_answer"]):
                    if len(q["options"]) == 4 and isinstance(q["correct_answer"], int):
                        valid_questions.append(q)
            data["quiz_questions"] = valid_questions[:3]  # Max 3 questions
            
            print(f"   Generated lesson: {len(data['content_summary'])} chars")
            print(f"   Generated quiz: {len(data['quiz_questions'])} questions")
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"   JSON Parse Error: {e}")
        except Exception as e:
            print(f"   Content generation failed: {e}")
        
        # Fallback content
        return {
            "content_summary": f"""## {node_title}

We're having trouble generating specific content for this topic right now.

### What You Can Do:
1. Make sure you've uploaded relevant documents
2. Try refreshing the page
3. Contact support if the issue persists

*This is a fallback message - please try again.*""",
            "quiz_questions": [
                {
                    "question": f"What is the main topic of this lesson?",
                    "options": [node_title, "Unrelated Topic", "Random Answer", "None of the above"],
                    "correct_answer": 0
                }
            ]
        }


# Export singleton instance
journey_agent = JourneyAgent()
