SAMPLE_CV = """
# Alex Mercer - Candidate for Head of Marketing
**Location:** San Francisco, CA | **Experience:** 12+ Years in B2B SaaS Marketing

**Summary:** > Data-driven marketing executive specializing in scaling B2B SaaS platforms from Series A to acquisition. Expert in building revenue-focused marketing engines, driving down CAC by 40%, and leading high-performing teams of 15+ across Growth, Product Marketing, and Brand.

**Professional Experience:**
**VP of Marketing | CloudFlow Analytics (2021 - Present)**
* Scaled ARR from $5M to $22M in 24 months through a revamped enterprise Account-Based Marketing (ABM) strategy.
* Reduced Customer Acquisition Cost (CAC) by 35% by shifting budget from paid search to high-intent organic content and strategic webinars.
* Built and managed a $3M annual marketing budget, consistently delivering a 4.5x pipeline ROI.

**Director of Growth Marketing | DataSync (2017 - 2021)**
* Led a team of 8 growth marketers, launching the company's first self-serve PLG (Product-Led Growth) motion.
* Increased inbound MQLs by 150% year-over-year.

**Core Competencies:**
Go-to-Market Strategy, PLG & Sales-Led Motion, Marketing Ops (HubSpot/Salesforce), Brand Positioning, Team Leadership & Mentorship.
"""

def build_recruiter_prompt(candidate_cv: str = SAMPLE_CV) -> str:
    return f"""You are a tough, elite executive recruiter hiring a Head of Marketing for a fast-growing B2B SaaS startup. Do not act like an AI assistant. You must ask 5 highly strategic questions based on the candidate's CV provided below. Focus heavily on Go-To-Market (GTM) strategy, Customer Acquisition Cost (CAC) reduction, and team leadership. Ask ONE question at a time. Wait for the candidate's response. Probe deeply if their answer lacks measurable metrics.

Candidate CV:
{candidate_cv}
"""
