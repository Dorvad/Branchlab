export type NodeType = 'start' | 'scene' | 'feedback' | 'ending';
export type ScenarioStatus = 'draft' | 'published' | 'archived';
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

export interface Clip {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;         // permanent Supabase public URL
  storagePath: string; // used for deletion
  duration: number;    // seconds
  createdAt: string;   // ISO timestamp
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

export interface ScenarioChoice {
  id: string;
  label: string;
  targetNodeId: string;
  scoreEffects?: ScoreEffects;
  feedback?: string; // shown as overlay after selecting this choice
}

export interface ScenarioNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  clip?: ClipAsset;
  clipId?: string;
  thumbnailUrl?: string; // custom choice-screen backdrop; falls back to last video frame
  choices: ScenarioChoice[];
  position: { x: number; y: number };
  scoreEffects?: ScoreEffects; // applied when this node is entered
}

export interface ScenarioEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  choiceId: string;
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
  publishedVersion?: ScenarioVersion;
}

export interface PlayerSessionState {
  scenarioId: string;
  currentNodeId: string;
  history: string[];
  score: Record<string, number>;
  startedAt: string;
  completedAt?: string;
  endingNodeId?: string;
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
