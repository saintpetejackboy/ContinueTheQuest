ContinueThe.Quest Database Schema Documentation

This document outlines a comprehensive and scalable database schema for the ContinueThe.Quest platform. It clearly explains table structures, columns, interactions, sorting mechanisms, and optimization strategies for high-performance handling of large datasets.

General Database Design Principles

Scalability:

Use integer-based primary keys.

Index columns used frequently in WHERE clauses or JOINs.

Partition data logically (by user directories for file storage).

Performance:

Optimize queries with appropriate indexing.

Avoid redundant data; normalize where practical, but denormalize to optimize read-heavy operations.

Flexibility:

Use ENUM and flags judiciously for easily extendable features.

Ensure tagging systems and sorting preferences are modular and easily extendable.

Table Structure Overview

1. Users

Columns:

id: INT, auto-increment (PK)

username: VARCHAR, unique

passkey_id: VARCHAR, nullable (WebAuthn)

passphrase_hash: VARCHAR (fallback)

email: VARCHAR, optional

is_admin: TINYINT (0/1)

is_banned: TINYINT (0/1)

credit_balance: INT

sort_preference: ENUM ('new', 'hot', 'rising', 'popular'), default 'new'

created_at, last_active_at: DATETIME

Interactions:

Owns media, branches, segments, comments, tags.

Credits are awarded/deducted for interactions.

Sorting preferences are saved per user for consistent UX.

2. Media

Columns:

id: INT (PK)

title: VARCHAR, unique

description: TEXT

cover_image: VARCHAR

created_by: INT (FK: Users)

vote_score: INT (cached)

created_at: DATETIME

Interactions:

Has many branches.

Can be tagged extensively.

Sortable by votes, created date, recent activity.

3. Branches

Columns:

id: INT (PK)

media_id: INT (FK: Media)

title: VARCHAR

summary: TEXT

branch_type: ENUM ('before', 'after', 'other')

source_type: ENUM ('book', 'show', 'movie', 'other')

cover_image: VARCHAR

created_by: INT (FK: Users)

vote_score: INT (cached)

created_at: DATETIME

Interactions:

Has multiple segments.

Can be individually tagged.

Sortable by votes, recency, activity.

4. Segments

Columns:

id: INT (PK)

branch_id: INT (FK: Branches)

title: VARCHAR

markdown_body: LONGTEXT (stored as file on disk)

image_path: VARCHAR, optional

created_by: INT

vote_score: INT (cached)

order_index: INT

created_at: DATETIME

Interactions:

Each segment has markdown text stored separately to manage large content efficiently.

Sortable by index order, creation date, and votes.

5. Tags (Unified System)

Columns:

id: INT (PK)

name: VARCHAR, unique

is_genre: TINYINT

created_by: INT (NULL for admin)

created_at: DATETIME

Interactions:

Applied to media, branches, segments.

Tags marked as is_genre dynamically populate navigation.

Tags restricted per user to prevent spam; rewarded when creating novel tags.

6. Tag Links

Columns:

id: INT (PK)

tag_id: INT (FK: Tags)

target_type: ENUM ('media', 'branch', 'segment')

target_id: INT

tagged_by: INT (FK: Users)

tagged_at: DATETIME

Interactions:

Flexibly applies tags to various content types.

Ensures uniqueness per content-tag relationship.

7. Comments

Columns:

id: INT (PK)

segment_id: INT (FK: Segments)

user_id: INT (FK: Users)

body: TEXT

created_at: DATETIME

is_anonymous: TINYINT

Interactions:

User engagement via commenting on segments.

Sortable by recency, popularity (votes).

8. Votes

Columns:

id: INT (PK)

user_id: INT

target_type: ENUM ('media', 'branch', 'segment')

target_id: INT

vote_value: TINYINT

created_at: DATETIME

Interactions:

Drives visibility sorting (popular, hot).

9. Credits Log

Columns:

id: INT (PK)

user_id: INT

change_amount: INT

reason: VARCHAR

related_id: INT, optional

created_at: DATETIME

Interactions:

Tracks all credit changes per user.

10. Admin Moderation

Columns (Bans & Activity Logs):

id: INT (PK)

user_id: INT

ip_address: VARCHAR

device_hash: VARCHAR

action: VARCHAR

reason: TEXT

expires_at: DATETIME (for bans)

created_at: DATETIME

Interactions:

Ensures platform integrity, security, and moderation capability.

Sorting & Scalability Techniques

Sorting Options:

All tables and queries support flexible sorting (votes, recent activity, creation date).

Cache frequently updated counts (vote_score) to optimize sorting.

Scalability Practices:

Index frequently queried columns: foreign keys, dates, vote counts.

Limit joins; prefer caching and denormalization where performance-critical.

Use filesystem-based storage segmented per user to efficiently track quotas and optimize file retrieval.

Additional Recommendations

Partition large tables based on date (created_at) or other logical factors to enhance query performance.

Implement automated archiving strategies for historical data.

Consider read replicas for scaling read-heavy operations.

