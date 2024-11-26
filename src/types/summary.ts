export interface ActionSummary {
  initialPR: number;
  labelText: string;
  relatedPRsCount: number;
  successfulLabels: PullRequestLabel[];
  failedLabels: PullRequestLabel[];
}

export type PullRequestLabel = {
  prNumber: number;
  failReason?: string;
}