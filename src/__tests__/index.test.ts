import { describe, it, expect, beforeEach, vi } from 'vitest';
import { run } from '../index';
import * as core from '@actions/core';
import * as github from '@actions/github';

vi.mock('@actions/core', () => {
  return {
    setFailed: vi.fn(),
    getInput: vi.fn((name) => {
      if (name === 'github-token') return 'mock-token';
      if (name === 'log-summary') return 'true';
      return '';
    }),
  }
});
vi.mock('@actions/github');
vi.mock('./services/github', () => {
  return {
    GitHubService: vi.fn().mockImplementation(() => {
      return { addLabelToPR: vi.fn() };
    }),
  };
});
vi.mock('./services/summary');

describe('run function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error if not run in a pull request context', async () => {
    github.context.payload.pull_request = undefined;
    await run();
    expect(core.setFailed).toHaveBeenCalledWith('This action must be run in a pull request context');
  });
});
