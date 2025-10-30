# Pull Request Management Guide

## Current Pull Request Status (as of 2025-10-30)

### PR #1: Upgrade to v4.1 with Enterprise Features
- **Status**: ❌ **BLOCKED** - Merge conflicts
- **Branch**: `copilot/justify-version-upgrade`
- **Base**: `main` (SHA: a1b3e83c)
- **Head**: SHA: eb4786fb
- **Changes**: +6,139 additions, -28 deletions, 23 files changed
- **Issue**: `mergeable_state: dirty` - Has conflicts with main branch
- **Description**: Implements enterprise-grade capabilities including security, analytics, multi-model AI, collaboration, performance monitoring, keyboard shortcuts, workspace persistence, and automation

#### Recommended Actions for PR #1:
1. **CRITICAL**: Resolve merge conflicts before merging
2. The conflicts are likely due to the main branch advancing since this PR was created
3. Steps to resolve:
   ```bash
   git checkout copilot/justify-version-upgrade
   git fetch origin
   git rebase origin/main
   # Resolve conflicts
   git push --force-with-lease
   ```
4. After resolving conflicts, verify build and tests still pass
5. This PR should be merged FIRST as it has the most extensive changes

### PR #2: Story Writer Automation
- **Status**: ⚠️ **READY** - Mergeable but unstable
- **Branch**: `copilot/implement-story-writer-automation`
- **Base**: `main` (SHA: 55135209)
- **Head**: SHA: 9b608bdd
- **Changes**: +4,358 additions, -10 deletions, 12 files changed
- **Issue**: `mergeable_state: unstable` - May have CI/test failures
- **Description**: Implements automated narrative tracking with GitHub workflows, template system, and Story Writer services

#### Recommended Actions for PR #2:
1. Check CI/workflow status to understand why it's "unstable"
2. May have dependencies on PR #1 features (automationService, performanceMonitoringService, securityService)
3. **WAIT** for PR #1 to merge first to avoid conflicts
4. Rebase on latest main after PR #1 merges

### PR #4: Copilot Instructions
- **Status**: ✅ **READY** - Clean and mergeable
- **Branch**: `copilot/set-up-copilot-instructions`
- **Base**: `main` (SHA: 55135209)
- **Head**: SHA: 6feb862b
- **Changes**: +2,586 additions, 0 deletions, 2 files changed
- **Issue**: None - Ready to merge
- **Description**: Adds `.github/copilot-instructions.md` to guide GitHub Copilot coding agent

#### Recommended Actions for PR #4:
1. This PR is clean and can be merged immediately
2. Has no conflicts with other PRs
3. Can be merged independently or wait for others

### PR #5: Handle Pull Request Operations (Current)
- **Status**: 🚧 **IN PROGRESS**
- **Branch**: `copilot/manage-pull-requests`
- **Purpose**: Create documentation and tooling to manage PRs

## Recommended Merge Order

### Option 1: Conservative Approach (Recommended)
1. **Merge PR #4** (Copilot Instructions) - No dependencies, clean state
2. **Resolve and Merge PR #1** (v4.1 Upgrade) - Foundational changes, resolve conflicts first
3. **Rebase and Merge PR #2** (Story Writer) - May depend on PR #1 services
4. **Complete PR #5** (PR Management) - This current PR

### Option 2: Fast-track Core Features
1. **Resolve and Merge PR #1** (v4.1 Upgrade) - Get enterprise features in
2. **Merge PR #4** (Copilot Instructions) - Independent, quick win
3. **Rebase and Merge PR #2** (Story Writer) - Now compatible with PR #1 services
4. **Complete PR #5** (PR Management) - Document final state

## Conflict Resolution Guide

### For PR #1 Merge Conflicts

The conflicts in PR #1 are preventing merge. Here's how to diagnose:

```bash
# Check what conflicts exist
git checkout copilot/justify-version-upgrade
git fetch origin
git merge origin/main --no-commit --no-ff

# See conflicted files
git diff --name-only --diff-filter=U

# Common conflict areas likely include:
# - package.json (version numbers)
# - App.tsx (new modules/imports)
# - types.ts (new type definitions)
# - README.md (documentation updates)
```

### Common Conflict Patterns

1. **Version conflicts in package.json**: Keep PR #1's version (4.1.0)
2. **Import conflicts in App.tsx**: Merge both sets of imports
3. **Type definition conflicts**: Merge new types from both branches
4. **Documentation conflicts**: Combine information from both

## PR Dependencies

```
PR #1 (v4.1 Upgrade)
  ├── Provides: automationService, securityService, performanceMonitoringService
  └── Required by: PR #2 (Story Writer references these services)

PR #2 (Story Writer)
  ├── Uses: automationService (from PR #1)
  ├── Uses: performanceMonitoringService (from PR #1)
  └── Uses: securityService (from PR #1)

PR #4 (Copilot Instructions)
  └── Independent: No dependencies

PR #5 (PR Management)
  └── Documents: All above PRs
```

## Next Steps

1. **Immediate**: Resolve PR #1 merge conflicts
2. **Then**: Merge PRs in recommended order
3. **Finally**: Update this management doc with lessons learned
4. **Consider**: Set up branch protection rules to prevent future conflicts

## Prevention Strategies

### For Future PRs:
1. **Keep PRs up-to-date**: Regularly rebase on main
2. **Smaller PRs**: Break large features into smaller, mergeable chunks
3. **CI/CD**: Ensure all tests pass before marking ready for review
4. **Branch protection**: Require up-to-date branches before merging
5. **Communication**: Coordinate between related PRs to avoid conflicts

## Tools and Commands

### Check PR Status Locally
```bash
# List all remote branches
git branch -r

# Check if branch is mergeable
git checkout <branch>
git merge-base HEAD origin/main
git merge origin/main --no-commit --no-ff

# Abort merge check
git merge --abort
```

### Update PR Branch
```bash
git checkout <branch>
git fetch origin
git rebase origin/main
# or
git merge origin/main
```

### Force Update After Rebase
```bash
git push --force-with-lease origin <branch>
```
