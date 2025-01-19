import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubService } from "../services/github";
import { getOctokit } from "@actions/github";

// Mock @actions/github
vi.mock("@actions/github", () => ({
  getOctokit: vi.fn(),
}));

describe("GitHubService", () => {
  let githubService: GitHubService;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn(),
        },
      },
      graphql: vi.fn(),
    };

    (getOctokit as any).mockReturnValue(mockOctokit);
    githubService = new GitHubService(mockOctokit, "testOwner", "testRepo");
  });

  describe("addLabel", () => {
    it("should successfully add a label to a PR", async () => {
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ status: 200 });

      await githubService.addLabel(123, "test-label");

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: "testOwner",
        repo: "testRepo",
        issue_number: 123,
        labels: ["test-label"],
      });
    });

    it("should throw an error when adding label fails", async () => {
      const error = new Error("API Error");
      mockOctokit.rest.issues.addLabels.mockRejectedValue(error);

      await expect(githubService.addLabel(123, "test-label")).rejects.toThrow(
        "API Error"
      );
    });
  });

  describe("getRelatedPRs", () => {
    it("should return related PR numbers with pagination", async () => {
      // First call - commits query
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            commits: {
              nodes: [{ commit: { oid: "commit1" } }],
            },
          },
        },
      });

      // Second call - first page of PRs
      mockOctokit.graphql.mockResolvedValueOnce({
        search: {
          pageInfo: {
            hasNextPage: true,
            endCursor: "cursor1",
          },
          nodes: [{ number: 456 }],
        },
      });

      // Third call - second page of PRs
      mockOctokit.graphql.mockResolvedValueOnce({
        search: {
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
          nodes: [{ number: 789 }],
        },
      });

      const result = await githubService.getRelatedPRs(123);

      expect(result).toEqual([456, 789]);
      expect(mockOctokit.graphql).toHaveBeenNthCalledWith(1, expect.stringMatching(
        /repository.*owner:\s*"testOwner".*name:\s*"testRepo".*pullRequest.*number:\s*123.*commits.*first:\s*100.*oid/s
      ));
      expect(mockOctokit.graphql).toHaveBeenNthCalledWith(2, expect.stringMatching(
        /search.*query:\s*"repo:testOwner\/testRepo\s+type:pr\s+state:open\s+commit1".*type:\s*ISSUE.*first:\s*100/s
      ));
    });

    it("should handle empty commits response", async () => {
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            commits: {
              nodes: []
            }
          }
        }
      });

      const result = await githubService.getRelatedPRs(123);
      expect(result).toEqual([]);
    });

    it("should deduplicate PR numbers", async () => {
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            commits: {
              nodes: [
                { commit: { oid: 'commit1' } },
                { commit: { oid: 'commit2' } }
              ]
            }
          }
        }
      });

      // Both commits return the same PR
      mockOctokit.graphql.mockResolvedValueOnce({
        search: {
          pageInfo: { hasNextPage: false },
          nodes: [{ number: 456 }]
        }
      });
      mockOctokit.graphql.mockResolvedValueOnce({
        search: {
          pageInfo: { hasNextPage: false },
          nodes: [{ number: 456 }]
        }
      });

      const result = await githubService.getRelatedPRs(123);
      expect(result).toEqual([456]);
    });
  });

  describe("getLinkedIssues", () => {
    it("should return linked issues with pagination", async () => {
      // First page of issues
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            closingIssuesReferences: {
              pageInfo: {
                hasNextPage: true,
                endCursor: "cursor1",
              },
              nodes: [{ number: 100, state: "OPEN" }],
            },
          },
        },
      });

      // Second page of issues
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            closingIssuesReferences: {
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
              nodes: [{ number: 200, state: "OPEN" }],
            },
          },
        },
      });

      const result = await githubService.getLinkedIssues(123);

      expect(result).toEqual([100, 200]);
      expect(mockOctokit.graphql).toHaveBeenNthCalledWith(1, expect.stringMatching(
        /repository.*owner:\s*"testOwner".*name:\s*"testRepo".*pullRequest.*number:\s*123.*closingIssuesReferences.*first:\s*100.*state/s
      ));
      expect(mockOctokit.graphql).toHaveBeenNthCalledWith(2, expect.stringMatching(
        /repository.*owner:\s*"testOwner".*name:\s*"testRepo".*pullRequest.*number:\s*123.*closingIssuesReferences.*first:\s*100.*after:\s*"cursor1".*pageInfo.*hasNextPage.*endCursor.*nodes.*number/s
      ));
    });

    it("should filter out closed issues", async () => {
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            closingIssuesReferences: {
              pageInfo: { hasNextPage: false },
              nodes: [
                { number: 100, state: "OPEN" },
                { number: 101, state: "CLOSED" },
                { number: 102, state: "OPEN" }
              ]
            }
          }
        }
      });

      const result = await githubService.getLinkedIssues(123);
      expect(result).toEqual([100, 102]);
    });

    it("should handle empty issues response", async () => {
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            closingIssuesReferences: {
              pageInfo: { hasNextPage: false },
              nodes: []
            }
          }
        }
      });

      const result = await githubService.getLinkedIssues(123);
      expect(result).toEqual([]);
    });
  });
});
