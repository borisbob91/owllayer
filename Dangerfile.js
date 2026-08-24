const changedFiles = [
  ...new Set([
    ...danger.git.created_files,
    ...danger.git.modified_files,
    ...danger.git.deleted_files,
  ]),
];

const publicPackageNames = new Set([
  'core',
  'audio',
  'ui',
  'browser',
  'react',
  'vue',
  'svelte',
  'angular',
  'server',
  'adapter-openai',
  'adapter-google',
  'adapter-anthropic',
  'adapter-livekit',
]);

const changedPublicPackages = [...new Set(
  changedFiles
    .map((file) => file.match(/^packages\/([^/]+)\//)?.[1])
    .filter((name) => name && publicPackageNames.has(name)),
)];
const title = danger.github.pr.title;
const body = danger.github.pr.body ?? '';
const isReleasePullRequest = title === 'chore(release): version packages';
const hasIssueReference = /#\d+\b|(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+\b/i.test(`${title}\n${body}`);

if (!isReleasePullRequest && !hasIssueReference) {
  warn('Add a GitHub issue reference in the PR title or description, for example `Closes #123`.');
}

message(
  changedPublicPackages.length > 0
    ? `Affected public packages: ${changedPublicPackages.map((name) => `@owllayer/${name}`).join(', ')}`
    : 'No public npm package is affected by this PR.',
);

const totalLines = danger.github.pr.additions + danger.github.pr.deletions;
if (totalLines > 500) {
  fail(`This PR changes ${totalLines} lines. Split it into focused, reviewable pull requests.`);
} else if (totalLines > 350) {
  warn(`This PR changes ${totalLines} lines. Consider splitting it before review.`);
}

const publicSourceChanged = changedFiles.some((file) => (
  /^packages\/(core|audio|ui|browser|react|vue|svelte|angular|server|adapter-openai|adapter-google|adapter-anthropic|adapter-livekit)\/src\/.+\.(?:[cm]?[jt]sx?|vue|svelte)$/.test(file)
));
const hasTestChange = changedFiles.some((file) => (
  /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(file)
));
const hasChangeset = changedFiles.some((file) => /^\.changeset\/(?!README\.md$).+\.md$/.test(file));

if (publicSourceChanged && !hasTestChange) {
  warn('A public package source file changed without a test change. Add coverage or explain why it is unnecessary.');
}

if (publicSourceChanged && !hasChangeset) {
  warn('A public package source file changed without a Changeset. The release CI remains the blocking check.');
}

const packageManifestChanged = changedFiles.some((file) => /(?:^|\/)package\.json$/.test(file));
if (packageManifestChanged && !changedFiles.includes('pnpm-lock.yaml')) {
  warn('A package manifest changed without updating `pnpm-lock.yaml`. Run `pnpm install`.');
}
