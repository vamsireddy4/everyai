---
name: SEO-Optimized Content Management
description: Guidance for creating and managing SEO-optimized blog posts and prompts for EveryAI.
---

# SEO-Optimized Content Management

This skill provides comprehensive instructions for autonomously generating and managing high-quality, SEO-optimized content for the EveryAI platform.

## 📝 Core Objectives
- Create informative and engaging blog posts that rank high in search engines.
- Develop clear and effective prompts for various AI models.
- Maintain consistent brand voice and tone.
- Follow technical requirements for the EveryAI platform.

## 🚀 Blog Post Creation Workflow

### 1. Research & Planning
- **Topic Selection:** Choose topics relevant to AI tools, productivity, automation, or industry news.
- **Keyword Research:** Identify a primary keyword and 3-5 secondary keywords. Use tools like Google Trends or Ahrefs for inspiration.
- **Audience:** Target tech enthusiasts, AI developers, entrepreneurs, and productivity seekers.

### 2. Drafting the Content
- **Title:** Must be catchy and include the primary keyword towards the beginning. Keep it under 60 characters.
- **Opening:** Address the reader's problem or interest within the first two sentences. Include the primary keyword in the first 100 words.
- **Structure:** 
  - Use **H2 and H3 tags** to break down content into sections.
  - Keep paragraphs short (3-4 sentences).
  - Use bullet points and numbered lists for readability.
- **Keyword Density:** Maintain a natural keyword density of 1-1.5%. Avoid keyword stuffing.
- **Internal Linking:** Link to relevant EveryAI categories or other blog posts.
- **Call to Action (CTA):** End each post with a clear CTA (e.g., "Check out the tools here," "Subscribe for more AI tips").

### 3. SEO Optimization (Meta Data)
- **Slug:** URL-friendly version of the title (e.g., `best-ai-video-editors-2026`).
- **Excerpt:** A 150-160 character summary that includes the primary keyword (used for meta description).
- **Keywords:** Add relevant keywords separated by commas in the "SEO Keywords" field.

### 4. Technical Submission (Convex Integration)
When submitting a blog post to the Convex database:
- **Image:** Use a high-quality URL or upload a base64 string.
- **Content:** Use HTML for formatting. Ensure all tags are closed properly.
- **Mutation:** Use the `blogs:createBlog` mutation in Convex.

## 💡 Prompt Creation Guidelines

### 1. Structure
- **Title:** Clear and descriptive (e.g., "Rewrite Text for Better Clarity").
- **Content:** Detailed instructions for the AI model. Include examples if necessary.
- **Category:** Select the most appropriate category (e.g., Writing, Coding, Image Generation).

### 2. Quality Control
- Ensure the prompt delivers high-quality, consistent results across major LLMs (GPT-4, Claude 3.5, Gemini 1.5 Pro).
- Avoid vague instructions.

## 🎨 Visual Excellence
- Use high-quality header images (from Unsplash or generated via AI).
- Target image aspect ratio: 16:9.
- Ensure images are centered and visually appealing in the blog card preview.

## 🛠️ Technical Implementation
An agent should interface with the following Convex mutations:
- `blogs:createBlog(formData)`
- `prompts:createPrompt(formData)`

### Example `formData` for Blog:
```json
{
  "title": "Top 10 AI Tools for 2026",
  "slug": "top-10-ai-tools-2026",
  "excerpt": "Discover the most revolutionary AI tools in 2026 that will transform your workflow.",
  "category": "AI News",
  "readTime": 5,
  "imageUrl": "https://images.unsplash.com/photo-1677442136019-21780ecad995",
  "content": "<h1>Top 10 AI Tools...</h1><p>...</p>",
  "timestamp": "2026-02-28T14:30:00Z"
}
```
