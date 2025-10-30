#!/bin/bash

# PR Status Checker
# This script checks the status of all open PRs and identifies issues

echo "🔍 Checking Pull Request Status..."
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)

# Fetch all branches first
echo "Fetching all branches..."
git fetch --all --quiet 2>/dev/null || echo "  (Some refs may not be available)"
echo ""

# Determine base branch (main or master)
BASE_BRANCH="main"
if ! git rev-parse origin/main >/dev/null 2>&1; then
    if git rev-parse origin/master >/dev/null 2>&1; then
        BASE_BRANCH="master"
    else
        echo -e "${YELLOW}⚠ Warning: Cannot find origin/main or origin/master${NC}"
        echo "  This script requires a base branch to compare against."
        echo "  PRs will be analyzed without merge conflict detection."
        echo ""
    fi
fi

echo -e "${BLUE}Base branch: origin/$BASE_BRANCH${NC}"
echo ""

# Get list of all remote PR branches
PR_BRANCHES=$(git branch -r | grep 'origin/copilot/' | grep -v HEAD | sed 's|origin/||')

if [ -z "$PR_BRANCHES" ]; then
    echo -e "${YELLOW}No PR branches found matching pattern 'origin/copilot/*'${NC}"
    exit 0
fi

echo -e "${BLUE}Found PR branches:${NC}"
for branch in $PR_BRANCHES; do
    echo "  - $branch"
done
echo ""

# Function to check if branch can be merged
check_mergeable() {
    local branch=$1
    echo -e "${BLUE}Checking: $branch${NC}"
    
    # Checkout the branch
    git fetch origin "$branch" --quiet 2>/dev/null || {
        echo -e "  ${RED}✗ Cannot fetch branch${NC}"
        echo ""
        return
    }
    git checkout "$branch" --quiet 2>/dev/null || {
        echo -e "  ${RED}✗ Cannot checkout branch${NC}"
        echo ""
        return
    }
    
    # Get last commit info
    LAST_COMMIT=$(git log -1 --format=%cd --date=relative 2>/dev/null || echo "unknown")
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "unknown")
    echo -e "  ${BLUE}ℹ Last commit: $LAST_COMMIT${NC}"
    echo -e "  ${BLUE}ℹ Total commits in branch: $COMMIT_COUNT${NC}"
    
    # Check merge status only if base branch exists
    if git rev-parse origin/$BASE_BRANCH >/dev/null 2>&1; then
        # Try to merge with base
        if git merge-base --is-ancestor origin/$BASE_BRANCH HEAD 2>/dev/null; then
            echo -e "  ${GREEN}✓ Up to date with $BASE_BRANCH${NC}"
        else
            echo -e "  ${YELLOW}⚠ Behind $BASE_BRANCH${NC}"
        fi
        
        # Check for conflicts
        if git merge origin/$BASE_BRANCH --no-commit --no-ff --quiet 2>/dev/null; then
            echo -e "  ${GREEN}✓ No merge conflicts${NC}"
            git merge --abort 2>/dev/null || true
        else
            echo -e "  ${RED}✗ Has merge conflicts with $BASE_BRANCH${NC}"
            git merge --abort 2>/dev/null || true
            
            # Try to show conflicting files
            CONFLICTS=$(git merge origin/$BASE_BRANCH --no-commit --no-ff 2>&1 | grep "CONFLICT" || true)
            if [ -n "$CONFLICTS" ]; then
                echo "$CONFLICTS" | while read -r line; do
                    echo -e "    ${RED}$line${NC}"
                done
            fi
            git merge --abort 2>/dev/null || true
        fi
        
        # Get commit count ahead of base
        AHEAD=$(git rev-list --count origin/$BASE_BRANCH..HEAD 2>/dev/null || echo "unknown")
        echo -e "  ${BLUE}ℹ Commits ahead of $BASE_BRANCH: $AHEAD${NC}"
    else
        echo -e "  ${YELLOW}⚠ Cannot compare with $BASE_BRANCH (branch not available)${NC}"
        echo -e "  ${BLUE}ℹ This is expected in shallow clones or when base branch isn't fetched${NC}"
    fi
    
    echo ""
}

# Check each PR branch
for branch in $PR_BRANCHES; do
    check_mergeable "$branch"
done

# Return to original branch
git checkout "$CURRENT_BRANCH" --quiet

echo "=================================="
echo -e "${GREEN}✓ PR Status Check Complete${NC}"
echo ""
echo "Recommendations:"
echo "1. Resolve conflicts in branches marked with ✗"
echo "2. Update branches marked with ⚠ by rebasing on main"
echo "3. Review PR_MANAGEMENT.md for detailed guidance"
