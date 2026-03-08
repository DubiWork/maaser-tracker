#!/usr/bin/env node

/**
 * GitHub Project Priority Setter
 *
 * This script sets the Priority field for all issues in your GitHub Project
 * based on their labels (P0-critical, P1-high, P2-medium, P3-polish)
 *
 * Prerequisites:
 * 1. Node.js installed
 * 2. GitHub Personal Access Token with project and repo permissions
 * 3. Install dependencies: npm install @octokit/graphql
 *
 * Usage:
 *   node scripts/set-priorities.js
 *
 * Environment Variables:
 *   GITHUB_TOKEN - Your GitHub Personal Access Token
 *   PROJECT_NUMBER - Your project number (visible in project URL)
 */

const { graphql } = require('@octokit/graphql');

// Configuration
const OWNER = 'DubiWork';
const REPO = 'maaser-tracker';
const PROJECT_NUMBER = process.env.PROJECT_NUMBER || null; // You'll need to set this

// Priority mapping based on labels
const PRIORITY_MAP = {
  'P0-critical': 'Urgent',    // or '1' or '🔴 Urgent' depending on your field options
  'P1-high': 'High',          // or '2'
  'P2-medium': 'Normal',      // or '3'
  'P3-polish': 'Low'          // or '4'
};

async function main() {
  // Check for GitHub token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable not set');
    console.log('\nTo set your token:');
    console.log('  Windows CMD:    set GITHUB_TOKEN=your_token_here');
    console.log('  PowerShell:     $env:GITHUB_TOKEN="your_token_here"');
    console.log('  Bash/Git Bash:  export GITHUB_TOKEN=your_token_here');
    console.log('\nTo create a token:');
    console.log('  https://github.com/settings/tokens/new');
    console.log('  Required scopes: repo, project');
    process.exit(1);
  }

  if (!PROJECT_NUMBER) {
    console.error('❌ Error: PROJECT_NUMBER not set');
    console.log('\nFind your project number in the URL:');
    console.log('  https://github.com/users/DubiWork/projects/[NUMBER]');
    console.log('\nThen run:');
    console.log('  PROJECT_NUMBER=1 node scripts/set-priorities.js');
    process.exit(1);
  }

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  try {
    console.log('🔍 Fetching project structure...\n');

    // Step 1: Get project and its priority field
    const projectQuery = `
      query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            title
            fields(first: 20) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const projectData = await graphqlWithAuth(projectQuery, {
      owner: OWNER,
      number: parseInt(PROJECT_NUMBER),
    });

    const project = projectData.user.projectV2;
    const priorityField = project.fields.nodes.find(
      field => field.name && field.name.toLowerCase() === 'priority'
    );

    if (!priorityField) {
      console.error('❌ Error: Priority field not found in project');
      console.log('\nAvailable fields:', project.fields.nodes.map(f => f.name).join(', '));
      console.log('\nPlease add a "Priority" field to your project:');
      console.log('  1. Open your project');
      console.log('  2. Click "+ New field"');
      console.log('  3. Select "Single select"');
      console.log('  4. Name it "Priority"');
      console.log('  5. Add options: Urgent, High, Normal, Low');
      process.exit(1);
    }

    console.log(`✅ Found project: ${project.title}`);
    console.log(`✅ Found priority field with options: ${priorityField.options.map(o => o.name).join(', ')}\n`);

    // Step 2: Get all open issues
    const issuesQuery = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          issues(first: 100, states: OPEN) {
            nodes {
              id
              number
              title
              labels(first: 10) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    `;

    const issuesData = await graphqlWithAuth(issuesQuery, {
      owner: OWNER,
      repo: REPO,
    });

    const issues = issuesData.repository.issues.nodes;
    console.log(`📋 Found ${issues.length} open issues\n`);

    // Step 3: Update each issue's priority
    let updated = 0;
    let skipped = 0;

    for (const issue of issues) {
      // Find priority label
      const priorityLabel = issue.labels.nodes.find(
        label => label.name.startsWith('P0-') || label.name.startsWith('P1-') ||
                 label.name.startsWith('P2-') || label.name.startsWith('P3-')
      );

      if (!priorityLabel) {
        console.log(`⚠️  #${issue.number} ${issue.title}`);
        console.log(`    No priority label found, skipping\n`);
        skipped++;
        continue;
      }

      const priorityValue = PRIORITY_MAP[priorityLabel.name];
      const priorityOption = priorityField.options.find(
        opt => opt.name.toLowerCase() === priorityValue.toLowerCase()
      );

      if (!priorityOption) {
        console.log(`⚠️  #${issue.number} ${issue.title}`);
        console.log(`    Priority "${priorityValue}" not found in field options, skipping\n`);
        skipped++;
        continue;
      }

      try {
        // First, add issue to project (if not already added)
        const addIssueQuery = `
          mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
              item {
                id
              }
            }
          }
        `;

        const addResult = await graphqlWithAuth(addIssueQuery, {
          projectId: project.id,
          contentId: issue.id,
        });

        const itemId = addResult.addProjectV2ItemById.item.id;

        // Then update the priority field
        const updateQuery = `
          mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
            updateProjectV2ItemFieldValue(
              input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: $value
              }
            ) {
              projectV2Item {
                id
              }
            }
          }
        `;

        await graphqlWithAuth(updateQuery, {
          projectId: project.id,
          itemId: itemId,
          fieldId: priorityField.id,
          value: {
            singleSelectOptionId: priorityOption.id
          },
        });

        console.log(`✅ #${issue.number} ${issue.title}`);
        console.log(`   Priority set to: ${priorityValue} (${priorityLabel.name})\n`);
        updated++;

      } catch (error) {
        console.error(`❌ #${issue.number} ${issue.title}`);
        console.error(`   Error: ${error.message}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Updated: ${updated} issues`);
    console.log(`⚠️  Skipped: ${skipped} issues`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

main();
