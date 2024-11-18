import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
    try {
        // Get inputs and GitHub token
        const token = core.getInput('github-token', { required: true });
        const octokit = github.getOctokit(token);
        const context = github.context;

        // Get the current pull request number and branch name
        const prNumber = context.payload.pull_request.number;
        const branchName = context.payload.pull_request.base.ref;
        
        // Create the label text
        const labelText = `Released on @${branchName}`;

        // Function to add label to a PR
        async function addLabelToPR(prNum) {
            try {
                await octokit.rest.issues.addLabels({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    issue_number: prNum,
                    labels: [labelText]
                });
                console.log(`Successfully added label to PR #${prNum}`);
            } catch (error) {
                console.error(`Error adding label to PR #${prNum}:`, error);
            }
        }

        // Function to get related PRs
        async function getRelatedPRs() {
            const relatedPRs = new Set();
            
            // Get the current PR's commits
            const { data: commits } = await octokit.rest.pulls.listCommits({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: prNumber
            });

            // For each commit, search for PRs that contain it
            for (const commit of commits) {
                const { data: searchResults } = await octokit.rest.search.issuesAndPullRequests({
                    q: `repo:${context.repo.owner}/${context.repo.repo} type:pr ${commit.sha}`
                });

                searchResults.items.forEach(pr => {
                    if (pr.number !== prNumber) {
                        relatedPRs.add(pr.number);
                    }
                });
            }

            return Array.from(relatedPRs);
        }

        // Main execution
        async function executeWorkflow() {
            // Add label to current PR
            await addLabelToPR(prNumber);

            // Get and process related PRs
            const relatedPRs = await getRelatedPRs();
            console.log('Related PRs found:', relatedPRs);

            // Add labels to related PRs
            for (const relatedPR of relatedPRs) {
                await addLabelToPR(relatedPR);
            }
        }

        // Run the workflow
        await executeWorkflow();

    } catch (error) {
        core.setFailed(error.message);
    }
}

export { run };