import * as core from '@actions/core';
import * as github from '@actions/github';

try {
  // Get GitHub token from inputs
  const token = core.getInput('github-token', { required: true });
  const octokit = github.getOctokit(token);

  // Get repository information
  const { repo: { owner, repo }, sha } = github.context;
  
  // Get linked PRs and Issues
  const [linkedPRs, linkedIssues] = await Promise.all([
    octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: sha,
    }),
  ]);

  // Set outputs
  core.setOutput("linked-prs", linkedPRs.data);
  // core.setOutput("linked-issues", linkedIssues.data);
  
  // Log results
  console.log('Linked PRs:', JSON.stringify(linkedPRs.data, null, 2));
  // console.log('Linked Issues:', JSON.stringify(linkedIssues.data, null, 2));
} catch (error) {
  core.setFailed(error.message);
}