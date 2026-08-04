const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { run, verifySharedFileBaseline, protectedSharedFiles } = require('./verify_canonical_release_gate');

const root = __dirname;
const requiredFiles = JSON.parse(fs.readFileSync(path.join(root, 'PROJECT_MANIFEST.json'), 'utf8')).release_governance.release_package.required_files;
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'niannian-release-governance-'));

function writePackageManifest(name, value) {
  const filePath = path.join(temporaryRoot, name + '.json');
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf8');
  return filePath;
}

function createStage(name, files) {
  const stageRoot = path.join(temporaryRoot, name);
  for (const relativePath of files) {
    const destination = path.join(stageRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive:true });
    fs.writeFileSync(destination, relativePath, 'utf8');
  }
  return stageRoot;
}

function stageIntegrity(stageRoot, files) {
  const file_sha256 = {};
  let total_bytes = 0;
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(stageRoot, relativePath));
    file_sha256[relativePath] = crypto.createHash('sha256').update(content).digest('hex');
    total_bytes += content.length;
  }
  return { file_sha256, total_bytes };
}

function expectFailure(args, expectedMessage) {
  assert.throws(() => run(args), new RegExp(expectedMessage));
}

try {
  const governance = JSON.parse(fs.readFileSync(path.join(root, 'PROJECT_MANIFEST.json'), 'utf8')).release_governance;
  const baselineResult = verifySharedFileBaseline(governance, root);
  assert.match(baselineResult.review_id, /^release-baseline-/);
  assert.equal(baselineResult.attestation, governance.shared_file_handoff_baseline.attestation.path);
  assert.deepEqual(Object.keys(governance.shared_file_handoff_baseline.files).sort(), protectedSharedFiles.slice().sort());
  const missingProtectedPath = structuredClone(governance);
  delete missingProtectedPath.shared_file_handoff_baseline.files['server.js'];
  assert.throws(() => verifySharedFileBaseline(missingProtectedPath, root), /shared_file_baseline_paths_not_exact/);
  const malformedHash = structuredClone(governance);
  malformedHash.shared_file_handoff_baseline.files['server.js'] = '0'.repeat(63);
  assert.throws(() => verifySharedFileBaseline(malformedHash, root), /shared_file_baseline_hash_invalid:server.js/);
  const attestationTamper = structuredClone(governance);
  attestationTamper.shared_file_handoff_baseline.attestation.sha256 = '0'.repeat(64);
  assert.throws(() => verifySharedFileBaseline(attestationTamper, root), /shared_file_attestation_hash_mismatch/);

  const approvedFiles = requiredFiles.concat(['bridge/niannian_low_risk_policy.js', 'node_modules/mammoth/index.js']);
  const approvedStage = createStage('approved-stage', approvedFiles);
  const approvedIntegrity = stageIntegrity(approvedStage, approvedFiles);
  const approved = writePackageManifest('approved', {
    source_root: root,
    target: 'https://ai.cauai.fun',
    package_root: approvedStage,
    files: approvedFiles,
    ...approvedIntegrity
  });
  const result = run(['--target', 'https://ai.cauai.fun', '--package-manifest', approved]);
  assert.equal(result.ok, true);
  assert.equal(result.authoritative_source, path.resolve(root));
  assert.equal(result.legacy_base_repo_deployment, 'prohibited');
  assert(
    ['diverged_requires_new_staged_release', 'verified_current_parity']
      .includes(result.production_parity)
  );
  assert.equal(
    result.next_gate,
    result.production_parity === 'diverged_requires_new_staged_release'
      ? 'stage_and_verify_a_new_release_before_deploy'
      : 'remote_release_validation_before_deploy'
  );
  assert.equal(result.release_ready, true);

  const staticResult = run(['--target', 'https://ai.cauai.fun']);
  assert.equal(staticResult.release_ready, false);

  const dataLeakFiles = requiredFiles.concat(['data-local/projects.json']);
  const dataLeakStage = createStage('data-local-leak-stage', dataLeakFiles);
  const localDataLeak = writePackageManifest('data-local-leak', {
    source_root: root,
    target: 'https://ai.cauai.fun',
    package_root: dataLeakStage,
    files: dataLeakFiles,
    ...stageIntegrity(dataLeakStage, dataLeakFiles)
  });
  expectFailure(['--target', 'https://ai.cauai.fun', '--package-manifest', localDataLeak], 'release_package_forbidden_path:data-local');

  const legacySource = writePackageManifest('legacy-source', {
    source_root: 'D:\\codex-work\\zhuanhui\\outputs\\niannian-ai-web',
    target: 'https://ai.cauai.fun',
    package_root: approvedStage,
    files: requiredFiles,
    ...stageIntegrity(approvedStage, requiredFiles)
  });
  expectFailure(['--target', 'https://ai.cauai.fun', '--package-manifest', legacySource], 'release_package_source_not_canonical');

  expectFailure(['--target', 'https://sd2.cauai.fun', '--package-manifest', approved], 'release_target_not_allowlisted');

  const staleManifest = writePackageManifest('stale-manifest', {
    source_root: root,
    target: 'https://ai.cauai.fun',
    package_root: approvedStage,
    files: requiredFiles,
    ...stageIntegrity(approvedStage, requiredFiles)
  });
  expectFailure(['--target', 'https://ai.cauai.fun', '--package-manifest', staleManifest], 'release_package_manifest_not_exact');

  process.stdout.write(JSON.stringify({ ok:true, verified:['canonical E source required', 'legacy D source rejected', 'data-local package path rejected', 'ai.cauai.fun only target', 'fixed ten-file shared baseline checked', 'hash-bound review attestation checked', 'missing protected path and malformed hash rejected', 'isolated staging inventory must exactly match manifest'] }) + '\n');
} finally {
  fs.rmSync(temporaryRoot, { recursive:true, force:true });
}
