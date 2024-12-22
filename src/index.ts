import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHubService } from "./services/github";
import { SummaryService } from "./services/summary";
import { withRetry } from "./utils/retry";

/**
 * Main execution function for the GitHub Action.
 * This function handles the process of adding labels to pull requests and their related PRs.
 * 
 * @throws {Error} If not running in a pull request context
 * @throws {Error} If the maximum PR update limit is exceeded
 * @returns {Promise<void>}
 */
export async function run(): Promise<void> {
  try {
    // Get input parameters from action configuration
    const token = core.getInput("github-token", { required: true });
    const logSummary = core.getInput("log-summary") === "true";
    const labelPrefix = core.getInput("label-prefix");
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request?.base?.ref) {
      throw new Error("This action must be run in a pull request context");
    }

    // Extract PR details
    const prNumber = context.payload.pull_request.number;
    const branchName = context.payload.pull_request.base.ref;
    const labelText = `${labelPrefix}${branchName}`;

    // Initialize services
    const githubService = new GitHubService(
      octokit,
      context.repo.owner,
      context.repo.repo
    );

    const summaryService = new SummaryService(prNumber, labelText, logSummary);

    // Add label to the triggering PR
    console.trace(`Adding label ${labelText} to PR: ${prNumber}`);
    try {
      await githubService.addLabelToPR(prNumber, labelText);
      summaryService.addSuccessfulLabel(prNumber);
    } catch (error) {
      summaryService.addFailedLabel(prNumber);
    }

    // Get batch processing parameters
    const batchSize = parseInt(core.getInput("batch-size")) || 5;
    const maxPRCount = parseInt(core.getInput("max-pr-count")) || 10;

    // Fetch and process related PRs
    const relatedPRs = await githubService.getRelatedPRs(prNumber);
    summaryService.setRelatedPRsCount(relatedPRs.length);
    console.trace("Related PRs found:", relatedPRs);

    const limitExceeded = relatedPRs.length > maxPRCount;

    // Process related PRs in batches
    for (let i = 0; i < relatedPRs.length; i += batchSize) {
      const batch = relatedPRs.slice(i, i + batchSize);
      await withRetry(async () => {
        await Promise.all(
          batch.map(async (relatedPR) => {
            try {
              if (limitExceeded) throw new Error("Max PR update limit exceeded");
              await githubService.addLabelToPR(relatedPR, labelText);
              summaryService.addSuccessfulLabel(relatedPR);
            } catch (error) {
              summaryService.addFailedLabel(
                relatedPR,
                error instanceof Error ? error.message : "Unknown error"
              );
            }
          })
        );
      }, {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
      });
    }

    // Log final summary
    summaryService.logSummary();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

// Execute the action
run();
