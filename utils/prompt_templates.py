"""
Prompt template data models and default templates.

Provides the data structures and built-in templates for the
dynamic prompt template system.

Supports loading custom/private prompts from custom_prompts.yaml
which is gitignored for project-specific templates.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

import yaml


class VariableType(str, Enum):
    """Supported variable input types."""
    TEXT = "text"
    TEXTAREA = "textarea"
    URL = "url"
    SELECT = "select"
    MULTISELECT = "multiselect"
    NUMBER = "number"
    DATE = "date"


@dataclass
class ValidationRules:
    """Validation rules for a variable."""
    pattern: Optional[str] = None  # Regex pattern
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None  # For number type
    max_value: Optional[float] = None
    error_message: Optional[str] = None


@dataclass
class PromptVariable:
    """Definition of a variable placeholder in a template."""
    name: str  # Used in [variable_name] placeholders
    label: str  # Display label in form
    type: VariableType = VariableType.TEXT
    required: bool = True
    placeholder: str = ""
    default_value: str = ""
    options: List[str] = field(default_factory=list)  # For select/multiselect
    validation: Optional[ValidationRules] = None
    help_text: str = ""


@dataclass
class PromptTemplate:
    """A complete prompt template with variables."""
    id: str
    name: str
    description: str
    category: str
    template: str  # Contains [variable_name] placeholders
    variables: List[PromptVariable] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

    # Metadata
    is_custom: bool = False
    is_public: bool = False
    is_favorite: bool = False
    created_by: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    use_count: int = 0


@dataclass
class PromptCategory:
    """Category for organizing templates."""
    id: str
    name: str
    description: str
    icon: str = ""
    color: str = "#3b82f6"


# =============================================================================
# Default Categories
# =============================================================================

DEFAULT_CATEGORIES: List[PromptCategory] = [
    PromptCategory(
        id="general",
        name="General",
        description="General purpose prompts",
        icon="chat",
        color="#6b7280"
    ),
    PromptCategory(
        id="analysis",
        name="Analysis",
        description="Document and content analysis",
        icon="search",
        color="#3b82f6"
    ),
    PromptCategory(
        id="writing",
        name="Writing",
        description="Content creation and editing",
        icon="edit",
        color="#8b5cf6"
    ),
    PromptCategory(
        id="coding",
        name="Coding",
        description="Programming and code review",
        icon="code",
        color="#10b981"
    ),
    PromptCategory(
        id="research",
        name="Research",
        description="Research and information gathering",
        icon="book",
        color="#f59e0b"
    ),
    PromptCategory(
        id="business",
        name="Business",
        description="Business and professional tasks",
        icon="briefcase",
        color="#ef4444"
    ),
]


# =============================================================================
# Default Templates
# =============================================================================

DEFAULT_TEMPLATES: List[PromptTemplate] = [
    # General Templates
    PromptTemplate(
        id="general_chat",
        name="General Chat",
        description="Open-ended conversation with no specific format",
        category="general",
        template="[user_input]",
        variables=[
            PromptVariable(
                name="user_input",
                label="Your Message",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Ask me anything...",
                help_text="Enter your question or message"
            )
        ],
        tags=["chat", "general", "open"]
    ),

    PromptTemplate(
        id="explain_concept",
        name="Explain a Concept",
        description="Get a clear explanation of any concept or topic",
        category="general",
        template="""Please explain [concept] in a clear and understandable way.

Target audience: [audience]
Desired depth: [depth]

[additional_context]""",
        variables=[
            PromptVariable(
                name="concept",
                label="Concept to Explain",
                type=VariableType.TEXT,
                required=True,
                placeholder="e.g., machine learning, blockchain, etc."
            ),
            PromptVariable(
                name="audience",
                label="Target Audience",
                type=VariableType.SELECT,
                required=True,
                options=["Beginner (no prior knowledge)", "Intermediate (some familiarity)", "Expert (technical details)"],
                default_value="Beginner (no prior knowledge)"
            ),
            PromptVariable(
                name="depth",
                label="Explanation Depth",
                type=VariableType.SELECT,
                required=True,
                options=["Brief overview", "Moderate detail", "Comprehensive deep-dive"],
                default_value="Moderate detail"
            ),
            PromptVariable(
                name="additional_context",
                label="Additional Context",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific aspects to focus on or questions to address..."
            )
        ],
        tags=["explain", "learn", "education"]
    ),

    # Analysis Templates
    PromptTemplate(
        id="document_summary",
        name="Summarize Document",
        description="Get a concise summary of uploaded documents",
        category="analysis",
        template="""Please summarize the uploaded document(s) with the following focus:

Summary type: [summary_type]
Key focus areas: [focus_areas]

[additional_instructions]""",
        variables=[
            PromptVariable(
                name="summary_type",
                label="Summary Type",
                type=VariableType.SELECT,
                required=True,
                options=["Executive summary (1-2 paragraphs)", "Detailed summary (comprehensive)", "Bullet points (key takeaways)", "Abstract (academic style)"],
                default_value="Executive summary (1-2 paragraphs)"
            ),
            PromptVariable(
                name="focus_areas",
                label="Focus Areas",
                type=VariableType.MULTISELECT,
                required=False,
                options=["Main arguments", "Key findings", "Recommendations", "Data/statistics", "Conclusions", "Action items"],
                help_text="Select areas to emphasize in the summary"
            ),
            PromptVariable(
                name="additional_instructions",
                label="Additional Instructions",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific questions or aspects to address..."
            )
        ],
        tags=["summary", "document", "analysis"]
    ),

    PromptTemplate(
        id="compare_documents",
        name="Compare Documents",
        description="Compare and contrast multiple documents",
        category="analysis",
        template="""Please compare the uploaded documents and provide:

Comparison focus: [comparison_focus]
Output format: [output_format]

Specific aspects to compare:
[aspects]

[additional_notes]""",
        variables=[
            PromptVariable(
                name="comparison_focus",
                label="Comparison Focus",
                type=VariableType.SELECT,
                required=True,
                options=["Similarities and differences", "Contradictions and agreements", "Evolution/changes over time", "Strengths and weaknesses"],
                default_value="Similarities and differences"
            ),
            PromptVariable(
                name="output_format",
                label="Output Format",
                type=VariableType.SELECT,
                required=True,
                options=["Side-by-side comparison table", "Narrative analysis", "Bullet point list", "Detailed report"],
                default_value="Side-by-side comparison table"
            ),
            PromptVariable(
                name="aspects",
                label="Aspects to Compare",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List specific aspects, topics, or criteria to focus on..."
            ),
            PromptVariable(
                name="additional_notes",
                label="Additional Notes",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any context or specific questions..."
            )
        ],
        tags=["compare", "analysis", "documents"]
    ),

    PromptTemplate(
        id="extract_information",
        name="Extract Information",
        description="Extract specific information from documents",
        category="analysis",
        template="""Please extract the following information from the uploaded document(s):

Information to extract:
[extraction_targets]

Output format: [output_format]

[additional_requirements]""",
        variables=[
            PromptVariable(
                name="extraction_targets",
                label="Information to Extract",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="List the specific data points, facts, or information you need extracted...",
                help_text="Be specific about what you're looking for"
            ),
            PromptVariable(
                name="output_format",
                label="Output Format",
                type=VariableType.SELECT,
                required=True,
                options=["Structured table", "JSON format", "Bullet points", "Narrative text"],
                default_value="Structured table"
            ),
            PromptVariable(
                name="additional_requirements",
                label="Additional Requirements",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any formatting requirements or notes..."
            )
        ],
        tags=["extract", "data", "analysis"]
    ),

    # Writing Templates
    PromptTemplate(
        id="improve_writing",
        name="Improve Writing",
        description="Get suggestions to improve your text",
        category="writing",
        template="""Please review and improve the following text:

---
[text_to_improve]
---

Improvement focus: [improvement_focus]
Tone: [desired_tone]
Additional notes: [notes]""",
        variables=[
            PromptVariable(
                name="text_to_improve",
                label="Text to Improve",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Paste the text you want to improve..."
            ),
            PromptVariable(
                name="improvement_focus",
                label="Improvement Focus",
                type=VariableType.MULTISELECT,
                required=True,
                options=["Clarity", "Conciseness", "Grammar & spelling", "Flow & structure", "Vocabulary", "Persuasiveness"],
                default_value="Clarity"
            ),
            PromptVariable(
                name="desired_tone",
                label="Desired Tone",
                type=VariableType.SELECT,
                required=True,
                options=["Professional", "Casual", "Academic", "Friendly", "Authoritative", "Keep original"],
                default_value="Professional"
            ),
            PromptVariable(
                name="notes",
                label="Additional Notes",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific issues to address or context..."
            )
        ],
        tags=["writing", "editing", "improve"]
    ),

    PromptTemplate(
        id="draft_email",
        name="Draft Email",
        description="Generate a professional email draft",
        category="writing",
        template="""Please draft an email with the following details:

Recipient: [recipient]
Subject/Purpose: [purpose]
Key points to include:
[key_points]

Tone: [tone]
Length: [length]

Additional context: [context]""",
        variables=[
            PromptVariable(
                name="recipient",
                label="Recipient",
                type=VariableType.TEXT,
                required=True,
                placeholder="e.g., Client, Manager, Team, etc."
            ),
            PromptVariable(
                name="purpose",
                label="Purpose/Subject",
                type=VariableType.TEXT,
                required=True,
                placeholder="What is the email about?"
            ),
            PromptVariable(
                name="key_points",
                label="Key Points",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="List the main points to include..."
            ),
            PromptVariable(
                name="tone",
                label="Tone",
                type=VariableType.SELECT,
                required=True,
                options=["Formal", "Professional", "Friendly", "Urgent", "Apologetic", "Appreciative"],
                default_value="Professional"
            ),
            PromptVariable(
                name="length",
                label="Length",
                type=VariableType.SELECT,
                required=True,
                options=["Brief (2-3 sentences)", "Short (1 paragraph)", "Medium (2-3 paragraphs)", "Detailed (comprehensive)"],
                default_value="Short (1 paragraph)"
            ),
            PromptVariable(
                name="context",
                label="Additional Context",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any background information..."
            )
        ],
        tags=["email", "writing", "communication"]
    ),

    PromptTemplate(
        id="create_outline",
        name="Create Content Outline",
        description="Generate an outline for articles, reports, or presentations",
        category="writing",
        template="""Please create a detailed outline for:

Topic: [topic]
Content type: [content_type]
Target audience: [audience]
Approximate length: [length]

Key points to cover:
[key_points]

[special_requirements]""",
        variables=[
            PromptVariable(
                name="topic",
                label="Topic",
                type=VariableType.TEXT,
                required=True,
                placeholder="What is the content about?"
            ),
            PromptVariable(
                name="content_type",
                label="Content Type",
                type=VariableType.SELECT,
                required=True,
                options=["Blog post", "Article", "Report", "Presentation", "White paper", "Tutorial"],
                default_value="Article"
            ),
            PromptVariable(
                name="audience",
                label="Target Audience",
                type=VariableType.TEXT,
                required=True,
                placeholder="Who will read/view this?"
            ),
            PromptVariable(
                name="length",
                label="Approximate Length",
                type=VariableType.SELECT,
                required=True,
                options=["Short (500-800 words)", "Medium (1000-1500 words)", "Long (2000-3000 words)", "Comprehensive (3000+ words)"],
                default_value="Medium (1000-1500 words)"
            ),
            PromptVariable(
                name="key_points",
                label="Key Points to Cover",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List any specific points that must be included..."
            ),
            PromptVariable(
                name="special_requirements",
                label="Special Requirements",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any style guides, formatting requirements, or constraints..."
            )
        ],
        tags=["outline", "writing", "planning"]
    ),

    # Coding Templates
    PromptTemplate(
        id="code_review",
        name="Code Review",
        description="Get a thorough review of your code",
        category="coding",
        template="""Please review the following code:

```[language]
[code]
```

Review focus: [review_focus]
Context: [context]

Please check for:
[check_items]""",
        variables=[
            PromptVariable(
                name="language",
                label="Programming Language",
                type=VariableType.SELECT,
                required=True,
                options=["python", "javascript", "typescript", "java", "cpp", "go", "rust", "ruby", "php", "other"],
                default_value="python"
            ),
            PromptVariable(
                name="code",
                label="Code to Review",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Paste your code here..."
            ),
            PromptVariable(
                name="review_focus",
                label="Review Focus",
                type=VariableType.SELECT,
                required=True,
                options=["General review", "Security audit", "Performance optimization", "Best practices", "Bug detection"],
                default_value="General review"
            ),
            PromptVariable(
                name="context",
                label="Context",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="What does this code do? Any specific concerns?"
            ),
            PromptVariable(
                name="check_items",
                label="Specific Checks",
                type=VariableType.MULTISELECT,
                required=False,
                options=["Code style", "Error handling", "Edge cases", "Documentation", "Testing", "Security vulnerabilities", "Performance"],
                help_text="Select specific aspects to review"
            )
        ],
        tags=["code", "review", "programming"]
    ),

    PromptTemplate(
        id="explain_code",
        name="Explain Code",
        description="Get a detailed explanation of code",
        category="coding",
        template="""Please explain the following code:

```[language]
[code]
```

Explanation level: [explanation_level]

Specific questions:
[questions]""",
        variables=[
            PromptVariable(
                name="language",
                label="Programming Language",
                type=VariableType.SELECT,
                required=True,
                options=["python", "javascript", "typescript", "java", "cpp", "go", "rust", "ruby", "php", "other"],
                default_value="python"
            ),
            PromptVariable(
                name="code",
                label="Code to Explain",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Paste the code you want explained..."
            ),
            PromptVariable(
                name="explanation_level",
                label="Explanation Level",
                type=VariableType.SELECT,
                required=True,
                options=["Beginner (step-by-step)", "Intermediate (concepts)", "Advanced (deep dive)"],
                default_value="Intermediate (concepts)"
            ),
            PromptVariable(
                name="questions",
                label="Specific Questions",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific parts or concepts you want clarified?"
            )
        ],
        tags=["code", "explain", "learning"]
    ),

    PromptTemplate(
        id="debug_code",
        name="Debug Code",
        description="Help identify and fix bugs in code",
        category="coding",
        template="""I need help debugging this code:

```[language]
[code]
```

Error/Issue: [error_description]

Expected behavior: [expected_behavior]

Actual behavior: [actual_behavior]

What I've tried: [attempted_fixes]""",
        variables=[
            PromptVariable(
                name="language",
                label="Programming Language",
                type=VariableType.SELECT,
                required=True,
                options=["python", "javascript", "typescript", "java", "cpp", "go", "rust", "ruby", "php", "other"],
                default_value="python"
            ),
            PromptVariable(
                name="code",
                label="Code with Bug",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Paste the problematic code..."
            ),
            PromptVariable(
                name="error_description",
                label="Error/Issue Description",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Describe the error or paste error message..."
            ),
            PromptVariable(
                name="expected_behavior",
                label="Expected Behavior",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="What should the code do?"
            ),
            PromptVariable(
                name="actual_behavior",
                label="Actual Behavior",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="What is the code actually doing?"
            ),
            PromptVariable(
                name="attempted_fixes",
                label="What You've Tried",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List any fixes you've already attempted..."
            )
        ],
        tags=["debug", "code", "fix", "error"]
    ),

    # Research Templates
    PromptTemplate(
        id="research_topic",
        name="Research Topic",
        description="Get comprehensive research on a topic",
        category="research",
        template="""Please provide comprehensive research on:

Topic: [topic]

Research depth: [depth]
Focus areas: [focus_areas]

Specific questions to answer:
[questions]

Output format: [output_format]""",
        variables=[
            PromptVariable(
                name="topic",
                label="Research Topic",
                type=VariableType.TEXT,
                required=True,
                placeholder="What topic do you want to research?"
            ),
            PromptVariable(
                name="depth",
                label="Research Depth",
                type=VariableType.SELECT,
                required=True,
                options=["Overview (broad understanding)", "Detailed (comprehensive coverage)", "Deep dive (expert level)"],
                default_value="Detailed (comprehensive coverage)"
            ),
            PromptVariable(
                name="focus_areas",
                label="Focus Areas",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List specific aspects to focus on..."
            ),
            PromptVariable(
                name="questions",
                label="Specific Questions",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List specific questions you want answered..."
            ),
            PromptVariable(
                name="output_format",
                label="Output Format",
                type=VariableType.SELECT,
                required=True,
                options=["Structured report", "Q&A format", "Bullet points", "Essay format"],
                default_value="Structured report"
            )
        ],
        tags=["research", "information", "learning"]
    ),

    PromptTemplate(
        id="analyze_url",
        name="Analyze Website/URL",
        description="Analyze and summarize content from a URL",
        category="research",
        template="""Please analyze the content from this URL:

URL: [url]

Analysis type: [analysis_type]

Specific aspects to analyze:
[aspects]

[additional_questions]""",
        variables=[
            PromptVariable(
                name="url",
                label="URL to Analyze",
                type=VariableType.URL,
                required=True,
                placeholder="https://example.com/article"
            ),
            PromptVariable(
                name="analysis_type",
                label="Analysis Type",
                type=VariableType.SELECT,
                required=True,
                options=["Summary", "Critical analysis", "Fact extraction", "Sentiment analysis", "Comprehensive review"],
                default_value="Summary"
            ),
            PromptVariable(
                name="aspects",
                label="Specific Aspects",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="What specific aspects should I focus on?"
            ),
            PromptVariable(
                name="additional_questions",
                label="Additional Questions",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific questions about the content?"
            )
        ],
        tags=["url", "website", "analysis", "research"]
    ),

    # Business Templates
    PromptTemplate(
        id="swot_analysis",
        name="SWOT Analysis",
        description="Generate a SWOT analysis for a business or project",
        category="business",
        template="""Please create a SWOT analysis for:

Subject: [subject]
Industry/Context: [industry]

Background information:
[background]

Specific considerations:
[considerations]

Please provide detailed analysis of Strengths, Weaknesses, Opportunities, and Threats.""",
        variables=[
            PromptVariable(
                name="subject",
                label="Analysis Subject",
                type=VariableType.TEXT,
                required=True,
                placeholder="Company name, product, project, etc."
            ),
            PromptVariable(
                name="industry",
                label="Industry/Context",
                type=VariableType.TEXT,
                required=True,
                placeholder="e.g., Technology, Healthcare, Retail"
            ),
            PromptVariable(
                name="background",
                label="Background Information",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Provide relevant context and information..."
            ),
            PromptVariable(
                name="considerations",
                label="Specific Considerations",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any specific factors to consider?"
            )
        ],
        tags=["business", "analysis", "strategy", "swot"]
    ),

    PromptTemplate(
        id="meeting_notes",
        name="Process Meeting Notes",
        description="Organize and summarize meeting notes",
        category="business",
        template="""Please process these meeting notes and provide:

Meeting notes:
[notes]

Output format: [output_format]

Include: [include_items]""",
        variables=[
            PromptVariable(
                name="notes",
                label="Meeting Notes",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Paste your meeting notes here..."
            ),
            PromptVariable(
                name="output_format",
                label="Output Format",
                type=VariableType.SELECT,
                required=True,
                options=["Structured summary", "Action items only", "Full minutes", "Executive summary"],
                default_value="Structured summary"
            ),
            PromptVariable(
                name="include_items",
                label="Include",
                type=VariableType.MULTISELECT,
                required=True,
                options=["Key decisions", "Action items", "Attendees", "Discussion summary", "Next steps", "Open questions"],
                default_value="Key decisions"
            )
        ],
        tags=["meeting", "notes", "business", "summary"]
    ),

    PromptTemplate(
        id="project_plan",
        name="Create Project Plan",
        description="Generate a project plan or roadmap",
        category="business",
        template="""Please create a project plan for:

Project: [project_name]
Goal: [project_goal]
Timeline: [timeline]
Team size: [team_size]

Key deliverables:
[deliverables]

Constraints or considerations:
[constraints]

Please include phases, milestones, and task breakdown.""",
        variables=[
            PromptVariable(
                name="project_name",
                label="Project Name",
                type=VariableType.TEXT,
                required=True,
                placeholder="Name of the project"
            ),
            PromptVariable(
                name="project_goal",
                label="Project Goal",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="What is the project trying to achieve?"
            ),
            PromptVariable(
                name="timeline",
                label="Timeline",
                type=VariableType.SELECT,
                required=True,
                options=["1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year"],
                default_value="1 month"
            ),
            PromptVariable(
                name="team_size",
                label="Team Size",
                type=VariableType.SELECT,
                required=True,
                options=["Solo (1 person)", "Small (2-5 people)", "Medium (6-15 people)", "Large (15+ people)"],
                default_value="Small (2-5 people)"
            ),
            PromptVariable(
                name="deliverables",
                label="Key Deliverables",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="List the main outputs/deliverables..."
            ),
            PromptVariable(
                name="constraints",
                label="Constraints/Considerations",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Budget, resources, dependencies, risks..."
            )
        ],
        tags=["project", "planning", "business", "roadmap"]
    ),

    # More general templates
    PromptTemplate(
        id="pros_cons",
        name="Pros and Cons Analysis",
        description="Analyze the pros and cons of a decision or option",
        category="analysis",
        template="""Please analyze the pros and cons of:

Decision/Option: [subject]

Context: [context]

Factors to consider:
[factors]

Please provide a balanced analysis with recommendations.""",
        variables=[
            PromptVariable(
                name="subject",
                label="Decision/Option",
                type=VariableType.TEXT,
                required=True,
                placeholder="What are you trying to decide?"
            ),
            PromptVariable(
                name="context",
                label="Context",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Provide background and relevant context..."
            ),
            PromptVariable(
                name="factors",
                label="Factors to Consider",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="List specific factors that matter to this decision..."
            )
        ],
        tags=["decision", "analysis", "pros", "cons"]
    ),

    PromptTemplate(
        id="brainstorm",
        name="Brainstorm Ideas",
        description="Generate creative ideas for a topic or challenge",
        category="general",
        template="""Please brainstorm ideas for:

Topic/Challenge: [topic]

Constraints:
[constraints]

Number of ideas: [num_ideas]
Creativity level: [creativity]

Context: [context]""",
        variables=[
            PromptVariable(
                name="topic",
                label="Topic/Challenge",
                type=VariableType.TEXT,
                required=True,
                placeholder="What do you need ideas for?"
            ),
            PromptVariable(
                name="constraints",
                label="Constraints",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any limitations or requirements?"
            ),
            PromptVariable(
                name="num_ideas",
                label="Number of Ideas",
                type=VariableType.SELECT,
                required=True,
                options=["5 ideas", "10 ideas", "20 ideas", "As many as possible"],
                default_value="10 ideas"
            ),
            PromptVariable(
                name="creativity",
                label="Creativity Level",
                type=VariableType.SELECT,
                required=True,
                options=["Practical/realistic", "Mix of practical and creative", "Wild/unconventional"],
                default_value="Mix of practical and creative"
            ),
            PromptVariable(
                name="context",
                label="Additional Context",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any background information..."
            )
        ],
        tags=["brainstorm", "ideas", "creative"]
    ),

    PromptTemplate(
        id="translate_text",
        name="Translate Text",
        description="Translate text between languages",
        category="writing",
        template="""Please translate the following text:

From: [source_language]
To: [target_language]

Text to translate:
[text]

Translation style: [style]

[notes]""",
        variables=[
            PromptVariable(
                name="source_language",
                label="Source Language",
                type=VariableType.SELECT,
                required=True,
                options=["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Other"],
                default_value="English"
            ),
            PromptVariable(
                name="target_language",
                label="Target Language",
                type=VariableType.SELECT,
                required=True,
                options=["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Other"],
                default_value="Spanish"
            ),
            PromptVariable(
                name="text",
                label="Text to Translate",
                type=VariableType.TEXTAREA,
                required=True,
                placeholder="Enter the text you want translated..."
            ),
            PromptVariable(
                name="style",
                label="Translation Style",
                type=VariableType.SELECT,
                required=True,
                options=["Literal (word-for-word)", "Natural (fluent)", "Formal", "Casual"],
                default_value="Natural (fluent)"
            ),
            PromptVariable(
                name="notes",
                label="Additional Notes",
                type=VariableType.TEXTAREA,
                required=False,
                placeholder="Any context or special terminology..."
            )
        ],
        tags=["translate", "language", "writing"]
    ),
]


def get_default_templates() -> List[Dict]:
    """Get all default templates as dictionaries."""
    return [template_to_dict(t) for t in DEFAULT_TEMPLATES]


def get_default_categories() -> List[Dict]:
    """Get all default categories as dictionaries."""
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "icon": c.icon,
            "color": c.color
        }
        for c in DEFAULT_CATEGORIES
    ]


def template_to_dict(template: PromptTemplate) -> Dict[str, Any]:
    """Convert a PromptTemplate to a dictionary."""
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "category": template.category,
        "template": template.template,
        "variables": [variable_to_dict(v) for v in template.variables],
        "examples": template.examples,
        "tags": template.tags,
        "isCustom": template.is_custom,
        "isPublic": template.is_public,
        "isFavorite": template.is_favorite,
        "createdBy": template.created_by,
        "createdAt": template.created_at.isoformat() if template.created_at else None,
        "updatedAt": template.updated_at.isoformat() if template.updated_at else None,
        "useCount": template.use_count
    }


def variable_to_dict(variable: PromptVariable) -> Dict[str, Any]:
    """Convert a PromptVariable to a dictionary."""
    result = {
        "name": variable.name,
        "label": variable.label,
        "type": variable.type.value,
        "required": variable.required,
        "placeholder": variable.placeholder,
        "defaultValue": variable.default_value,
        "options": variable.options,
        "helpText": variable.help_text
    }

    if variable.validation:
        result["validation"] = {
            "pattern": variable.validation.pattern,
            "minLength": variable.validation.min_length,
            "maxLength": variable.validation.max_length,
            "min": variable.validation.min_value,
            "max": variable.validation.max_value,
            "errorMessage": variable.validation.error_message
        }

    return result


# =============================================================================
# Custom Prompts Loading (from custom_prompts.yaml)
# =============================================================================

CUSTOM_PROMPTS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'custom_prompts.yaml'
)


def load_custom_prompts() -> Dict[str, Any]:
    """
    Load custom prompts from custom_prompts.yaml if it exists.

    Returns:
        Dictionary with 'categories' and 'templates' keys
    """
    if not os.path.exists(CUSTOM_PROMPTS_FILE):
        return {'categories': [], 'templates': []}

    try:
        with open(CUSTOM_PROMPTS_FILE, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}

        return {
            'categories': data.get('categories', []),
            'templates': data.get('templates', [])
        }
    except Exception as e:
        print(f"Warning: Failed to load custom prompts: {e}")
        return {'categories': [], 'templates': []}


def yaml_variable_to_dict(var: Dict) -> Dict[str, Any]:
    """Convert a variable from YAML format to frontend-compatible dict."""
    result = {
        "name": var.get('name', ''),
        "label": var.get('label', var.get('name', '')),
        "type": var.get('type', 'text'),
        "required": var.get('required', False),
        "placeholder": var.get('placeholder', ''),
        "defaultValue": var.get('default_value', var.get('defaultValue', '')),
        "options": var.get('options', []),
        "helpText": var.get('help_text', var.get('helpText', ''))
    }

    # Handle validation rules
    validation = var.get('validation', {})
    if validation:
        result["validation"] = {
            "pattern": validation.get('pattern'),
            "minLength": validation.get('min_length', validation.get('minLength')),
            "maxLength": validation.get('max_length', validation.get('maxLength')),
            "min": validation.get('min', validation.get('min_value')),
            "max": validation.get('max', validation.get('max_value')),
            "errorMessage": validation.get('error_message', validation.get('errorMessage'))
        }

    return result


def yaml_template_to_dict(template: Dict) -> Dict[str, Any]:
    """Convert a template from YAML format to frontend-compatible dict."""
    return {
        "id": template.get('id', ''),
        "name": template.get('name', ''),
        "description": template.get('description', ''),
        "category": template.get('category', 'general'),
        "template": template.get('template', ''),
        "variables": [yaml_variable_to_dict(v) for v in template.get('variables', [])],
        "examples": template.get('examples', []),
        "tags": template.get('tags', []),
        "isCustom": True,  # Mark all custom prompts
        "isPublic": template.get('is_public', False),
        "isFavorite": template.get('is_favorite', False),
        "createdBy": template.get('created_by'),
        "createdAt": template.get('created_at'),
        "updatedAt": template.get('updated_at'),
        "useCount": template.get('use_count', 0)
    }


def yaml_category_to_dict(category: Dict) -> Dict[str, Any]:
    """Convert a category from YAML format to frontend-compatible dict."""
    return {
        "id": category.get('id', ''),
        "name": category.get('name', ''),
        "description": category.get('description', ''),
        "icon": category.get('icon', ''),
        "color": category.get('color', '#3b82f6')
    }


def get_all_templates() -> List[Dict]:
    """
    Get all templates (default + custom) as dictionaries.
    Custom templates are loaded from custom_prompts.yaml.
    """
    # Start with default templates
    all_templates = [template_to_dict(t) for t in DEFAULT_TEMPLATES]

    # Load and add custom templates
    custom_data = load_custom_prompts()
    custom_templates = [yaml_template_to_dict(t) for t in custom_data.get('templates', [])]

    # Add custom templates (they'll appear after defaults)
    all_templates.extend(custom_templates)

    return all_templates


def get_all_categories() -> List[Dict]:
    """
    Get all categories (default + custom) as dictionaries.
    Custom categories are loaded from custom_prompts.yaml.
    """
    # Start with default categories
    all_categories = get_default_categories()
    default_ids = {c['id'] for c in all_categories}

    # Load and add custom categories (avoid duplicates)
    custom_data = load_custom_prompts()
    for cat in custom_data.get('categories', []):
        cat_dict = yaml_category_to_dict(cat)
        if cat_dict['id'] not in default_ids:
            all_categories.append(cat_dict)
            default_ids.add(cat_dict['id'])

    return all_categories
