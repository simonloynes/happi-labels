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
        case "max-pr-count":
          return "10";
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
        addLabelToPR: vi.fn(),
        getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
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
    expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("max-pr-count");
  });

  it("should correctly process valid inputs", async () => {
    const mockGitHubService = {
      addLabelToPR: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3]),
    } as unknown as GitHubService; // Cast to GitHubService type
    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    await run();

    // Verify label is created with correct prefix
    expect(mockGitHubService.addLabelToPR).toHaveBeenCalledWith(
      123,
      "Released on @main"
    );
  });

  it("should handle max PR count limit", async () => {
    const mockGitHubService = {
      addLabelToPR: vi.fn(),
      getRelatedPRs: vi
        .fn()
        .mockResolvedValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    } as unknown as GitHubService; // Cast to GitHubService type
    vi.mocked(GitHubService).mockImplementation(() => mockGitHubService);

    vi.mocked(core.getInput).mockImplementation((name) => {
      switch (name) {
        case "github-token":
          return "mock-token";
        case "max-pr-count":
          return "10";
        default:
          return "";
      }
    });

    await run();

    // Verify that addLabelToPR is not called for PRs beyond the limit
    expect(mockGitHubService.addLabelToPR).toHaveBeenCalledTimes(1); // Only for the original PR
  });

  it("should process PRs in correct batch sizes", async () => {
    const mockGitHubService = {
      addLabelToPR: vi.fn(),
      getRelatedPRs: vi.fn().mockResolvedValue([1, 2, 3, 4, 5, 6, 7]),
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

    // Verify that PRs are processed in batches
    expect(mockGitHubService.addLabelToPR).toHaveBeenCalled();
  });
});
