#!/usr/bin/env python3
"""Extract safe JSON diagnostics already attached by the Playwright suite."""
import base64
from collections import Counter
import json
from pathlib import Path

evidence = Path(__file__).resolve().parents[2] / 'evidence'
report = json.loads((evidence / 'browser-report.json').read_text())
summary = {
    'environment': 'Native localhost services PostgreSQL15; installed Chrome153.0.8010.53 on macOS; viewport emulation only',
    'stats': report['stats'], 'runs': [], 'axeScans': 0, 'axeViolations': 0,
    'axeIncompleteResults': 0, 'uncaughtErrors': 0, 'server5xx': 0,
}
console_errors = Counter()
findings = []

def visit(suite):
    for spec in suite.get('specs', []):
        for test in spec['tests']:
            project = test['projectName']
            for result in test['results']:
                summary['runs'].append({'project': project, 'name': spec['title'], 'status': result['status']})
                for attachment in result.get('attachments', []):
                    if attachment.get('contentType') != 'application/json' or not attachment.get('body'):
                        continue
                    data = json.loads(base64.b64decode(attachment['body']))
                    name = attachment['name']
                    (evidence / f'{project}-{name}').write_text(json.dumps(data, indent=2))
                    if name.endswith('-axe.json'):
                        summary['axeScans'] += 1
                        summary['axeViolations'] += len(data['violations'])
                        summary['axeIncompleteResults'] += len(data['incomplete'])
                        for violation in data['violations']:
                            findings.append({'project': project, 'test': spec['title'], 'id': violation['id'], 'impact': violation['impact'], 'targets': [node['target'] for node in violation['nodes']]})
                    elif name == 'browser-diagnostics.json':
                        summary['uncaughtErrors'] += len(data['pageErrors'])
                        summary['server5xx'] += len(data['serverErrors'])
                        console_errors.update(data['consoleErrors'])
    for nested in suite.get('suites', []):
        visit(nested)

for suite in report['suites']:
    visit(suite)
summary['consoleErrors'] = dict(console_errors)
(evidence / 'qa-final-summary.json').write_text(json.dumps(summary, indent=2))
(evidence / 'ui-findings.json').write_text(json.dumps(findings, indent=2))
(evidence / 'browser-diagnostics-summary.json').write_text(json.dumps({key: summary[key] for key in ['uncaughtErrors', 'server5xx', 'consoleErrors']}, indent=2))
print(json.dumps({key: value for key, value in summary.items() if key != 'runs'}, indent=2))
