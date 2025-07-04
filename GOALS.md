ContinueThe.Quest Project Documentation

Project Overview

ContinueThe.Quest is a collaborative storytelling platform that allows users and AI to expand and continue unfinished stories or universes from various media sources such as TV shows, movies, books, and games. Users can add original media, create story branches, write or generate content segments, and interact through comments, votes, and tags. The goal is to foster a dynamic community-driven environment that scales efficiently and is highly performant.

Tech Stack

Backend: PHP (Fast, procedural programming style)

Frontend: Vanilla JavaScript, Tailwind CSS

Database: MariaDB

Storage: File-system based for large textual content and user assets

Authentication: WebAuthn (Passkey-first), with fallback passphrase

Project Goals

Facilitate easy collaboration on unfinished or alternate story universes.

Maintain high-performance and scalability to accommodate large-scale user-generated content.

Provide flexible and intuitive tagging, sorting, and navigation systems.

Foster a strong community with incentivized interactions and clear credit systems.

Ensure robust moderation tools for platform security and integrity.

Core Functionality

User Authentication

Passkey-first authentication (WebAuthn)

Optional fallback passphrase login

Robust account recovery and moderation capabilities

Media Creation

Users create media entries, providing a title, description, and cover image.

Media entries act as containers for story branches.

Tags are applied for categorization and enhanced discoverability.

Story Branches

Within media entries, users can create multiple narrative branches.

Branches can specify if they are before, after, or alternate to existing stories.

Each branch holds segments, representing chapters or narrative sections.

Content Segments

Individual segments are Markdown-based textual content stored on disk for efficient retrieval.

Each segment can include an optional cover image.

Supports both user-generated and AI-assisted content creation.

Tagging System

Unified tagging system used across media, branches, and segments.

Special tags flagged by admins (is_genre) automatically populate navigation and site content.

Users can add new tags with limitations to prevent spam, incentivizing valuable tagging.

Community Interaction

Users can comment, vote, and engage with media, branches, and segments.

User interactions generate credit awards, incentivizing participation.

Flexible sorting options (new, hot, popular, rising) applied throughout the site, with user preference saving.

Credit System

Credits tracked and logged for all user actions.

Credit spending required for certain actions (e.g., AI-assisted content).

Moderation and Admin Tools

Comprehensive moderation including banning, throttling, and activity monitoring.

Admin dashboard for content and user management.
