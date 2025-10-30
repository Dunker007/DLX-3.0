# Pull Request Management System

This directory contains tools and workflows to help manage pull requests in the DLX-3.0 repository.

## Overview

The PR management system provides:

1. **Automated Health Checks** - Daily checks for merge conflicts and PR status
2. **Status Checker Script** - Manual script to check all PR statuses locally
3. **Management Documentation** - Comprehensive guide for resolving conflicts and managing PRs
4. **GitHub Actions Workflow** - Automated notifications for conflicts

## Quick Start

### Check PR Status Locally

Run the PR status checker script:

```bash
bash .github/scripts/check-pr-status.sh
```

This will:
- List all open PR branches
- Check each branch for merge conflicts
- Show how many commits each branch is ahead of main
- Display when each branch was last updated
- Provide recommendations for next steps

### View PR Management Guide

See [PR_MANAGEMENT.md](../../PR_MANAGEMENT.md) for:
- Current status of all open PRs
- Recommended merge order
- Conflict resolution guidance
- Dependency mapping between PRs
- Prevention strategies for future conflicts

## Automated Workflows

### PR Health Check Workflow

File: `.github/workflows/pr-health-check.yml`

**Triggers:**
- Daily at 9 AM UTC (scheduled)
- On PR open, update, or reopen
- Manual workflow dispatch

**Actions:**
- Checks all PR branches for conflicts with main
- Posts summary to workflow run
- Comments on PRs with conflicts
- Creates issues if conflicts persist (on schedule)

**View Results:**
- Go to Actions tab → PR Health Check workflow
- View the latest run's summary for detailed status

## Files in This System

```
.github/
├── scripts/
│   └── check-pr-status.sh       # Local PR status checker
└── workflows/
    └── pr-health-check.yml      # Automated PR health monitoring

PR_MANAGEMENT.md                 # Comprehensive PR management guide
```

## Usage Examples

### Before Merging a PR

1. Check current status:
   ```bash
   bash .github/scripts/check-pr-status.sh
   ```

2. Review the management guide:
   ```bash
   cat PR_MANAGEMENT.md
   ```

3. If conflicts exist, follow the resolution guide in PR_MANAGEMENT.md

### Resolving Merge Conflicts

For a specific PR branch:

```bash
# Checkout the PR branch
git checkout copilot/branch-name

# Update local main
git fetch origin

# Try to rebase on main
git rebase origin/main

# If conflicts occur, resolve them in your editor
# Then continue the rebase
git add .
git rebase --continue

# Force push the updated branch
git push --force-with-lease origin copilot/branch-name
```

### Checking a Specific PR

```bash
# Checkout the PR branch
git checkout copilot/branch-name

# Try a test merge
git merge origin/main --no-commit --no-ff

# If successful:
git merge --abort

# If conflicts, you'll see the conflicting files
```

## Workflow Permissions

The PR health check workflow requires:
- `contents: read` - To read repository content
- `pull-requests: write` - To comment on PRs
- `issues: write` - To create conflict notification issues

## Customization

### Change Check Schedule

Edit `.github/workflows/pr-health-check.yml`:

```yaml
on:
  schedule:
    - cron: '0 9 * * *'  # Change this cron expression
```

### Modify Conflict Detection

Edit `.github/scripts/check-pr-status.sh` to customize:
- Which branches to check
- How to report conflicts
- Additional checks to perform

## Troubleshooting

### Script Shows "Not a git repository"

Make sure you're running from the repository root:
```bash
cd /path/to/DLX-3.0
bash .github/scripts/check-pr-status.sh
```

### Workflow Not Running

1. Check that GitHub Actions are enabled in repository settings
2. Verify workflow file syntax
3. Check workflow permissions
4. View Actions tab for error messages

### False Conflict Reports

The automated checks may sometimes report conflicts that don't exist. Always:
1. Verify locally with the check script
2. Manually test merge before acting on automation

## Best Practices

1. **Check Before Creating PR**: Run status checker before creating new PRs
2. **Keep PRs Updated**: Regularly rebase on main to avoid conflicts
3. **Small PRs**: Smaller PRs are easier to merge and less likely to conflict
4. **Review Dependencies**: Check PR_MANAGEMENT.md for PR dependencies
5. **Coordinate Changes**: Communicate with other PR authors about overlapping changes

## Contributing

When adding new PR management features:

1. Update PR_MANAGEMENT.md with new procedures
2. Add tests for new scripts
3. Document changes in this README
4. Update workflow if automation changes

## Support

For help with PR management:
1. Review [PR_MANAGEMENT.md](../../PR_MANAGEMENT.md)
2. Run the status checker script
3. Check GitHub Actions workflow results
4. Consult with repository maintainers
