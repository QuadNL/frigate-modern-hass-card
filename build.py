#!/usr/bin/env python3
"""
build.py: run after every change to src/ files.
Bundles src modules into a single frigate-modern-hass-card.js
by concatenating in dependency order and stripping import/export keywords.

  python build.py           the card itself
  python build.py --beta    a side by side copy for testing on a live server

The beta build registers under its own element name, so it can sit next to an
installed card, and it stamps a build number onto the version shown on the card.
Two test builds of the same version are otherwise indistinguishable, which is
how you end up debugging a file the browser never reloaded.
"""
import re, os, sys, time

MODULES = [
    'src/constants.js',
    'src/styles.js',
    'src/go2rtc-player.js',
    'src/card.js',
    'src/editor.js',
    'src/index.js',
]

OUTPUT = 'frigate-modern-hass-card.js'
BETA_OUTPUT = 'frigate-modern-hass-card-beta.js'
BUILD_COUNTER = '.beta-build'

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



def beta_stamp():
    """Next build number, counting up across runs. Kept out of git."""
    n = 0
    if os.path.exists(BUILD_COUNTER):
        with open(BUILD_COUNTER) as f:
            n = int((f.read().strip() or '0'))
    n += 1
    with open(BUILD_COUNTER, 'w') as f:
        f.write(str(n))
    return n


def bundle(beta=False):
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

    out = OUTPUT
    if beta:
        out = BETA_OUTPUT
        n = beta_stamp()
        joined = joined.replace(
            "CARD_TAG = 'frigate-modern-hass-card'",
            "CARD_TAG = 'frigate-modern-hass-card-beta'")
        joined = re.sub(r"VERSION = '([^']*)'",
                        lambda m: "VERSION = '%s b%d'" % (m.group(1), n),
                        joined, count=1)

    with open(out, 'w', encoding='utf-8') as f:
        f.write(joined)

    lines = joined.count(chr(10))
    shown = re.search(r"VERSION = '([^']*)'", joined)
    print('OK %s  %s  (%d lines, %s chars)' % (out, shown.group(1) if shown else '?', lines, format(len(joined), ',')))
    if beta:
        print('   load it with ?v=b%d' % n)

if __name__ == '__main__':
    bundle(beta='--beta' in sys.argv)
