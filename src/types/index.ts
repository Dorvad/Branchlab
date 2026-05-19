export type NodeType = 'start' | 'scene' | 'feedback' | 'ending';
export type ScenarioStatus = 'draft' | 'published' | 'archived';

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
}

export interface ScenarioNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  clip?: ClipAsset;
  choices: ScenarioChoice[];
  position: { x: number; y: number };
  scoreEffects?: ScoreEffects;
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
