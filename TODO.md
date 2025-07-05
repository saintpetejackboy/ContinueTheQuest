# Project TODO

This file tracks the remaining tasks and future enhancements for the ContinueThe.Quest platform.

## 🚀 Up Next: Core Feature Enhancements

### 1. Comments for Segments
- [x] **API**: Implement API endpoints for creating, reading, updating, and deleting comments on individual segments.
- [x] **UI**: Add comment threads to segment cards and the story reader modal.
- [x] **Real-time**: Ensure comments appear in real-time without a full page reload.

### 2. Image Uploads for Branches & Segments
- [x] **Branches**: Add functionality to upload, remove, and manage cover images for branches.
- [x] **Segments**: Allow a single image upload per segment during creation.
- [x] **Storage**: Integrate image uploads with the user storage quota system.
- [x] **Optimization**: Implement WebP conversion for all uploaded images to save space and improve performance.

### 3. Enhanced Story Reader
- [x] **Navigation**: Add "next" and "previous" buttons to navigate between segments in order.
- [x] **Styling**: Improve Markdown rendering with better CSS for a more polished look.
- [x] **Export**: Add options to download or export full stories/branches.
- [x] **Fullscreen Mode**: Implement a fullscreen or distraction-free reading mode.

### 4. Segment Management
- [ ] **CRUD**: Allow creators and admins to edit and delete segments.
- [ ] **Reordering**: Implement drag-and-drop reordering for segments within a branch.

## 5. User Contribution Pages
- [x] **My Media**: Implemented page and API to list user's created media. Sorting fixed.
- [x] **My Branches**: Implemented page and API to list user's created branches.
- [x] **My Segments**: Implemented page and API to list user's written segments.
- [x] **My Comments**: Implemented page and API to list user's posted comments.

## 🔧 Future Enhancements

### Story & Content Management
- [ ] **Collaborative Editing**: Allow multiple users to edit a segment with version history.
- [ ] **Series & Collections**: Group related media or branches into series.
- [ ] **Advanced Search**: Implement more powerful search and filtering options.
- [ ] **Progress Tracking**: Allow users to track their reading progress.
- [ ] **Bookmarking**: Let users bookmark their favorite media, branches, or segments.

### Admin & Moderation
- [ ] **Content Management**: Build a dashboard for bulk content management (hiding, deleting, etc.).
- [ ] **User Quotas**: Create a UI for admins to manage individual user storage quotas.
- [ ] **AI Models**: Develop an interface for managing AI models and their costs.
- [ ] **Moderation Dashboard**: A centralized dashboard for content moderation and abuse detection.

### Tagging System
- [ ] **Suggestions**: Implement tag suggestions and autocomplete during creation.
- [ ] **Admin Management**: A UI for admins to manage, merge, and delete tags.

## 📋 Testing Checklist

- [ ] **File Uploads**: Test quota enforcement, file type validation, and large file handling.
- [ ] **AI System**: Test with and without an API key, model selection, credit deduction, and error handling.
- [ ] **Permissions**: Thoroughly test admin, creator, and regular user permissions across all features.
- [ ] **Storage**: Verify storage calculation accuracy and quota display.

## 🐛 Known Issues

- **File Preview**: The upload preview can be made more user-friendly.
- **Error Handling**: Some API endpoints need more descriptive error messages.
- **Mobile UI**: The story upload interface needs to be optimized for mobile devices.
- **Performance**: Large file uploads could benefit from progress indicators.
