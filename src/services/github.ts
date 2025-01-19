import { getOctokit } from '@actions/github';

// Define the expected response structure
interface SearchResponse {
  search: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    nodes: Array<{
      number: number;
    }>;
  };
}

interface PullRequestResponse {
  repository: {
    pullRequest: {
      closingIssuesReferences: {
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string;
        };
        nodes: Array<{
          number: number;
        }>;
      };
    };
  };
}

interface PullRequestCommitsResponse {
  repository: {
    pullRequest: {
      commits: {
        nodes: Array<{
          commit: {
            oid: string;
          };
        }>;
      };
    };
  };
}

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

  /**
    * Derives a list of Pull Requests that are related to commits that are affected by the provided Pull Request
   * @param issueNum Number of the root PR
   * @returns a list of related pull requests
   */
  async getRelatedPRs(issueNum: number): Promise<number[]> {
    const relatedPRs = new Set<number>();
    
    const commitResults = await this.octokit.graphql<PullRequestCommitsResponse>(`
      query {
        repository(owner: "${this.owner}", name: "${this.repo}") {
          pullRequest(number: ${issueNum}) {
            commits(first: 100) {
              nodes {
                commit {
                  oid
                }
              }
            }
          }
        }
      }
    `);

    const commits = commitResults.repository.pullRequest.commits.nodes;

    for (const { commit } of commits) {
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        const searchResults: SearchResponse = await this.octokit.graphql<SearchResponse>(`
          query {
            search(
              query: "repo:${this.owner}/${this.repo} type:pr ${commit.oid}",
              type: ISSUE,
              first: 100
              ${cursor ? `after: "${cursor}"` : ''}
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                ... on PullRequest {
                  number
                }
              }
            }
          }
        `);
        
        searchResults.search.nodes.forEach(pr => {
          if (pr.number !== issueNum) {
            relatedPRs.add(pr.number);
          }
        });

        hasNextPage = searchResults.search.pageInfo.hasNextPage;
        cursor = searchResults.search.pageInfo.endCursor;
      }
    }

    return Array.from(relatedPRs);
  }

  /**
   * Derives a list of Issues that are linked and closed by the provided Pull Request
   * @param issueNum Number of the root PR
   * @returns a list of related issues
   */
  async getLinkedIssues(issueNum: number): Promise<number[]> {
    const linkedIssues = new Set<number>();
    let hasNextPage = true;
    let cursor: string | null = null;

    console.log(`Starting getLinkedIssues for PR #${issueNum}`);
    
    while (hasNextPage) {
      try {
        const searchResults: { repository: PullRequestResponse['repository'] } = await this.octokit.graphql(`
          query {
            repository(owner: "${this.owner}", name: "${this.repo}") {
              pullRequest(number: ${issueNum}) {
                closingIssuesReferences(first: 100 ${cursor ? `, after: "${cursor}"` : ''}) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    number
                  }
                }
              }
            }
          }
        `);

        console.log('GraphQL response:', JSON.stringify(searchResults, null, 2));

        // Safely access nested properties
        const nodes = searchResults?.repository?.pullRequest?.closingIssuesReferences?.nodes;
        if (!nodes || !Array.isArray(nodes)) {
          console.error('Invalid response structure:', searchResults);
          break;
        }

        nodes.forEach(issue => {
          if (issue && typeof issue.number === 'number') {
            linkedIssues.add(issue.number);
          }
        });

        const pageInfo = searchResults?.repository?.pullRequest?.closingIssuesReferences?.pageInfo;
        hasNextPage = pageInfo?.hasNextPage ?? false;
        cursor = pageInfo?.endCursor ?? null;

      } catch (error) {
        console.error('Error in getLinkedIssues:', error);
        throw error;
      }
    }

    const result = Array.from(linkedIssues);
    console.log('Found linked issues:', result);
    return result;
  }
} 