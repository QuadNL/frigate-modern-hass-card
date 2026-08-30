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



def check_config_options(source):
    """Catch an editor setting that setConfig throws away.

    setConfig copies the config into a whitelist, so an option the editor writes
    but setConfig does not list is accepted in the UI, saved to YAML, and then
    silently ignored by the card. min_tile_width shipped that way: the setting
    looked fine and did nothing.
    """
    marker = 'this._config = {' + chr(10)
    if marker not in source:
        return
    block = source.split(marker, 1)[1].split(chr(10) + '    };', 1)[0]
    accepted = set(re.findall(r'^\s{6}(\w+):', block, re.M))
    accepted |= {'cameras', 'camera_entity', 'entity'}  # entity belongs to a camera row
    written = set(re.findall(r'c\.(\w+)\s*=', source))
    written |= set(re.findall(r'delete c\.(\w+)', source))
    missing = sorted(written - accepted)
    if missing:
        print('ERROR: the editor writes options setConfig ignores: ' + ', '.join(missing))
        sys.exit(1)


def bump_dev():
    """Raise the -dev.N counter in src/constants.js and return the new version.

    Dev builds are named X.Y.Z-dev.N and the number goes up with every build
    that leaves this machine, so the version on the card says exactly which
    build you are looking at. A release version is not a valid dev build: it
    would put two different files under one name, which is how you end up
    debugging a file the browser never reloaded.
    """
    path = 'src/constants.js'
    src = open(path, encoding='utf-8').read()
    m = re.search(r"VERSION = '([^']*)'", src)
    if not m:
        print('ERROR: no VERSION in ' + path)
        sys.exit(1)
    dev = re.match(r'^(\d+\.\d+\.\d+)-dev\.(\d+)$', m.group(1))
    if not dev:
        print('ERROR: %s is a release version, not a dev build.' % m.group(1))
        print('       Set VERSION to something like 1.3.0-dev.1 before building a beta.')
        sys.exit(1)
    version = '%s-dev.%d' % (dev.group(1), int(dev.group(2)) + 1)
    src = src.replace("VERSION = '%s'" % m.group(1), "VERSION = '%s'" % version, 1)
    open(path, 'w', encoding='utf-8', newline='').write(src)
    return version


def bundle(beta=False):
    if beta:
        bump_dev()
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
    check_config_options(joined)

    out = OUTPUT
    if beta:
        out = BETA_OUTPUT
        joined = joined.replace(
            "CARD_TAG = 'frigate-modern-hass-card'",
            "CARD_TAG = 'frigate-modern-hass-card-beta'")

    with open(out, 'w', encoding='utf-8') as f:
        f.write(joined)

    lines = joined.count(chr(10))
    shown = re.search(r"VERSION = '([^']*)'", joined)
    print('OK %s  %s  (%d lines, %s chars)' % (out, shown.group(1) if shown else '?', lines, format(len(joined), ',')))
    if beta:
        print('   load it with ?v=' + (shown.group(1).replace('.', '').replace('-', '') if shown else ''))

if __name__ == '__main__':
    bundle(beta='--beta' in sys.argv)
