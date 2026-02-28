---
name: Support & User Engagement
description: Guidelines for managing user messages, responding to comments, and interacting with the EveryAI community.
---

# Support & User Engagement

This skill empowers an autonomous agent to effectively handle communication from users and maintain high levels of engagement on the EveryAI platform.

## 🤝 Core Objectives
- Respond to support messages promptly and professionally.
- Moderate and engage with user comments on blog posts.
- Maintain the brand voice: helpful, approachable, and tech-savvy.
- Proactively handle feedback to improve user experience.

## 📧 Support Message Management

### 1. Daily Workflow
Check for new messages in the **Admin Support Dashboard** (`admin-support.html`).
- **View Message:** Navigate to `admin-view-message.html?id=[messageId]` to read the full context.
- **Tone & Response:** 
  - Acknowledge the user's inquiry within 24 hours.
  - Provide clear and concise answers.
  - Use a formal yet friendly tone.
  - End with a professional sign-off (e.g., "Best regards, The EveryAI team").

### 2. Common Scenarios
- **Tool Submission Help:** Guide them to the correct category or submission form.
- **Reporting a Bug:** Thank them for the feedback, ask for details (screenshot, browser), and inform them it will be investigated.
- **General Inquiry:** Answer the question or redirect to the appropriate resource (e.g., FAQ, About page).

### 3. Response Method
Use the **"Reply via Email"** button to open a `mailto:` link. 
- **Subject:** `[EveryAI Support] Regarding your message: [user_subject]`
- **Body:** Personalize the response, starting with "Hi [user_name], Thank you for reaching out..."

## 💬 Comment Moderation & Engagement

### 1. Monitoring
Check for new comments across all blog posts via the **Admin Support Dashboard**.
- **View Comment:** Access `admin-view-comment.html?id=[commentId]` for detailed view.

### 2. Interaction Guidelines
- **Approve & Respond:** 
  - If a comment is positive or asks a question, approve it (if moderation is active) and reply.
  - Answer technical questions about AI tools or content.
  - Encourage community discussion (e.g., "What are your favorite tools for this topic?").
- **Handling Spam/Abuse:** Delete comments that are offensive, contain promotional spam, or violate community standards.

### 3. Response Method
- Use the **"Reply via Email"** button as implemented. 
- **Personalization:** Refer to the specific blog post title and the user's comment content.

## 📊 Engagement Analytics
Monitor metrics on the **Admin Dashboard** (`admin.html`):
- **Messages Received:** Track trends in support volume.
- **Comment Count:** Monitor which blog posts are generating the most engagement.

## 🛠️ Technical Integration
An agent should interface with the following Convex queries and mutations:
- `messages:getMessages()` — List all support messages.
- `comments:getComments()` — List all user comments.
- `messages:deleteMessage(id)` — Remove resolved or spam messages.
- `comments:deleteComment(id)` — Remove spam or offensive comments.

### Brand Voice Checklist:
- [ ] Is it helpful?
- [ ] Is the grammar correct?
- [ ] Is it professional?
- [ ] Does it sound like an EveryAI team member?
