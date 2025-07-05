# CTQ Project TODO

This file tracks remaining changes needed for the branch page and story system improvements.

## ✅ COMPLETED

### Critical Fixes
- [x] **Profile Image 404**: Fixed avatar path to use `/avatars/` subdirectory ✅
- [x] **Storage Quota Error**: Fixed `formatBytes` function variable scope issue ✅  
- [x] **Mandatory AI Tags**: Implemented non-removable AI tags with `is_mandatory` field ✅
- [x] **MediaPage Warning**: Changed router warning to debug level ✅

### High Priority Items
- [x] **Branch Page Permissions**: Hide order index from non-admins and non-creators ✅
- [x] **Profile Images**: Add miniature user profile images next to branch creator names ✅
- [x] **AI Models Database**: Create `ai_models` table with descriptions and cost tracking ✅
- [x] **Dynamic AI Models**: Replace hardcoded models with database-driven system ✅
- [x] **API Key Validation**: Add OpenAI API key validation from .env file with admin warnings ✅
- [x] **Storage Quota**: Implement user storage quota checking for story uploads ✅
- [x] **AI Tagging**: Add mandatory AI tagging system for AI-assisted content ✅
- [x] **Database Schema**: Remove `markdown_body` from segments table, use file links ✅
- [x] **AI Generation**: Full OpenAI API integration with content generation ✅
- [x] **Segment Display**: Show segments on branch pages with tags and metadata ✅
- [x] **Story Reader**: In-browser story rendering with markdown support ✅

### Database Changes
- [x] Created `ai_models` table with name, description, cost_per_use, is_active fields
- [x] Migrated segments table from `markdown_body` to `file_path`
- [x] Added file storage system in `/uploads/users/{user_id}/segments/`

### API Endpoints
- [x] `/api/ai/models.php` - Get available AI models
- [x] `/api/ai/status.php` - Check AI system status and API key availability  
- [x] `/api/ai/generate.php` - Generate AI content with OpenAI integration
- [x] `/api/users/storage.php` - Get user storage usage and quota
- [x] `/api/segments/upload.php` - Upload story segments with quota checking
- [x] `/api/segments/list.php` - Get segments for a branch with tags and metadata
- [x] `/api/segments/content.php` - Get content of a specific segment for reading

---

## 🔄 REMAINING ITEMS

### Medium Priority Items

#### 1. **Voting System for Segments** 🔄
- [ ] Add voting buttons to individual segments
- [ ] Implement segment voting API endpoint  
- [ ] Update vote counts in real-time
- [ ] Add voting to segment reader modal

#### 2. **Comments for Segments** 🔄
- [ ] Add individual comment threads for each segment
- [ ] Implement segment comment API endpoints
- [ ] Add comment display in segment cards
- [ ] Add commenting to segment reader modal

#### 3. **Image Upload for Branches and Segments** 🔄
- [ ] Add branch cover image upload/remove functionality
- [ ] Implement single image upload for segments during upload
- [ ] Create image management UI (similar to media page)
- [ ] Add image quota checking to storage system

#### 4. **Enhanced Story Reader** 🔄
- [ ] Add story navigation (next/previous segments in order)
- [ ] Improve markdown rendering with proper CSS
- [ ] Add export/download options for full stories
- [ ] Add fullscreen reading mode

#### 5. **Segment Management** 🔄
- [ ] Add edit/delete segment functionality for creators/admins
- [ ] Implement segment reordering (drag & drop)
- [ ] Add segment duplication feature
- [ ] Add bulk segment operations

---

## 🎯 TECHNICAL REQUIREMENTS

### File Upload System
- ✅ Quota checking against `users.quota` (bytes)
- ✅ File validation (size, type)
- ✅ User directory structure: `/uploads/users/{user_id}/segments/`
- [ ] Image directory: `/uploads/users/{user_id}/images/`
- [ ] WebP conversion for uploaded images

### AI Integration
- ✅ Model selection from database
- ✅ Cost estimation and credit deduction
- ✅ API key validation
- ✅ OpenAI API integration for story generation
- ✅ AI-generated content tagging enforcement

### Tagging System
- ✅ Credit cost for new tags (1 credit each)
- ✅ Free reuse of existing tags
- ✅ Mandatory "AI-Assisted" tags for AI content
- [ ] Tag suggestions and autocomplete
- [ ] Tag management UI for admins

### Comments and Voting
- ✅ Existing system works for branches
- ✅ Segment display and metadata
- [ ] Extend to segments with individual threads
- [ ] Voting on individual segments
- [ ] Moderation tools for admins

---

## 🔧 FUTURE ENHANCEMENTS

### Story Management
- [ ] Segment reordering (drag & drop)
- [ ] Collaborative editing permissions
- [ ] Version history for segments
- [ ] Story compilation/export features

### Content Organization
- [ ] Series and collections
- [ ] Advanced search and filtering
- [ ] Reading progress tracking
- [ ] Bookmarking system

### Admin Features
- [ ] Bulk content management
- [ ] User quota management UI
- [ ] AI model management interface
- [ ] Content moderation dashboard

---

## 📋 TESTING CHECKLIST

### File Upload
- [ ] Test quota enforcement
- [ ] Test file type validation
- [ ] Test large file handling
- [ ] Test concurrent uploads

### AI System
- [ ] Test with/without API key
- [ ] Test model selection and cost calculation
- [ ] Test credit deduction
- [ ] Test error handling

### Permissions
- [ ] Test admin vs creator vs regular user permissions
- [ ] Test order index visibility
- [ ] Test editing restrictions

### Storage
- [ ] Test storage calculation accuracy
- [ ] Test quota display formatting
- [ ] Test cleanup on upload failure

---

## 🐛 KNOWN ISSUES

1. **File Preview**: Upload preview shows storage info but could be more user-friendly
2. **Error Handling**: Some API endpoints need better error messages
3. **Mobile UI**: Upload interface may need mobile optimization
4. **Performance**: Large file uploads might need progress indicators

---

## 📝 NOTES

- All high-priority items have been completed successfully
- Database migrations have been run and schema updated
- New API endpoints are functional and secured
- File upload system includes proper validation and quota checking
- AI system includes admin warnings and proper model management

**Next Steps**: Focus on completing the medium-priority items, starting with segment display and management features.