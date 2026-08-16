from pathlib import Path
import hashlib
import re
import sys

files = sorted(Path('src/data').glob('regimento*.ts'))
text = '\n'.join(path.read_text(encoding='utf-8') for path in files)

ids = re.findall(r"\bid\s*:\s*['\"]([^'\"]+)['\"]", text)
articles = [int(value) for value in re.findall(r"\barticle\s*:\s*(\d+)\b", text)]

seen = set()
duplicates = sorted({device_id for device_id in ids if device_id in seen or seen.add(device_id)})
covered = set(articles)
missing = [number for number in range(1, 210) if number not in covered]
out_of_range = sorted(number for number in covered if number < 1 or number > 209)

errors = []
if duplicates:
    errors.append(f'Device IDs duplicados: {duplicates}')
if missing:
    errors.append(f'Artigos sem nenhum dispositivo: {missing}')
if out_of_range:
    errors.append(f'Artigos fora do intervalo 1-209: {out_of_range}')
if not ids:
    errors.append('Nenhum dispositivo encontrado.')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)

canonical = '\n'.join(sorted(ids)).encode('utf-8')
manifest_hash = hashlib.sha256(canonical).hexdigest()
print(f'OK: {len(ids)} dispositivos únicos cobrindo todos os artigos 1-209 em {len(files)} arquivos.')
print(f'DEVICE_MANIFEST_SHA256={manifest_hash}')
