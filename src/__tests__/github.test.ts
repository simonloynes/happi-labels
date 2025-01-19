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
    it("should return related PR numbers", async () => {
      mockOctokit.graphql.mockResolvedValueOnce({
        repository: {
          pullRequest: {
            commits: {
              nodes: [
                {
                  commit: {
                    oid: "commit1",
                    associatedPullRequests: {
                      nodes: [
                        { number: 123, state: "OPEN" },   // Open PR
                        { number: 456, state: "MERGED" }  // Merged PR
                      ]
                    }
                  }
                },
                {
                  commit: {
                    oid: "commit2",
                    associatedPullRequests: {
                      nodes: [
                        { number: 123, state: "OPEN" },   // Open PR
                        { number: 789, state: "CLOSED" }  // Closed PR
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      });

      const result = await githubService.getRelatedPRs(123);
      expect(result).toEqual([456]); // Should only include 456 (merged)
      expect(mockOctokit.graphql).toHaveBeenCalledWith(expect.stringMatching(
        /repository.*pullRequest.*commits.*associatedPullRequests.*first:\s*100/s
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
                {
                  commit: {
                    oid: 'commit1',
                    associatedPullRequests: {
                      nodes: [
                        { number: 123, state: "OPEN" },
                        { number: 456, state: "OPEN" }
                      ]
                    }
                  }
                },
                {
                  commit: {
                    oid: 'commit2',
                    associatedPullRequests: {
                      nodes: [
                        { number: 123, state: "OPEN" },
                        { number: 456, state: "MERGED" } // Same PR number as above
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      });

      const result = await githubService.getRelatedPRs(123);
      expect(result).toEqual([456]); // Should only include 456 (merged)
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
