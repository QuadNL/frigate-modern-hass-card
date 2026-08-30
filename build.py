#!/usr/bin/env python3
"""
build.py — run after every change to src/ files.
Bundles src modules into a single frigate-modern-hass-card.js
by concatenating in dependency order and stripping import/export keywords.
"""
import re, os, sys

MODULES = [
    'src/constants.js',
    'src/styles.js',
    'src/go2rtc-player.js',
    'src/card.js',
    'src/editor.js',
    'src/index.js',
]

OUTPUT = 'frigate-modern-hass-card.js'

# Methods available on the element itself without being declared in src/.
INHERITED = {
    'appendChild', 'attachShadow', 'querySelector', 'querySelectorAll', 'remove',
    'addEventListener', 'removeEventListener', 'getAttribute', 'setAttribute',
    'dispatchEvent', 'getBoundingClientRect', 'insertAdjacentHTML',
    'insertAdjacentElement', 'contains', 'closest', 'requestFullscreen',
}


def check_methods(source):
    """Catch calls to this.something() that nothing defines.

    A syntax check can't see these — the bundle parses fine and then explodes at
    runtime. Removing a block of code and taking a helper with it is exactly how
    that happens.
    """
    # 2 spaces in our modules, 4 in the vendored go2rtc player.
    defined = set(re.findall(r'^\s{2,8}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(', source, re.MULTILINE))
    defined |= set(re.findall(r'^\s{2,8}(?:static\s+)?(?:get|set)\s+([A-Za-z_$][\w$]*)', source, re.MULTILINE))
    # Properties that hold a function count as defined too (e.g. this.ondata).
    defined |= set(re.findall(r'this\.([A-Za-z_$][\w$]*)\s*=', source))
    called = set(re.findall(r'this\.([A-Za-z_$][\w$]*)\s*\(', source))
    missing = sorted(called - defined - INHERITED)
    if missing:
        print('ERROR: called but never defined: ' + ', '.join('this.%s()' % m for m in missing))
        sys.exit(1)



def bundle():
    parts = []
    for path in MODULES:
        if not os.path.exists(path):
            print(f'ERROR: {path} not found. Run extract.py first.')
            sys.exit(1)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Strip multi-line imports FIRST (e.g. import { a,\n  b } from '...')
        content = re.sub(r'^import\s+\{[^}]*\}\s+from\s+[^\n]+\n', '', content, flags=re.MULTILINE | re.DOTALL)
        # Then strip any remaining single-line imports
        content = re.sub(r'^import\s+[^\n]+\n', '', content, flags=re.MULTILINE)

        # Strip export keywords (keep the declaration itself)
        content = re.sub(r'^export\s+(const|let|var|function|class)\s+', r'\1 ', content, flags=re.MULTILINE)
        content = re.sub(r'^export\s+default\s+', '', content, flags=re.MULTILINE)

        # Collapse 3+ blank lines → 2
        content = re.sub(r'\n{3,}', '\n\n', content)

        parts.append(content.strip())

    joined = '\n\n'.join(parts) + '\n'

    check_methods(joined)

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(joined)

    lines = joined.count('\n')
    print(f'OK {OUTPUT}  ({lines} lines, {len(joined):,} chars)')

if __name__ == '__main__':
    bundle()
