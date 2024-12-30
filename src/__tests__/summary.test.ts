import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SummaryService } from '../services/summary';

const initialPr = 123;
const successPr = [110, 111, 112, 113];
const failPr = [210, 211, 212, 213];

describe('SummaryService', () => {
  let summaryService: SummaryService;
  const mockConsoleLog = vi.spyOn(console, 'log');

  beforeEach(() => {
    summaryService = new SummaryService(initialPr, 'test-label', true);
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct values', () => {
      const service = new SummaryService(initialPr, 'test-label', false);
      expect(service['summary'].initialPR).toBe(initialPr);
      expect(service['summary'].labelText).toBe('test-label');
      expect(service['summary'].relatedPRsCount).toBe(0);
      expect(service['summary'].successfulLabels).toEqual([]);
      expect(service['summary'].failedLabels).toEqual([]);
    });
  });

  describe('setRelatedPRsCount', () => {
    it('should set the related PRs count', () => {
      summaryService.setRelatedPRsCount(5);
      expect(summaryService['summary'].relatedPRsCount).toBe(5);
    });
  });

  describe('addSuccessfulLabel', () => {
    it('should add PR number to successful labels', () => {
      successPr.forEach((pr: number) => summaryService.addSuccessfulLabel(pr));
      expect(summaryService['summary'].successfulLabels).toEqual(successPr.map((pr: number) => ({ prNumber: pr })));
    });
  });

  describe('addFailedLabel', () => {
    it('should add PR number and fail reason to failed labels', () => {
      failPr.forEach((pr: number) => summaryService.addFailedLabel(pr, 'API Error'));
      expect(summaryService['summary'].failedLabels).toEqual(failPr.map((pr: number) => ({ prNumber: pr, failReason: 'API Error' })));
    });

    it('should add PR number without fail reason', () => {
      failPr.forEach((pr: number) => summaryService.addFailedLabel(pr));
      expect(summaryService['summary'].failedLabels).toEqual(failPr.map((pr: number) => ({ prNumber: pr, failReason: undefined })));
    });
  });

  describe('logSummary', () => {
    it('should log summary when logging is enabled', () => {
      summaryService.setRelatedPRsCount(successPr.length + failPr.length);
      successPr.forEach((pr: number) => summaryService.addSuccessfulLabel(pr));
      failPr.forEach((pr: number) => summaryService.addFailedLabel(pr));
      summaryService.logSummary();

      expect(mockConsoleLog).toHaveBeenCalledTimes(14);
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📊 Action Summary:');
      expect(mockConsoleLog).toHaveBeenCalledWith(`Initial PR: #${initialPr}`);
      expect(mockConsoleLog).toHaveBeenCalledWith('Label: "test-label"');
      expect(mockConsoleLog).toHaveBeenCalledWith('Related PRs found: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('Successfully labeled PRs:');
      successPr.forEach((pr: number) => { expect(mockConsoleLog).toHaveBeenCalledWith(`- #${pr}`) });
      failPr.forEach((pr: number) => { expect(mockConsoleLog).toHaveBeenCalledWith(`- #${pr}`) });
    });

    it('should not log summary when logging is disabled', () => {
      const disabledService = new SummaryService(initialPr, 'test-label', false);
      disabledService.setRelatedPRsCount(successPr.length);
      successPr.forEach((pr: number) => disabledService.addSuccessfulLabel(pr));
      disabledService.logSummary();

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('sortPullRequests', () => {
    it('should sort pull request numbers in ascending order', () => {
      const unsortedPRs = [
        { prNumber: 113 },
        { prNumber: 110 },
        { prNumber: 112 },
        { prNumber: 111 }
      ];
      
      const sortedPRs = summaryService.sortPullRequests(unsortedPRs);
      
      expect(sortedPRs).toEqual([
        { prNumber: 110 },
        { prNumber: 111 },
        { prNumber: 112 },
        { prNumber: 113 }
      ]);
    });
  });
}); 