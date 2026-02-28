---
name: EveryAI Platform Management Workflow
description: A comprehensive workflow for an autonomous agent to manage all aspects of the EveryAI platform.
---

# EveryAI Platform Management Workflow

This workflow provides a high-level orchestration for an autonomous agent to manage EveryAI effectively.

## 🏁 Objective
To autonomously manage EveryAI's tool directory, content generation (blogs & prompts), and user engagement (messages & comments).

## 🚀 Execution Cycle

### 1. Daily Platform Check 
Identify active tasks and pending items:
- [ ] **Review Tool Submissions:** Check `admin.html` for "pending" status tools.
- [ ] **Check Support Messages:** View the dashboard at `admin-support.html`.
- [ ] **Check User Comments:** Monitor the feedback loop in `admin-support.html`.
- [ ] **Analyze Performance:** View the **Daily Traffic** and **Submissions** stats on the dashboard.

### 2. Actionable Tasks

#### **✅ Tool Moderation**
*If there are pending tools:*
1.  **Examine** the tool's details and URL.
2.  **Verify** if the category and description are accurate.
3.  **Approve** tools that meet the criteria or **Delete** spam.
- **Reference Skills:** [Tool Moderation & Maintenance Skill](../skills/tool-moderation/SKILL.md)

#### **✅ User Support & Engagement**
*If there are new messages or comments:*
1.  **Read** the full message or comment in the detail view.
2.  **Respond** via email (using `mailto:`) with a helpful and professional response.
3.  **Moderate** comments to keep the community clean.
- **Reference Skills:** [Support & User Engagement Skill](../skills/user-engagement/SKILL.md)

#### **✅ Content Creation & Optimization**
*To maintain active growth:*
1.  **Generate** 1-2 SEO-optimized blog posts per week based on current AI trends.
2.  **Add** 5-10 high-quality prompts to the "Prompts" section every week.
3.  **Optimise** existing metadata for better ranking.
- **Reference Skills:** [SEO-Optimized Content Management Skill](../skills/seo-content-management/SKILL.md)

### 3. SEO & Analytics Review
*Periodically (e.g., weekly):*
1.  Review **Daily Traffic** trends to identify popular pages.
2.  Adjust **SEO keywords** for blogs and prompts to capture more traffic.
3.  Ensure all **header tags (H1, H2, H3)** and **meta descriptions** are optimized.

## 🛠️ Tooling & Integration
The agent interacts directly with the **Admin UI** and **Convex mutations**:
- **UI Pages:** `admin.html`, `admin-support.html`, `admin-blogs.html`, `admin-prompts.html`.
- **Backend:** [Convex Database and Mutations](/convex/).

### Quality Standards Checklist:
- [ ] Is the content SEO-optimized?
- [ ] Are user responses helpful and timely?
- [ ] Is the tool directory clean and accurate?
- [ ] Does everything match the EveryAI brand?
