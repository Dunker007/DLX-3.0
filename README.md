<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DLX-3.0 Co-Pilot with Story Writer Automation

This contains everything you need to run your DLX-3.0 AI Co-Pilot app locally, with comprehensive Story Writer automation for tracking project narratives.

View your app in AI Studio: https://ai.studio/apps/drive/1hU4eEF3UH7M7Ur00KFXP-Zn2PSeSOZVQ

## Run Locally

**Prerequisites:**  Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Features

### 🤖 Story Writer Automation
Comprehensive automated narrative tracking system that documents all significant repository events:

- **Automated Entry Generation**: Auto-create Story Writer entries from PR merges, issue closures, and releases
- **GitHub Workflows**: Two workflows for automation and conflict prevention
- **Template System**: Pre-filled templates for 6 entry types (Decision, Incident, Milestone, Routine, Rollback, Flip)
- **Performance Monitoring**: Track entry creation latency and ensure 2-3 minute quick-write criteria
- **Security Audit**: Complete audit trail for all narrative changes with role-based authorization
- **Validation**: Enforce minimum template structure with date/reference validation

### 📝 Core Modules
- **Dashboard**: Overview of all modules and system status
- **Chat**: Multi-mode AI chat (Standard, Low Latency, Deep Analysis, Web Search, Maps)
- **Vision**: Image generation and analysis
- **Generation**: Content generation capabilities
- **Live**: Real-time AI interactions
- **Local Studio**: Local model experimentation
- **Project Forge**: Project scaffolding and code generation
- **Story Writer**: Chronological narrative layer with automation
- **Feature Flags**: Feature flag management system

## Story Writer Automation

### Quick Start

Create a new entry from a template in the UI:
1. Navigate to the Story Writer module
2. Click "New Entry"
3. Select an entry type (Decision, Incident, Milestone, etc.)
4. Fill in the pre-populated template
5. Save (typically takes 2-3 minutes)

### GitHub Workflows

Two automated workflows are included:

#### 1. `story-writer-auto.yml`
Automatically generates Story Writer entries when:
- PRs are merged
- Issues are closed
- Releases are published
- Manual workflow dispatch

#### 2. `conflict-prevention.yml`
Prevents and detects merge conflicts:
- Checks for conflicts on PR updates
- Posts comments with resolution instructions
- Verifies branch protection rules
- Runs daily to check for stale PRs

### Programmatic Usage

```typescript
import { automationService } from './services/automationService';
import { entryTemplateFactory } from './services/templateValidator';
import { EntryType } from './types';

// Configure automation
automationService.setConfig({
  enableAutomation: true,
  autoPublish: false,
  defaultAuthor: 'mini-lux',
  includeReferences: true,
});

// Create from template
const entry = entryTemplateFactory.createFromTemplate(EntryType.Decision);

// Auto-populate with Git context
const enriched = entryTemplateFactory.autoPopulateContext(entry, {
  commitSha: 'abc1234',
  prNumber: 42,
});
```

For complete documentation, see [docs/STORY_WRITER_AUTOMATION.md](docs/STORY_WRITER_AUTOMATION.md)

## Architecture

### Services
- `automationService.ts` - Rule-based entry creation from GitHub events
- `performanceMonitoringService.ts` - Latency tracking and performance validation
- `securityService.ts` - Audit logging and role-based authorization
- `templateValidator.ts` - Entry validation and template generation
- `storyWriterService.ts` - Core Story Writer functionality with automation integration
- `geminiService.ts` - Gemini AI model integration
- `featureFlagService.ts` - Feature flag management
- `telemetryService.ts` - Event logging and metrics

### Components
- Story Writer UI with timeline, editor, and references panel
- Template picker with visual entry type selection
- Feature flag management interface
- AI chat interfaces for multiple modes
- Project scaffolding tools

## Performance

- **Build Time**: 1.68s (Target: <2s) ✅
- **Entry Creation**: <3 minutes (Target: 2-3 minutes) ✅
- **Search Performance**: <1 second ✅

## Success Criteria

### Phase 1 Deliverables ✅
- [x] Automated entry generation from PR merges
- [x] Cross-link ID system implementation
- [x] Security audit logging
- [x] Performance monitoring
- [x] Template validation system
- [x] GitHub workflow automation
- [x] 100% coverage for flips/rollbacks/incidents within 5 minutes

## Contributing

1. Create entries using templates via the UI
2. Automated entries are created as drafts by default
3. Review and publish automated entries
4. All changes are audit-logged for traceability

## Documentation

- [Story Writer Automation Guide](docs/STORY_WRITER_AUTOMATION.md) - Complete automation documentation
- Inline code comments and TypeScript types
- GitHub workflow documentation

## License

See LICENSE file for details.
