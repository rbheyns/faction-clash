import argparse, json, os, re

base = os.path.dirname(os.path.abspath(__file__))

def read_raw(path):
    """Read a file's exact bytes, decoded as UTF-8 but WITHOUT any newline
    translation (newline='' disables Python's universal-newlines behavior on
    both read and write) — this project's source files are a mix of LF-only
    JSON (see cards/*.json, *_batch1.json) and CRLF index.html/snippet
    files (Windows line endings), and silently normalizing either one on
    read+write would show up as a giant, misleading line-ending diff on
    every line of the file even when no actual content changed."""
    with open(os.path.join(base, path), 'r', encoding='utf-8', newline='') as f:
        return f.read()

def write_raw(path, content):
    with open(os.path.join(base, path), 'w', encoding='utf-8', newline='') as f:
        f.write(content)

def to_crlf(text):
    # Normalize to LF first so this is safe to call on content that might
    # already contain CRLF, then convert every LF to CRLF.
    return text.replace('\r\n', '\n').replace('\n', '\r\n')

# Keep in sync with CARD_SOURCES in js/dataLoader.js.
card_sources = [
    'ashborn_cards_batch1.json',
    'verdant_cards_batch1.json',
    'neutral_cards_batch1.json',
    'token_cards_batch1.json',
]
factions_json = read_raw('cards/factions.json')
keywords_json = read_raw('cards/keywords.json')

# id -> fresh inner content (as read from the LF-only canonical JSON files),
# in embed order. Index 0 is 'embedded-cards-data', index N is
# 'embedded-cards-data-N' — this mapping must match dataLoader.js's
# CARD_SOURCES-index convention.
blocks = {}
for i, path in enumerate(card_sources):
    embedded_id = 'embedded-cards-data' if i == 0 else f'embedded-cards-data-{i}'
    blocks[embedded_id] = read_raw(path)
blocks['embedded-factions-data'] = factions_json
blocks['embedded-keywords-data'] = keywords_json

# js/embedded-data-snippet.html is itself CRLF-terminated in this project
# (matches index.html's convention), so the snippet output uses CRLF too.
snippet_blocks = {eid: to_crlf(content) for eid, content in blocks.items()}
parts = [f'<script type="application/json" id="{eid}">\r\n{content}\r\n</script>' for eid, content in snippet_blocks.items()]
snippet = "\r\n".join(parts)

write_raw('js/embedded-data-snippet.html', snippet)

print("Wrote embedded-data-snippet.html:", len(snippet), "chars")

parser = argparse.ArgumentParser()
parser.add_argument('--update-index', action='store_true',
                     help="Also splice the freshly-generated embedded JSON blocks "
                          "directly into index.html's matching <script id=...> tags, "
                          "instead of leaving that as a manual copy-paste step.")
args = parser.parse_args()

if args.update_index:
    html = read_raw('index.html')
    # index.html uses CRLF in this project — match it so the diff is limited
    # to actual content changes, not a whole-file line-ending rewrite.
    index_is_crlf = '\r\n' in html
    missing = []
    for eid, content in blocks.items():
        insert = to_crlf(content) if index_is_crlf else content.replace('\r\n', '\n')
        line_break = '\r\n' if index_is_crlf else '\n'
        pattern = re.compile(
            r'(<script type="application/json" id="' + re.escape(eid) + r'">' + re.escape(line_break) + r')'
            r'.*?'
            r'(' + re.escape(line_break) + r'</script>)',
            re.DOTALL,
        )
        new_html, n = pattern.subn(lambda m: m.group(1) + insert + m.group(2), html, count=1)
        if n == 0:
            missing.append(eid)
        else:
            html = new_html
    if missing:
        raise SystemExit(
            "build_embedded_data.py: --update-index found no matching <script id=...> "
            "block in index.html for: " + ", ".join(missing) + " — index.html was NOT "
            "written. Add the missing embedded <script> tag(s) first (see the existing "
            "ones for the exact format), then re-run."
        )
    write_raw('index.html', html)
    print("Synced embedded JSON into index.html:", ", ".join(blocks.keys()))
