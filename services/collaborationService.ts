import { telemetryService } from './telemetryService';
import { securityService } from './securityService';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
  lastActive: string;
  avatar?: string;
}

export interface SharedProject {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
  visibility: 'private' | 'team' | 'public';
}

export interface Comment {
  id: string;
  projectId: string;
  fileId?: string;
  lineNumber?: number;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  replies: Comment[];
}

export interface CodeReview {
  id: string;
  projectId: string;
  reviewerId: string;
  reviewerName: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  comments: Comment[];
  createdAt: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: string;
  details: any;
  timestamp: string;
}

const STORAGE_KEY_PROJECTS = 'dlx-shared-projects';
const STORAGE_KEY_COMMENTS = 'dlx-comments';
const STORAGE_KEY_REVIEWS = 'dlx-code-reviews';
const STORAGE_KEY_ACTIVITY = 'dlx-activity-logs';

class CollaborationService {
  private sharedProjects: Map<string, SharedProject> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private reviews: Map<string, CodeReview[]> = new Map();
  private activityLogs: Map<string, ActivityLog[]> = new Map();

  constructor() {
    this.loadData();
  }

  // Project Management
  public createSharedProject(
    name: string,
    ownerId: string,
    visibility: SharedProject['visibility'] = 'private'
  ): SharedProject {
    const project: SharedProject = {
      id: crypto.randomUUID(),
      name,
      ownerId,
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visibility,
    };

    this.sharedProjects.set(project.id, project);
    this.saveProjects();
    this.logActivity(project.id, ownerId, 'project_created', { name });

    securityService.logAudit('project_created', 'collaboration', { 
      projectId: project.id, 
      name 
    });

    return project;
  }

  public getSharedProject(projectId: string): SharedProject | undefined {
    return this.sharedProjects.get(projectId);
  }

  public getSharedProjects(userId: string): SharedProject[] {
    return Array.from(this.sharedProjects.values()).filter(
      p => p.ownerId === userId || p.members.some(m => m.id === userId)
    );
  }

  public updateSharedProject(projectId: string, updates: Partial<SharedProject>) {
    const project = this.sharedProjects.get(projectId);
    if (project) {
      Object.assign(project, updates, { updatedAt: new Date().toISOString() });
      this.saveProjects();
      this.logActivity(projectId, 'system', 'project_updated', updates);
    }
  }

  // Team Member Management
  public addTeamMember(
    projectId: string,
    member: Omit<TeamMember, 'id' | 'joinedAt' | 'lastActive'>
  ): TeamMember | null {
    const project = this.sharedProjects.get(projectId);
    if (!project) return null;

    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    project.members.push(newMember);
    project.updatedAt = new Date().toISOString();
    this.saveProjects();

    this.logActivity(projectId, 'system', 'member_added', { 
      memberName: member.name, 
      role: member.role 
    });

    telemetryService.logEvent({
      type: 'collaboration_event',
      action: 'member_added',
      projectId,
      userId: newMember.id,
    });

    return newMember;
  }

  public removeTeamMember(projectId: string, memberId: string) {
    const project = this.sharedProjects.get(projectId);
    if (!project) return;

    const index = project.members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      const member = project.members[index];
      project.members.splice(index, 1);
      project.updatedAt = new Date().toISOString();
      this.saveProjects();

      this.logActivity(projectId, 'system', 'member_removed', { 
        memberName: member.name 
      });
    }
  }

  public updateMemberRole(projectId: string, memberId: string, newRole: TeamMember['role']) {
    const project = this.sharedProjects.get(projectId);
    if (!project) return;

    const member = project.members.find(m => m.id === memberId);
    if (member) {
      const oldRole = member.role;
      member.role = newRole;
      project.updatedAt = new Date().toISOString();
      this.saveProjects();

      this.logActivity(projectId, 'system', 'role_changed', { 
        memberName: member.name,
        oldRole,
        newRole 
      });

      securityService.logAudit('role_changed', 'collaboration', {
        projectId,
        memberId,
        oldRole,
        newRole,
      }, 'info');
    }
  }

  // Comments
  public addComment(
    projectId: string,
    authorId: string,
    authorName: string,
    content: string,
    fileId?: string,
    lineNumber?: number
  ): Comment {
    const comment: Comment = {
      id: crypto.randomUUID(),
      projectId,
      fileId,
      lineNumber,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: [],
    };

    const projectComments = this.comments.get(projectId) || [];
    projectComments.push(comment);
    this.comments.set(projectId, projectComments);
    this.saveComments();

    this.logActivity(projectId, authorId, 'comment_added', { 
      commentId: comment.id,
      fileId 
    });

    return comment;
  }

  public replyToComment(
    parentCommentId: string,
    authorId: string,
    authorName: string,
    content: string
  ): Comment | null {
    for (const [projectId, projectComments] of this.comments.entries()) {
      const parentComment = projectComments.find(c => c.id === parentCommentId);
      if (parentComment) {
        const reply: Comment = {
          id: crypto.randomUUID(),
          projectId,
          authorId,
          authorName,
          content,
          createdAt: new Date().toISOString(),
          resolved: false,
          replies: [],
        };

        parentComment.replies.push(reply);
        this.saveComments();

        this.logActivity(projectId, authorId, 'reply_added', { 
          parentCommentId,
          replyId: reply.id 
        });

        return reply;
      }
    }
    return null;
  }

  public resolveComment(commentId: string) {
    for (const projectComments of this.comments.values()) {
      const comment = projectComments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        this.saveComments();
        return;
      }
    }
  }

  public getComments(projectId: string, fileId?: string): Comment[] {
    const projectComments = this.comments.get(projectId) || [];
    if (fileId) {
      return projectComments.filter(c => c.fileId === fileId);
    }
    return projectComments;
  }

  // Code Reviews
  public createCodeReview(
    projectId: string,
    reviewerId: string,
    reviewerName: string
  ): CodeReview {
    const review: CodeReview = {
      id: crypto.randomUUID(),
      projectId,
      reviewerId,
      reviewerName,
      status: 'pending',
      comments: [],
      createdAt: new Date().toISOString(),
    };

    const projectReviews = this.reviews.get(projectId) || [];
    projectReviews.push(review);
    this.reviews.set(projectId, projectReviews);
    this.saveReviews();

    this.logActivity(projectId, reviewerId, 'review_created', { 
      reviewId: review.id 
    });

    return review;
  }

  public updateReviewStatus(
    reviewId: string,
    status: CodeReview['status']
  ) {
    for (const [projectId, projectReviews] of this.reviews.entries()) {
      const review = projectReviews.find(r => r.id === reviewId);
      if (review) {
        review.status = status;
        if (status !== 'pending') {
          review.completedAt = new Date().toISOString();
        }
        this.saveReviews();

        this.logActivity(projectId, review.reviewerId, 'review_updated', { 
          reviewId,
          status 
        });

        return;
      }
    }
  }

  public addReviewComment(
    reviewId: string,
    authorId: string,
    authorName: string,
    content: string,
    fileId?: string,
    lineNumber?: number
  ): Comment | null {
    for (const projectReviews of this.reviews.values()) {
      const review = projectReviews.find(r => r.id === reviewId);
      if (review) {
        const comment: Comment = {
          id: crypto.randomUUID(),
          projectId: review.projectId,
          fileId,
          lineNumber,
          authorId,
          authorName,
          content,
          createdAt: new Date().toISOString(),
          resolved: false,
          replies: [],
        };

        review.comments.push(comment);
        this.saveReviews();
        return comment;
      }
    }
    return null;
  }

  public getCodeReviews(projectId: string): CodeReview[] {
    return this.reviews.get(projectId) || [];
  }

  // Activity Logs
  private logActivity(
    projectId: string,
    userId: string,
    action: string,
    details: any
  ) {
    const activity: ActivityLog = {
      id: crypto.randomUUID(),
      projectId,
      userId,
      userName: userId === 'system' ? 'System' : 'User',
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    const projectActivity = this.activityLogs.get(projectId) || [];
    projectActivity.unshift(activity);
    
    // Keep only recent activity
    if (projectActivity.length > 500) {
      projectActivity.splice(500);
    }

    this.activityLogs.set(projectId, projectActivity);
    this.saveActivity();
  }

  public getActivityLogs(projectId: string, limit: number = 100): ActivityLog[] {
    const logs = this.activityLogs.get(projectId) || [];
    return logs.slice(0, limit);
  }

  // Export
  public exportProject(projectId: string): string {
    const project = this.sharedProjects.get(projectId);
    const comments = this.comments.get(projectId) || [];
    const reviews = this.reviews.get(projectId) || [];
    const activity = this.activityLogs.get(projectId) || [];

    return JSON.stringify({
      project,
      comments,
      reviews,
      activity,
    }, null, 2);
  }

  // Storage
  private loadData() {
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (storedProjects) {
        this.sharedProjects = new Map(Object.entries(JSON.parse(storedProjects)));
      }

      const storedComments = localStorage.getItem(STORAGE_KEY_COMMENTS);
      if (storedComments) {
        this.comments = new Map(Object.entries(JSON.parse(storedComments)));
      }

      const storedReviews = localStorage.getItem(STORAGE_KEY_REVIEWS);
      if (storedReviews) {
        this.reviews = new Map(Object.entries(JSON.parse(storedReviews)));
      }

      const storedActivity = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      if (storedActivity) {
        this.activityLogs = new Map(Object.entries(JSON.parse(storedActivity)));
      }
    } catch (e) {
      console.error('Failed to load collaboration data', e);
    }
  }

  private saveProjects() {
    try {
      const obj = Object.fromEntries(this.sharedProjects);
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save projects', e);
    }
  }

  private saveComments() {
    try {
      const obj = Object.fromEntries(this.comments);
      localStorage.setItem(STORAGE_KEY_COMMENTS, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save comments', e);
    }
  }

  private saveReviews() {
    try {
      const obj = Object.fromEntries(this.reviews);
      localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save reviews', e);
    }
  }

  private saveActivity() {
    try {
      const obj = Object.fromEntries(this.activityLogs);
      localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save activity logs', e);
    }
  }
}

export const collaborationService = new CollaborationService();
