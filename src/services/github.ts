import { getOctokit } from '@actions/github';
import { Octokit } from '@octokit/rest';

export class GitHubService {
  constructor(
    private octokit: ReturnType<typeof getOctokit>,
    private owner: string,
    private repo: string
  ) {}

  async addLabelToPR(prNum: number, labelText: string): Promise<void> {
    try {
      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNum,
        labels: [labelText]
      });
      console.log(`Successfully added label to PR #${prNum}`);
    } catch (error) {
      console.error(`Error adding label to PR #${prNum}:`, error);
      throw error;
    }
  }

  async getRelatedPRs(prNumber: number): Promise<number[]> {
    const relatedPRs = new Set<number>();

    const { data: commits } = await this.octokit.rest.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber
    });

    for (const commit of commits) {
      const { data: searchResults } = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${this.owner}/${this.repo} type:pr ${commit.sha}`
      });

      searchResults.items.forEach(pr => {
        if (pr.number !== prNumber) {
          relatedPRs.add(pr.number);
        }
      });
    }

    return Array.from(relatedPRs);
  }
} 