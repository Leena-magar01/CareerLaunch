import fs from 'fs';
import path from 'path';

describe('Project Modular Architecture Foundation Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('should verify essential root directories exist', () => {
    expect(fs.existsSync(path.join(rootDir, 'frontend'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'backend'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'docs'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'tests'))).toBe(true);
  });

  it('should verify documentation files exist in docs/', () => {
    const docsDir = path.join(rootDir, 'docs');
    expect(fs.existsSync(path.join(docsDir, 'HLD.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'PRD.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'FRD.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'TRD.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'DATABASE.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'API.md'))).toBe(true);
    expect(fs.existsSync(path.join(docsDir, 'AI_REQUIREMENTS.md'))).toBe(true);
  });

  it('should verify environment configuration templates exist', () => {
    expect(fs.existsSync(path.join(rootDir, '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'backend', '.env.example'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'frontend', '.env.example'))).toBe(true);
  });
});
