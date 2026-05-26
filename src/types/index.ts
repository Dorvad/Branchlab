export type NodeType = 'start' | 'scene' | 'feedback' | 'ending';
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  joinedAt: string;
  email?: string;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface OrgWithRole extends Organization {
  role: OrgRole;
  memberCount: number;
}
export type ScenarioStatus = 'draft' | 'published' | 'archived';
export type Orientation = 'vertical' | 'horizontal';

export interface PublishConfig {
  slug: string
  orientation: Orientation
  passwordProtected: boolean
  password?: string
}
export type PlayerPhase = 'watching' | 'choices' | 'feedback' | 'transitioning' | 'ending';

export interface VideoClip {
  id: string;
  name: string;       // original filename
  size: number;       // bytes
  mimeType: string;   // video/mp4, video/webm, video/quicktime
  objectUrl: string;  // ephemeral — only valid this browser session
  duration: number;   // seconds
  addedAt: string;    // ISO timestamp
}

export type ClipUploadStatus = 'compressing' | 'uploading' | 'processing' | 'ready' | 'failed'

export interface Clip {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;          // permanent Supabase public URL
  storagePath: string;  // used for deletion
  duration: number;     // seconds
  createdAt: string;    // ISO timestamp
  thumbnailUrl?: string;
}

export interface ScoreEffects {
  [key: string]: number;
}

export interface ClipAsset {
  id: string;
  url: string;
  duration: number; // seconds
  thumbnail?: string;
}

export interface YouTubeAsset {
  id: string;
  youtubeVideoId: string;
  originalUrl: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number | null; // null = unknown; resolved from player on first use
  createdAt: string;
}

/** Minimal reference stored on a ScenarioNode — no DB join needed at play time. */
export interface YouTubeClipRef {
  id: string;               // references YouTubeAsset.id
  youtubeVideoId: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number | null;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  targetNodeId: string;
  scoreEffects?: ScoreEffects;
  feedback?: string; // shown as overlay after selecting this choice
  sourceHandle?: string;
  targetHandle?: string;
}

export interface OpeningInstructions {
  enabled: boolean;
  title: string;
  body: string;
  startButtonText: string;
}

export interface ScenarioNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  clip?: ClipAsset;
  clipStartTime?: number;      // seconds from 0; undefined = start from beginning
  clipEndTime?: number | null; // seconds; null/undefined = play to natural end
  youtubeAsset?: YouTubeClipRef;
  youtubeStartTime?: number;
  youtubeEndTime?: number | null;
  thumbnailUrl?: string; // custom choice-screen backdrop; falls back to last video frame
  choices: ScenarioChoice[];
  position: { x: number; y: number };
  scoreEffects?: ScoreEffects; // applied when this node is entered
  outcome?: 'correct' | 'incorrect';
  openingInstructions?: OpeningInstructions;
  isCheckpoint?: boolean;
  checkpointLabel?: string;
}

export interface ScenarioEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  choiceId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ScenarioVersion {
  id: string;
  scenarioId: string;
  version: number;
  title?: string;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  startNodeId: string;
  publishedAt: string;
  slug: string;
  orientation?: Orientation;
  passwordProtected?: boolean;
  password?: string;
}

export interface Scenario {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: ScenarioStatus;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  startNodeId: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
  outcomeMode?: boolean;
  publishedVersion?: ScenarioVersion;
}

export interface CheckpointState {
  nodeId: string;
  label: string;
  reachedAt: string;
  pathIndex: number; // index into history[] at which this checkpoint was reached
}

export interface PlayerSessionState {
  scenarioId: string;
  currentNodeId: string;
  history: string[];
  score: Record<string, number>;
  startedAt: string;
  completedAt?: string;
  endingNodeId?: string;
  latestCheckpoint?: CheckpointState;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  nodeId?: string;
  choiceId?: string;
  message: string;
  suggestedFix?: string;
}

export interface ValidationResult {
  /** True only when there are zero errors (warnings are allowed). */
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** errors + warnings in display order */
  issues: ValidationIssue[];
  /** nodeId → all issues for that node */
  nodeIssueMap: Record<string, ValidationIssue[]>;
}

export type ScenarioLike = Scenario | ScenarioVersion;
