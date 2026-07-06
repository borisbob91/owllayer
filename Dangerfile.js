// Dangerfile.js — Automatisation des rules Definition of Done
// Exécuté par danger.js en CI (GitHub Actions, GitLab CI, etc.)

const fs = require('fs');
const path = require('path');

// ============================================================
// 1. VÉRIFICATIONS DOCUMENT RÉFÉRENCE
// ============================================================

const title = danger.github.pr.title;
const hasIssueRef = /issue_\d+|feature_\d+/.test(title);

if (!hasIssueRef) {
  fail(
    '❌ **Titre PR invalide** — Doit référencer `issue_XX` ou `feature_XX`\n' +
    'Exemple : `feat: implement voice capture (ref feature_17)`'
  );
}

// ============================================================
// 2. VÉRIFICATIONS FICHIERS MODIFIÉS
// ============================================================

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const allChangedFiles = [...modifiedFiles, ...createdFiles];

warn(
  `📝 Fichiers modifiés : ${allChangedFiles.length}\n` +
  allChangedFiles.slice(0, 10).map(f => `  • ${f}`).join('\n') +
  (allChangedFiles.length > 10 ? `\n  ... et ${allChangedFiles.length - 10} autres` : '')
);

// ============================================================
// 3. VÉRIFICATIONS TAILLE PR
// ============================================================

const linesAdded = danger.git.lines_added;
const linesDeleted = danger.git.lines_deleted;
const totalLines = linesAdded + linesDeleted;

if (totalLines > 500) {
  fail(
    `❌ **PR trop volumineuse** (${totalLines} lignes)\n` +
    'Limiter les PR à ~400 lignes max — découper en PRs plus petites pour faciliter la review.'
  );
} else if (totalLines > 350) {
  warn(
    `⚠️ **PR volumineuse** (${totalLines} lignes)\n` +
    'Proche de la limite — considérer de la découper si possible.'
  );
}

// ============================================================
// 4. VÉRIFICATIONS DOCUMENTATION
// ============================================================

const hasChangelog = modifiedFiles.includes('CHANGELOG.md');
if (!hasChangelog && !createdFiles.includes('CHANGELOG.md')) {
  warn(
    '📝 **CHANGELOG.md non mise à jour**\n' +
    'Ajouter une entry au format :\n' +
    '```\n' +
    '## [Unreleased]\n' +
    '### Added\n' +
    '- New voice service integration (feature_17)\n' +
    '```'
  );
}

// ============================================================
// 5. VÉRIFICATIONS TESTS
// ============================================================

const testFiles = allChangedFiles.filter(f => 
  f.endsWith('.test.ts') || f.endsWith('.spec.ts') || f.endsWith('.test.tsx')
);

const hasCodeChanges = allChangedFiles.some(f =>
  f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
) && !allChangedFiles.every(f => 
  f.includes('test') || f.includes('spec') || f.endsWith('CHANGELOG.md') || f.endsWith('README.md')
);

if (hasCodeChanges && testFiles.length === 0) {
  warn(
    '⚠️ **Aucun test trouvé**\n' +
    'Ajouter des tests unitaires/intégration pour la nouvelle logique.'
  );
} else if (testFiles.length > 0) {
  message(
    `✅ Tests détectés : ${testFiles.length} fichier(s)\n` +
    testFiles.map(f => `  • ${f}`).join('\n')
  );
}

// ============================================================
// 6. VÉRIFICATIONS DÉPENDANCES
// ============================================================

const packageJsonChanged = modifiedFiles.includes('package.json');
const packageLockChanged = modifiedFiles.includes('pnpm-lock.yaml');

if (packageJsonChanged && !packageLockChanged) {
  warn(
    '⚠️ **package.json modifié mais pnpm-lock.yaml pas à jour**\n' +
    'Exécuter `pnpm install` pour mettre à jour le lock file.'
  );
}

// ============================================================
// 7. VÉRIFICATIONS BUILD & LINT
// ============================================================

// Vérifier si les fichiers TypeScript ont des erreurs évidentes
const tsFiles = allChangedFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

if (tsFiles.length > 0) {
  message(
    `🔍 **TypeScript** — ${tsFiles.length} fichier(s) affecté(s)\n` +
    'Assurez-vous que :\n' +
    '  • `pnpm build` passe sans erreurs\n' +
    '  • `pnpm test` ne régresse pas\n' +
    '  • Pas de `@ts-ignore` ajouté sans justification'
  );
}

// ============================================================
// 8. VÉRIFICATIONS RENOMMAGES SUSPECTS
// ============================================================

// Détecter les changements importants qui pourraient être des renommages
if (danger.git.deletions > 100 && danger.git.insertions > 100) {
  warn(
    '⚠️ **Changements volumineux détectés**\n' +
    'Vérifier qu\'il ne s\'agit pas d\'un refactoring/renommage non déclaré.'
  );
}

// ============================================================
// 9. CHECKLIST DEFINITION OF DONE
// ============================================================

const checklist = `
## ✅ Definition of Done — Checklist PR

Avant de fusionner, valider :

### 🔨 Code
- [ ] Tests passent : \`pnpm test\`
- [ ] Build passe : \`pnpm build\`
- [ ] Aucun \`@ts-ignore\` interne
- [ ] Docstrings/JSDoc sur API publique
- [ ] Pas de renommage/refactoring hors scope

### 📚 Documentation
- [ ] README.md du package mise à jour
- [ ] CHANGELOG.md entrée ajoutée (feat/fix/breaking)
- [ ] Guide d'intégration complété si nouvelles primitives
- [ ] Exemples de code valides dans démos
- [ ] Aucun lien mort interne

### 👀 Review
- [ ] Code review approuvée
- [ ] Doc review approuvée
- [ ] Tous les commentaires résolus

---

**Référence** : [CONTRIBUTING.md — Section 9](./CONTRIBUTING.md#9-definition-of-done--critères-de-terminaison)
`;

message(checklist);

// ============================================================
// 10. RÉSUMÉ FINAL
// ============================================================

console.log('✅ Dangerfile.js: vérifications complétées');
