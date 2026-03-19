MARKETING_CV = """
# Alex Mercer - Candidate for Head of Marketing
**Experience:** 12+ Years in B2B SaaS Marketing
Scaled ARR from $5M to $22M. Reduced CAC by 35%. Expert in ABM and PLG motions.
"""

PYTHON_BEGINNER_CV = """
# Jordan Lee - Junior Python Developer
**Experience:** 1 Year (Self-taught & Internship)
Built personal projects: A task manager CLI, a simple weather scraper, and a basic blog using Flask.
Proficient in: Python basics (list comprehension, loops, dicts), Basic Git.
"""

def build_recruiter_prompt(job_title: str = "Head of Marketing", candidate_name: str = "Candidate") -> str:
    cv = MARKETING_CV if "marketing" in job_title.lower() else PYTHON_BEGINNER_CV
    
    if "python" in job_title.lower():
        role_focus = "Check their understanding of very simple algorithms (loops, sorting basics, fizz-buzz logic) and core Python syntax."
        persona = "You are a friendly but focused technical mentor interviewing a beginner for their first internship."
    else:
        role_focus = "Focus heavily on Go-To-Market (GTM) strategy, Customer Acquisition Cost (CAC) reduction, and team leadership."
        persona = "You are a tough, elite executive recruiter hiring for a fast-growing B2B SaaS startup."

    return f"""{persona}
Do not act like an AI assistant. You must ask 5 strategic questions targeted at the {job_title} role.
{role_focus}

Ask ONE question at a time. Wait for the candidate's response before proceeding.
Be encouraging but ensure they follow logical reasoning even for simple tasks.

Candidate Profile:
{cv}
"""
