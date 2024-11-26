export interface PullRequestContext {
  number: number;
  base?: {
    ref: string;
  };
}

export interface GithubContext {
  repo: {
    owner: string;
    repo: string;
  };
  payload: {
    pull_request?: PullRequestContext;
  };
} 