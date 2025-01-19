import { describe, it, expect, beforeEach, vi } from "vitest";
import { run } from "../index";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHubService } from "../services/github";

// Mock implementations
vi.mock("@actions/core");
vi.mock("@actions/github");
vi.mock("../services/github");
vi.mock("../services/summary");

describe("run function", () => {
  let mockGitHubService: GitHubService;

  const setupMockInputs = (overrides: Record<string, string> = {}) => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      const defaults: Record<string, string> = {
        "github-token": "mock-token",
        "label-prefix": "Released on @",
        "log-summary": "true",
        "batch-size": "5",
        "max-issue-count": "5",
      };
      return overrides[name] ?? defaults[name] ?? "";
    });
  };

  const setupGitHubService = (mockData = {}) => {
    mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([]),
      getLinkedIssues: vi.fn().mockResolvedValue([]),
      ...mockData
    } as unknown as GitHubService;

    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);
    return mockGitHubService;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockInputs();

    // Setup default GitHub context
    (github.context as any) = {
      ...github.context,
      payload: {
        pull_request: {
          number: 123,
          base: { ref: "main" },
        }
      },
      repo: {
        owner: "test-owner",
        repo: "test-repo",
      }
    };

    setupGitHubService();
  });

  it("should correctly process PRs and issues from GraphQL API", async () => {
    setupGitHubService({
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102])
    });

    await run();

    expect(mockGitHubService.getRelatedPRs).toHaveBeenCalledWith(123);
    expect(mockGitHubService.getLinkedIssues).toHaveBeenCalledWith(123);

    // Verify labels were added in the correct order
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // Related PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 101, "Released on @main");  // Linked Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 102, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(6);
  });

  it("should respect max issue count limit with GraphQL results", async () => {
    setupGitHubService({
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3, 4, 5, 6]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102, 103, 104, 105, 106])
    });

    setupMockInputs({ "max-issue-count": "5" });

    await run();

    // Verify individual calls in order
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // Related PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 4, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 5, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(7, 101, "Released on @main");  // Linked Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(8, 102, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(9, 103, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(10, 104, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(11, 105, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(11);
  });

  it("should throw an error if not run in a pull request context", async () => {
    github.context.payload.pull_request = undefined;
    await run();
    expect(core.setFailed).toHaveBeenCalledWith(
      "This action must be run in a pull request context"
    );
  });

  it("should use default values for optional inputs", async () => {
    setupGitHubService({
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102])
    });

    setupMockInputs({ "github-token": "mock-token" }); // Only set required token

    await run();

    // Verify labels were added in the correct order with default values
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // Related PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 101, "Released on @main");  // Linked Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 102, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(6);
    
    // Verify default values were used
    expect(core.getInput).toHaveBeenCalledWith("batch-size");
    expect(core.getInput).toHaveBeenCalledWith("max-issue-count");
  });

  it("should correctly process valid inputs", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102, 103]),
    } as unknown as GitHubService;
    
    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    await run();

    // Verify labels were added in the correct order
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // Related PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 101, "Released on @main");  // Linked Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 102, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(7, 103, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(7);
  });

  it("should handle max Issue count limit", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102, 103, 104, 105, 106])
    } as unknown as GitHubService;

    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    vi.mocked(core.getInput).mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "max-issue-count":
          return "5";
        case "label-prefix":
          return "Released on @";
        case "batch-size":
          return "5";
        case "log-summary":
          return "true";
        default:
          return "";
      }
    });

    await run();

    // Verify individual calls in order
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // First 5 PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 4, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 5, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(7, 101, "Released on @main");  // First 5 Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(8, 102, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(9, 103, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(10, 104, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(11, 105, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(11);
  });

  it("should process PRs and issues in correct batch sizes", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7]),
      getLinkedIssues: vi.fn().mockResolvedValue([101, 102, 103, 104, 105, 106])
    } as unknown as GitHubService;

    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    vi.mocked(core.getInput).mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "batch-size":
          return "3";
        case "max-issue-count":
          return "10";
        case "label-prefix":
          return "Released on @";
        case "log-summary":
          return "true";
        default:
          return "";
      }
    });

    await run();

    // Verify labels were added in the correct order
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");  // Original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");    // First batch PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 4, "Released on @main");    // Second batch PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 5, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(7, 6, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(8, 7, "Released on @main");    // Final PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(9, 101, "Released on @main");  // First batch issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(10, 102, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(11, 103, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(12, 104, "Released on @main"); // Second batch issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(13, 105, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(14, 106, "Released on @main");

    expect((mockGitHubService.addLabel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(14);
  });
});
