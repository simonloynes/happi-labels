import { getOctokit } from '@actions/github';

export class GitHubService {
  constructor(
    private octokit: ReturnType<typeof getOctokit>,
    private owner: string,
    private repo: string
  ) {}

  async addLabel(issueNum: number, labelText: string): Promise<void> {
    try {
      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNum,
        labels: [labelText]
      });
      console.log(`Successfully added label to PR #${issueNum}`);
    } catch (error) {
      console.error(`Error adding label to PR #${issueNum}:`, error);
      throw error;
    }
  }

  async getRelatedPRs(issueNum: number): Promise<number[]> {
    const relatedPRs = new Set<number>();

    const { data: commits } = await this.octokit.rest.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: issueNum
    });

    for (const commit of commits) {
      const { data: searchResults } = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${this.owner}/${this.repo} type:pr ${commit.sha}`
      });

      searchResults.items.forEach(pr => {
        if (pr.number !== issueNum) {
          relatedPRs.add(pr.number);
        }
      });
    }

    return Array.from(relatedPRs);
  }

  async getRelatedIssues(issueNum: number): Promise<number[]> {
    const relatedIssues = new Set<number>();

    const { data: commits } = await this.octokit.rest.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: issueNum
    });

    for (const commit of commits) {
      const { data: searchResults } = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${this.owner}/${this.repo} type:issue ${commit.sha}`
      });

      searchResults.items.forEach(issue => {
        if (issue.number !== issueNum) {
          relatedIssues.add(issue.number);
        }
      });
    }

    return Array.from(relatedIssues);
  }
} 