"""Parse K-file winner technique and actual entry courses, strictly after race.
No same-race K information may be used as a predictive feature.
"""
import re
import unicodedata

VENUE = re.compile(r'^\s*(\d{1,2})KBGN')
RACE = re.compile(r'^\s*(\d{1,2})R\s+.*?H\s*\d+\s*m\b')
RESULT = re.compile(
    r'^\s*(0[1-6]|F|L[01]?|K[01]|S[0-2])\s+([1-6])\s+(\d{4})\s+'
    r'(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d\.\d\d|\.)\s+([1-6])\s+'
    r'(?:F?\d\.\d\d|[FL]\s*\.\d\d|L\d?|K\d?|\d\.\d\d|\.)'
)
METHOD = re.compile(r'決まり手\s*[:：]?\s*(まくり\s*差し|まくり|逃\s*げ|差\s*し|抜\s*き|恵まれ)')
STANDALONE = re.compile(r'^\s*(まくり\s*差し|まくり|逃\s*げ|差\s*し|抜\s*き|恵まれ)\s*$')
KNOWN = frozenset(('逃げ','差し','まくり','まくり差し','抜き','恵まれ'))

def norm(text):
    return unicodedata.normalize('NFKC', text)

def _block(rid, lines):
    if not rid:
        return None
    method = None
    entrants = {}
    winner = None
    for raw in lines:
        line = norm(raw)
        m = METHOD.search(line)
        if m:
            candidate = re.sub(r'\s+', '', m.group(1))
            if candidate in KNOWN:
                method = candidate
        m = RESULT.match(line)
        if m:
            position, boat, racer, _, _, _, _, course = m.groups()
            boat = int(boat)
            if boat in entrants:
                return None
            entrants[boat] = {'racerId': racer, 'actualCourse': int(course)}
            if position == '01':
                winner = (boat, racer, int(course))
    if not winner or len(entrants) != 6 or len({e['actualCourse'] for e in entrants.values()}) != 6:
        return None
    return {'winnerLane': winner[0], 'winnerRacerId': winner[1],
            'winnerCourse': winner[2], 'technique': method, 'entrants': entrants}

def parse_k_techniques(text, day):
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', day):
        raise ValueError('Invalid date')
    venue = None
    rid = None
    block = []
    found = {}
    def flush():
        if rid is not None:
            rec = _block(rid, block)
            if rec:
                if rid in found:
                    raise ValueError('Duplicate K race '+rid)
                found[rid] = rec
    for raw in text.splitlines():
        line = norm(raw)
        m = VENUE.match(line)
        if m:
            flush()
            venue = int(m.group(1))
            rid = None
            block = []
            continue
        m = RACE.match(line)
        if m and venue is not None:
            flush()
            race_no = int(m.group(1))
            rid = day.replace('-', '') + f'{venue:02d}{race_no:02d}' if 1 <= race_no <= 12 else None
            block = []
            continue
        if rid is not None:
            block.append(raw)
    flush()
    return found

def augment_races(races, k_text, day):
    """Only accept K results whose boat-to-registration mapping matches B."""
    parsed = parse_k_techniques(k_text, day)
    stats = {'joined': 0, 'methodKnown': 0, 'missingKRows': 0, 'mismatch': 0}
    for race in races:
        info = parsed.get(str(race['id']))
        if not info:
            stats['missingKRows'] += 1
            continue
        try:
            by_lane = {int(e['lane']): e for e in race['entries']}
            valid = (len(by_lane) == 6 and
                     all(str(by_lane[lane]['id']) == data['racerId']
                         for lane, data in info['entrants'].items()) and
                     int(str(race['winningCombo']).split('-')[0]) == info['winnerLane'])
        except (KeyError, ValueError, TypeError):
            valid = False
        if not valid:
            stats['mismatch'] += 1
            continue
        for lane, data in info['entrants'].items():
            by_lane[lane]['actualCourse'] = data['actualCourse']
        race['technique'] = info['technique']
        stats['joined'] += 1
        if info['technique']:
            stats['methodKnown'] += 1
    return stats
