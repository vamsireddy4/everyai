---
name: Tool Moderation & Maintenance
description: Guidelines for reviewing, approving, and managing tool submissions for EveryAI's directory.
---

# Tool Moderation & Maintenance

This skill enables an autonomous agent to efficiently moderate and maintain EveryAI's tool directory, ensuring all listings are accurate and relevant.

## 🔍 Core Objectives
- Review and approve new tool submissions.
- Ensure all tool details (categories, descriptions, social links) are correct.
- Maintain high directory quality.
- Verify premium listings and ensure proper display.

## 🛠️ Tool Review & Approval Workflow

### 1. Daily Workflow
Check for new submissions in the **Admin Dashboard** (`admin.html`).
- **Review List:** View tools with `status: "pending"`.
- **Examine Details:** Check the tool name, website URL, description, and chosen category/subcategory.

### 2. Approval Criteria
A tool is eligible for approval if:
- [ ] **Valid URL:** The website must be live and functional.
- [ ] **Accurate Description:** Does the description accurately reflect the tool's core functionality?
- [ ] **Proper Category:** Is the tool placed in the most relevant category/subcategory?
- [ ] **Value Addition:** Does the tool offer genuine value or innovation in the AI space?

### 3. Moderation Actions
- **Approve:** Update status to `"approved"`. The tool will automatically appear in the live directory.
- **Decline:** Update status to `"declined"`. (Use the "Delete" action if it's spam).
- **Edit & Refine:** If the description or category needs adjustment, use the **Edit Tool** page (`edit-tool.html`).

## 💎 Premium & Featured Listing Verification

### 1. Payment Verification
For tools that select the **"Featured/Premium Listing"** plan:
- **Transaction ID:** Ensure a valid transaction ID exists (if available in the `formData`).
- **Confirmation:** Verify against external payment logs if necessary.
- **Priority:** Ensure premium listings are approved promptly.

### 2. Enhanced Features
- **Featured Placement:** "Featured/Premium" tools are prioritised in search results and category views.
- **Custom Banners:** Check for high-quality banner URLs or uploaded images. Verify them on the tool detail page (`tool.html`).

## 🧹 Maintenance & Quality Control

### 1. Link Checking
Periodically scan the directory for broken links or outdated tools. 
- Use the **Admin Tools Dashboard** to locate and delete inactive listings.

### 2. Category Optimization
Ensure new or trending AI subcategories are used for better user discovery. Use the **Edit Tool** page to re-categorize existing tools if needed.

## 🛠️ Technical Implementation
An agent should interface with the following Convex mutations and queries:
- `tools:getAllTools()` — To see the list of all submissions.
- `tools:updateToolStatus(id, "approved")` — To approve a tool.
- `tools:deleteTool(id)` — To remove spam or inactive tools.
- `tools:updateTool(formData)` — To refine existing listings.

### Quick Verification Checklist:
- [ ] Is the tool URL live?
- [ ] Is it placed in the correct category?
- [ ] Is the description clear and professional?
- [ ] For premium: Is payment verified?
