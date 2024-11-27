import { ActionSummary, PullRequestLabel } from "../types/summary";

export class SummaryService {
  private summary: ActionSummary;
  private logEnabled: boolean;

  constructor(initialPR: number, labelText: string, logEnabled: boolean) {
    this.summary = {
      initialPR,
      labelText,
      relatedPRsCount: 0,
      successfulLabels: [] ,
      failedLabels: []
    };
    this.logEnabled = logEnabled;
  }

  setRelatedPRsCount(count: number): void {
    this.summary.relatedPRsCount = count;
  }

  addSuccessfulLabel(prNumber: number): void {
    this.summary.successfulLabels.push({ prNumber });
  }

  addFailedLabel(prNumber: number, failReason?: string): void {
    this.summary.failedLabels.push({ prNumber, failReason});
  }

  logSummary(): void {
    if (!this.logEnabled) return; // Skip logging if not enabled
    console.log('\n📊 Action Summary:');
    console.log(`Initial PR: #${this.summary.initialPR}`);
    console.log(`Label: "${this.summary.labelText}"`);
    console.log(`Related PRs found: ${this.summary.relatedPRsCount}`);
    if (this.summary.successfulLabels.length > 0) {
      console.log(`Successfully labeled PRs:`);
      this.summary.successfulLabels.forEach((pr) => { console.log(`- #${pr.prNumber}`); });
    }
    if (this.summary.failedLabels.length > 0) {
      console.log(`Failed to label PRs:`);
      this.summary.failedLabels.forEach((pr) => { console.log(`- #${pr.prNumber}`); });

    }
  }
} 