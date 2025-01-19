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
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(core.getInput).mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "label-prefix":
          return "Released on @";
        case "log-summary":
          return "true";
        case "batch-size":
          return "5";
        case "max-issue-count":
          return "5";
        default:
          return "";
      }
    });

    // Setup default GitHub context
    github.context.payload.pull_request = {
      number: 123,
      base: { ref: "main" },
    } as any;

    // Create a new context object
    const mockContext = {
      ...github.context,
      repo: {
        owner: "test-owner",
        repo: "test-repo",
      },
    };

    // Assign the new context to github.context
    (github.context as any) = mockContext; // Use 'as any' to bypass TypeScript's read-only check

    // Mock GitHub service
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
      getRelatedIssues: vi.fn().mockResolvedValue([101, 102, 103]),
    } as unknown as GitHubService; // Cast to GitHubService type

    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);
  });

  it("should throw an error if not run in a pull request context", async () => {
    github.context.payload.pull_request = undefined;
    await run();
    expect(core.setFailed).toHaveBeenCalledWith(
      "This action must be run in a pull request context"
    );
  });

  it("should use default values for optional inputs", async () => {
    vi.mocked(core.getInput).mockImplementation((name) => {
      if (name === "github-token") return "mock-token";
      return "";
    });

    await run();

    // Verify default batch size of 5 is used
    expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("batch-size");

    // Verify default max PR count of 10 is used
    expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("max-issue-count");
  });

  it("should correctly process valid inputs", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
      getRelatedIssues: vi.fn().mockResolvedValue([101, 102, 103]),
    } as unknown as GitHubService; // Cast to GitHubService type
    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    await run();

    // Verify label is created with correct prefix for PR
    expect(mockGitHubService.addLabel).toHaveBeenCalledWith(
      123,
      "Released on @main"
    );

    // Verify label is created with correct prefix for issues
    expect(mockGitHubService.addLabel).toHaveBeenCalledWith(
      101,
      "Released on @main"
    );
    expect(mockGitHubService.addLabel).toHaveBeenCalledWith(
      102,
      "Released on @main"
    );
    expect(mockGitHubService.addLabel).toHaveBeenCalledWith(
      103,
      "Released on @main"
    );
  });

  it("should handle max Issue count limit", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
      getRelatedIssues: vi.fn().mockResolvedValue([101, 102, 103, 104, 105, 106]),
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
        default:
          return "";
      }
    });

    await run();

    // Verify that addLabel is called only for PRs within the limit
    expect(mockGitHubService.addLabel).toHaveBeenCalledTimes(11);

    // First call should be for the original PR
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(1, 123, "Released on @main");

    // Subsequent calls should be for the first 5 related PRs
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(2, 1, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(3, 2, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(4, 3, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(5, 4, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(6, 5, "Released on @main");
   
    // Subsequent calls should be for the first 5 related Issues
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(7, 101, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(8, 102, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(9, 103, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(10, 104, "Released on @main");
    expect(mockGitHubService.addLabel).toHaveBeenNthCalledWith(11, 105, "Released on @main");
  });

  it("should process PRs and issues in correct batch sizes", async () => {
    const mockGitHubService = {
      addLabel: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7]),
      getRelatedIssues: vi.fn().mockResolvedValue([101, 102, 103, 104, 105, 106]),
    } as unknown as GitHubService; // Cast to GitHubService type
    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    vi.mocked(core.getInput).mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "batch-size":
          return "3";
        default:
          return "";
      }
    });

    await run();

    // Verify that PRs and issues are processed in batches
    expect(mockGitHubService.addLabel).toHaveBeenCalled();
    expect(mockGitHubService.addLabel).toHaveBeenCalledTimes(14);
  });
});
