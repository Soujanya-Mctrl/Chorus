// ── WebSocket Event Types ────────────────────────
export const EVENTS_RUNTIME = true;

export type EventType =
  | 'indexing:progress'
  | 'indexing:complete'
  | 'indexing:failed'
  | 'graph:updated'
  | 'branch:activity'
  | 'presence:update'
  | 'security:complete';

export interface BaseEvent {
  type: EventType;
  timestamp: Date;
}

export interface IndexingProgressEvent extends BaseEvent {
  type: 'indexing:progress';
  payload: {
    repoId: string;
    status: string;
    progress: number;
    currentStep: string;
  };
}

export interface IndexingCompleteEvent extends BaseEvent {
  type: 'indexing:complete';
  payload: {
    repoId: string;
    totalChunks: number;
    totalFiles: number;
    durationMs: number;
  };
}

export interface IndexingFailedEvent extends BaseEvent {
  type: 'indexing:failed';
  payload: {
    repoId: string;
    error: string;
    step: string;
  };
}

export interface GraphUpdatedEvent extends BaseEvent {
  type: 'graph:updated';
  payload: {
    repoId: string;
    commitSha: string;
    nodesChanged: number;
    edgesChanged: number;
  };
}

export interface BranchActivityEvent extends BaseEvent {
  type: 'branch:activity';
  payload: {
    repoId: string;
    branchName: string;
    author: string;
    filesChanged: string[];
  };
}

export interface PresenceUpdateEvent extends BaseEvent {
  type: 'presence:update';
  payload: {
    repoId: string;
    userId: string;
    username: string;
    activeFile?: string;
    cursor?: { line: number; column: number };
  };
}

export interface SecurityCompleteEvent extends BaseEvent {
  type: 'security:complete';
  payload: {
    repoId: string;
    vulnerabilityCount: number;
    riskScore: number;
  };
}

export type WebSocketEvent =
  | IndexingProgressEvent
  | IndexingCompleteEvent
  | IndexingFailedEvent
  | GraphUpdatedEvent
  | BranchActivityEvent
  | PresenceUpdateEvent
  | SecurityCompleteEvent;
