# happi-labels 😜

Automatically add release labels to GitHub pull requests when they are closed. This action helps track which PRs were released with specific branches/versions.

## Features

- Automatically labels closed pull requests
- Configurable batch processing to handle multiple PRs efficiently
- Customizable label prefix
- Retry mechanism for API failures
- Summary logging for better visibility

## Options

|Option|Type|Default|Description|
|-|-|-|-|
|`github-token`|String||The default token provided by the Github workflow. Requires `pull-requests: write` permission.|
|`max-pr-count`|Number|`25`|Maximum number of Pull Requests that will be processed in a single run|
|`batch-size`|Number|`5`|Number of Pull Requests to process simultaneously in each batch| 
|`log-summary`|Boolean|`true`|Enables detailed summary logging of the labeling operation|
|`label-prefix`|String|`Released on @`|Prefix text that appears before the branch name in the label|

## Usage

Basic workflow example:

```yaml
name: Label

on:
  pull_request_target:
    types: [closed]
    branches:
      - main
    
jobs:
  add-label:
    name: Add Label
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      
    steps:
      - name: Label
        uses: simonloynes/happi-labels@v0.1.12
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          max-pr-count: 10
          batch-size: 5
          log-summary: true
          label-prefix: "Released on"
```

## Example Labels

When a PR is closed, it will be labeled with something like:
- `Released on main`
- `Released on v1.2.3`
(depending on the target branch and your label-prefix configuration)

## Permissions

This action requires the following permissions:
- `pull-requests: write` - To add labels to pull requests

## Processing Behavior

### Batch Processing
The action processes closed pull requests in batches to optimize performance and avoid API rate limits:

1. Related PRs are fetched
2. These PRs are then processed in batches of `batch-size` up to the limit set by `max-pr-count`
3. Each batch is processed concurrently for better performance

For example, with default settings:
- `max-pr-count: 25` and `batch-size: 5` means
- Up to 25 PRs will be labelled
- They will be processed in 5 batches of 5 PRs each

### Retry Mechanism
The action includes a built-in retry mechanism for resilience:

- Failed API calls are automatically retried up to 3 times
- Each retry attempt uses exponential backoff (increasing delays between attempts)
- Common transient issues (like rate limits or network hiccups) are handled gracefully
- Failed attempts are logged

## Troubleshooting

### Common Issues

1. If labels aren't being added, check that:
   - The workflow has the correct permissions
   - The github-token is properly configured
   - The label you wish to apply exists in the repo

2. If processing seems slow:
   - Try adjusting the `batch-size` parameter
   - Ensure `max-pr-count` isn't set too high
