#!/usr/bin/env python3
"""
restore_from_patch.py — rebuild the project files from an Arena/git patch file, with no git installed.

Usage:
    python3 restore_from_patch.py <patch-file> [target-directory]

What it does
    Reads a unified diff (the ".patch" / ".patch.txt" file Arena produces for a session, or the
    output of `git diff`) and writes every file it describes into the target directory
    (default: ./restored). Text files are restored in full; binary entries are reported but
    skipped, because a diff cannot carry binary content (git writes "Binary files ... differ").

What it does NOT need
    git, node, npm, or any package. Python 3.8+ only, standard library only.

Exit code
    0 if every text file was restored, 1 if anything was skipped or could not be applied.
"""
import os
import re
import sys

HEADER = re.compile(r'^diff --git (?:"?a/(?P<a>.*?)"? )"?b/(?P<b>.*?)"?$')
HUNK = re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')


def c_unquote(path: str) -> str:
    """git quotes unusual paths with C escaping; undo the common cases."""
    if len(path) >= 2 and path[0] == '"' and path[-1] == '"':
        body = path[1:-1]
        out, i = [], 0
        while i < len(body):
            ch = body[i]
            if ch == '\\' and i + 1 < len(body):
                nxt = body[i + 1]
                mapping = {'n': '\n', 't': '\t', 'r': '\r', '"': '"', '\\': '\\'}
                if nxt in mapping:
                    out.append(mapping[nxt]); i += 2; continue
                if nxt.isdigit():  # octal escape
                    j = i + 1
                    while j < len(body) and j < i + 4 and body[j].isdigit():
                        j += 1
                    out.append(chr(int(body[i + 1:j], 8))); i = j; continue
            out.append(ch); i += 1
        return ''.join(out)
    return path


def parse_patch(text):
    """Yield one dict per file section."""
    lines = text.splitlines()
    cur = None
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        m = HEADER.match(line)
        if m:
            if cur:
                yield cur
            cur = {
                'a': c_unquote(m.group('a')),
                'b': c_unquote(m.group('b')),
                'new': False, 'deleted': False, 'binary': False,
                'rename_to': None, 'hunks': [],
            }
            i += 1
            continue
        if cur is not None:
            if line.startswith('new file mode'):
                cur['new'] = True
            elif line.startswith('deleted file mode'):
                cur['deleted'] = True
            elif line.startswith('rename from '):
                cur['a'] = c_unquote(line[len('rename from '):])
            elif line.startswith('rename to '):
                cur['rename_to'] = c_unquote(line[len('rename to '):])
            elif line.startswith('Binary files ') or line.startswith('GIT binary patch'):
                cur['binary'] = True
            elif line.startswith('--- '):
                p = line[4:].strip()
                if p == '/dev/null':
                    cur['new'] = True
            elif line.startswith('+++ '):
                p = line[4:].strip()
                if p == '/dev/null':
                    cur['deleted'] = True
                else:
                    cur['b'] = c_unquote(p[2:] if p.startswith('b/') else p)
            elif line.startswith('@@'):
                hm = HUNK.match(line)
                if hm:
                    cur['hunks'].append({'body': [], 'start': int(hm.group(3))})
                else:
                    cur['hunks'].append({'body': [], 'start': 0})
            elif cur['hunks'] and (line.startswith(('+', '-', ' ', '\\')) or line == ''):
                cur['hunks'][-1]['body'].append(line)
        i += 1
    if cur:
        yield cur


def content_from_hunks(entry):
    """Reconstruct a NEW file: the '+' lines, in order."""
    out = []
    for h in entry['hunks']:
        for line in h['body']:
            if line.startswith('+'):
                out.append(line[1:])
            elif line.startswith('\\'):     # "\ No newline at end of file"
                if out:
                    out[-1] = out[-1]
            # context and '-' lines are not part of a new file
    text = '\n'.join(out)
    if out:
        text += '\n'
    # a trailing "\ No newline at end of file" means: drop the final newline
    for h in entry['hunks']:
        for idx, line in enumerate(h['body']):
            if line.startswith('\\') and idx > 0 and h['body'][idx - 1].startswith('+'):
                text = text[:-1]
    return text


def apply_hunks_to_file(path, entry):
    """Apply a diff to an existing text file. Returns True on success."""
    try:
        with open(path, 'r', encoding='utf-8', newline='') as fh:
            original = fh.read()
    except OSError:
        return False
    orig_lines = original.split('\n')
    out, cursor = [], 0
    for h in entry['hunks']:
        start = max(h['start'] - 1, 0)
        if start < cursor or start > len(orig_lines):
            return False
        out.extend(orig_lines[cursor:start])
        cursor = start
        for line in h['body']:
            if line.startswith(' '):
                if cursor < len(orig_lines) and orig_lines[cursor] == line[1:]:
                    out.append(orig_lines[cursor]); cursor += 1
                else:
                    return False
            elif line.startswith('-'):
                if cursor < len(orig_lines) and orig_lines[cursor] == line[1:]:
                    cursor += 1
                else:
                    return False
            elif line.startswith('+'):
                out.append(line[1:])
            elif line.startswith('\\'):
                pass
        # keep any trailing context already consumed
        while cursor < len(orig_lines) and out and False:
            break
    out.extend(orig_lines[cursor:])
    text = '\n'.join(out)
    if original and not original.endswith('\n') and text.endswith('\n'):
        text = text[:-1]
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    patch_path = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else 'restored'
    with open(patch_path, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()

    written, modified, deleted, skipped, failed = [], [], [], [], []
    for entry in parse_patch(text):
        dest_rel = entry['rename_to'] or entry['b']
        if entry['a'] == '/dev/null':
            dest_rel = entry['b']
        path = os.path.join(target, dest_rel)
        os.makedirs(os.path.dirname(path) or '.', exist_ok=True)

        if entry['binary']:
            skipped.append(dest_rel)
            continue
        if entry['deleted']:
            if os.path.exists(path):
                os.remove(path)
                deleted.append(dest_rel)
            continue
        if entry['new'] or not os.path.exists(path):
            with open(path, 'w', encoding='utf-8', newline='') as fh:
                fh.write(content_from_hunks(entry))
            written.append(dest_rel)
        else:
            if apply_hunks_to_file(path, entry):
                modified.append(dest_rel)
            else:
                with open(path, 'w', encoding='utf-8', newline='') as fh:
                    fh.write(content_from_hunks(entry))
                failed.append(dest_rel + ' (written from added lines only — check it)')

    print(f"target directory : {os.path.abspath(target)}")
    print(f"files created    : {len(written)}")
    print(f"files updated    : {len(modified)}")
    print(f"files deleted    : {len(deleted)}")
    if skipped:
        print(f"\nSKIPPED (binary — a diff cannot carry these; fetch them separately): {len(skipped)}")
        for s in skipped:
            print(f"  - {s}")
    if failed:
        print(f"\nCHECK THESE (diff did not match the local file): {len(failed)}")
        for s in failed:
            print(f"  - {s}")
    print("\nDone." if not (skipped or failed) else "\nDone with warnings.")
    return 0 if not (skipped or failed) else 1


if __name__ == '__main__':
    sys.exit(main())
