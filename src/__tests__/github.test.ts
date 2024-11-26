import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubService } from '../services/github';
import { getOctokit } from '@actions/github';

// Mock @actions/github
vi.mock('@actions/github', () => ({
  getOctokit: vi.fn()
}));

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockOctokit: any;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        issues: {
          addLabels: vi.fn()
        },
        pulls: {
          listCommits: vi.fn()
        },
        search: {
          issuesAndPullRequests: vi.fn()
        }
      }
    };

    (getOctokit as any).mockReturnValue(mockOctokit);
    githubService = new GitHubService(mockOctokit, 'testOwner', 'testRepo');
  });

  describe('addLabelToPR', () => {
    it('should successfully add a label to a PR', async () => {
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ status: 200 });

      await githubService.addLabelToPR(123, 'test-label');

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'testOwner',
        repo: 'testRepo',
        issue_number: 123,
        labels: ['test-label']
      });
    });

    it('should throw an error when adding label fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.issues.addLabels.mockRejectedValue(error);

      await expect(githubService.addLabelToPR(123, 'test-label')).rejects.toThrow('API Error');
    });
  });

  describe('getRelatedPRs', () => {
    it('should return related PR numbers', async () => {
      // Mock listCommits response
      mockOctokit.rest.pulls.listCommits.mockResolvedValue({
        data: [
          { sha: 'commit1' },
          { sha: 'commit2' }
        ]
      });

      // Mock search responses
      mockOctokit.rest.search.issuesAndPullRequests
        .mockResolvedValueOnce({
          data: {
            items: [
              { number: 456 },
              { number: 789 }
            ]
          }
        })
        .mockResolvedValueOnce({
          data: {
            items: [
              { number: 789 },
              { number: 101 }
            ]
          }
        });

      const result = await githubService.getRelatedPRs(123);

      expect(result).toEqual([456, 789, 101]);
      expect(mockOctokit.rest.pulls.listCommits).toHaveBeenCalledWith({
        owner: 'testOwner',
        repo: 'testRepo',
        pull_number: 123
      });
    });
  });
}); 