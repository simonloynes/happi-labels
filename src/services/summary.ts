import { ActionSummary, PullRequestLabel } from "../types/summary";

export class SummaryService {
  /** The summary object containing all operation results */
  private summary: ActionSummary;
  /** Flag to control logging behavior */
  private logEnabled: boolean;

  /**
   * Creates a new instance of SummaryService
   * @param initialPR - The number of the initial pull request that triggered the action
   * @param labelText - The text of the label being applied
   * @param logEnabled - Whether to enable console logging of the summary
   */
  constructor(initialPR: number, labelText: string, logEnabled: boolean) {
    this.summary = {
      initialPR,
      labelText,
      relatedPRsCount: 0,
      successfulLabels: [],
      failedLabels: []
    };
    this.logEnabled = logEnabled;
  }

  /**
   * Sets the count of related pull requests found
   * @param count - The number of related pull requests
   */
  setRelatedPRsCount(count: number): void {
    this.summary.relatedPRsCount = count;
  }

  /**
   * Adds a successfully labeled pull request to the summary
   * @param prNumber - The number of the successfully labeled pull request
   */
  addSuccessfulLabel(prNumber: number): void {
    this.summary.successfulLabels.push({ prNumber });
  }

  /**
   * Adds a failed label attempt to the summary
   * @param prNumber - The number of the pull request that failed to be labeled
   * @param failReason - Optional reason for the labeling failure
   */
  addFailedLabel(prNumber: number, failReason?: string): void {
    this.summary.failedLabels.push({ prNumber, failReason});
  }

  /**
   * Logs the complete summary to the console if logging is enabled
   * Includes information about the initial PR, label text, related PRs count,
   * and lists of successful and failed labeling operations
   */
  logSummary(): void {
    if (!this.logEnabled) return; // Skip logging if not enabled
    console.log('\n📊 Action Summary:');
    console.log(`Initial PR: #${this.summary.initialPR}`);
    console.log(`Label: "${this.summary.labelText}"`);
    console.log(`Related PRs found: ${this.summary.relatedPRsCount}`);
    if (this.summary.successfulLabels.length > 0) {
      console.log(`Successfully labeled PRs:`);
      this.sortPullRequests(this.summary.successfulLabels).forEach((pr) => { console.log(`- #${pr.prNumber}`); });
    }
    if (this.summary.failedLabels.length > 0) {
      console.log(`Failed to label PRs:`);
      this.sortPullRequests(this.summary.failedLabels).forEach((pr) => { console.log(`- #${pr.prNumber}`); });
    }
  }
  /**
   * Sorts list off pull request references
   */
  sortPullRequests(pullRequests: PullRequestLabel[]): PullRequestLabel[] {
    return pullRequests.sort((a, b) => a.prNumber - b.prNumber);
  }
}
