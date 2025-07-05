 # Project TODO

 > **Context:** See [GOALS.md](../GOALS.md) and [project.md](../project.md) for goals and overview.

 This document captures outstanding tasks and enhancement ideas for ContinueThe.Quest.

 ## Immediate Fixes

 1. **Nested Comments Visibility**
    - On the Media page, nested comments are saved but not displayed after page refresh. Fix retrieval and rendering of comment threads.

 2. **Image Upload Dialog**
    - On the Media creation/edit page, the file dialog opens twice on image upload. Eliminate the duplicate trigger.

 3. **Credits Deduction for Tags** (✅ Implemented)
    - Ensure credits are properly deducted when a user purchases a new tag. Allow free re-use of existing tags.
    - Display the user's remaining credits before confirming a tag purchase.

 ## Short-Term Enhancements

 4. **Tiered Commenting & Voting** (✅ Implemented for Media & Branch pages)
    - Nested comments now auto-expand (media & branch).
    - Vote buttons on media, branches, comments, and images record and display scores.

 5. **Storage Quota Tracking**
    - Enforce per-user disk quotas for uploaded text segments and images. Display usage stats in the user profile.

 6. **AI Generation Credit Management**
    - Integrate AI ending generation flows with precise credit consumption metrics.
    - Cache or reuse AI-generated content to conserve credits and reduce API calls.

 7. **Admin Credit Controls**
    - Build UI for administrators to manually add or deduct user credits.

 8. **Credit History UI**
    - Add a page for users to review their credit earning/spending history.

 9. **Branch & Story Support** (🛠 In progress)
    - Flesh out backend API and database support for branch creation, listing, and merging (e.g., `/api/branches/*`, `source_types` table).
    - Implement dynamic `source_types` table and admin GUI to manage source type options for branches.
    - Flesh out story/segment uploads in branches: file storage, quota enforcement, AI generation stubs (OpenAI integration, API key from `.env`).

 ## Long-Term Roadmap

 9. **Payment Processing Integration** (postpone until core is stable)
    - Integrate payment gateways for purchasing credits.

 10. **Advanced AI Features**
     - Support different generation models, style guidance, and multi-turn content refinement.

 11. **Analytics & Moderation Tools**
     - Provide dashboards for user engagement metrics, content moderation queues, and abuse detection.

 12. **Performance & Scaling**
     - Implement caching layers, database partitioning/sharding, and background job queues for long-running tasks.

 13. **Mobile App / API Clients**
     - Develop native mobile or third-party client integrations using the REST API.