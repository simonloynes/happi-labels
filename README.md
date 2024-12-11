# happi-labels
Automate adding labels to GitHub pull requests once they are closed.

## Options
|Option|Type|Default|Description|
|-|-|-|-|
|`github-token`|String||The default token provided by the Github workflow|
|`max-pr-count`|Number|`25`| Total number of Pull Requests that will be affected|
|`batch-size` |Number |`5`|Batch Size affected Pull Requests will be processed in| 
|`log-summary`|Boolean| `true`|Should the step log out a summary|
|`label-prefix`|String|`Released on @`|The string value used prior to the branch name in the label|
## Usage
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
