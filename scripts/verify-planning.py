from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
features=sorted((root/'specs').glob('[0-9][0-9][0-9]-*'))
assert len(features)==8,f'Expected 8 features, got {len(features)}'
required=['spec.md','plan.md','research.md','data-model.md','quickstart.md','tasks.md','contracts/interface.md','checklists/requirements.md']
errors=[];checked=0
for feature in features:
    for name in required:
        if not (feature/name).is_file():errors.append(f'Missing {feature.name}/{name}')
    spec=(feature/'spec.md').read_text(encoding='utf-8')
    for heading in ['## User Scenarios & Testing','### Edge Cases','## Requirements','### Key Entities','## Success Criteria','## Assumptions']:
        if heading not in spec:errors.append(f'{feature.name}: {heading}')
    if len(re.findall(r'### User Story',spec))!=3:errors.append(f'{feature.name}: stories')
    tasks=(feature/'tasks.md').read_text(encoding='utf-8')
    ids=re.findall(r'- \[ \] (T\d+) ',tasks)
    if len(ids)!=len(set(ids)):errors.append(f'{feature.name}: duplicate task ids')
    if '- [x]' in tasks:errors.append(f'{feature.name}: application task marked done')
for path in [root/'README.md']+list((root/'docs').glob('*.md'))+list((root/'specs').rglob('*.md')):
    body=path.read_text(encoding='utf-8');checked+=1
    for token in ['[NEEDS CLARIFICATION','TODO(','[FEATURE NAME]','[###-']:
        if token in body:errors.append(f'{path}: unresolved {token}')
    for link in re.findall(r'\]\(([^)]+)\)',body):
        if link.startswith(('http://','https://','#')):continue
        target=(path.parent/link.split('#')[0]).resolve()
        if not target.exists():errors.append(f'{path.relative_to(root)}: broken link {link}')
assert not errors,'\n'.join(errors)
print(f'PASS: {len(features)} features; 8 artifacts each; {checked} documents; links, headings, task IDs and draft states checked.')
