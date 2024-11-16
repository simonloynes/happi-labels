const core = require("@actions/core");
const github = require("@actions/github");

try {
  // Get GitHub token from inputs
  const token = core.getInput('github-token', { required: true });
  const octokit = github.getOctokit(token);

  // Get current context
  const { owner, repo } = github.context.repo;
  const linkedPRs = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: github.context.sha,
  });

  const outputValue = "test output";
  core.setOutput("test", outputValue);
  core.setOutput("linked-prs", linkedPRs.data);
  
  const payload = JSON.stringify(github.context.payload, undefined, 2);
  console.log(`The event payload: ${payload}`);
  console.log('Linked PRs:', JSON.stringify(linkedPRs.data, null, 2));
} catch (error) {
  core.setFailed(error.message);
}