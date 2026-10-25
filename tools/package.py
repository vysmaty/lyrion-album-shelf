#!/usr/bin/env python3
"""Build a byte-reproducible LMS plugin ZIP; never installs or uploads anything."""
import argparse
import hashlib
import io
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def build(output_dir):
    plugin = ROOT / 'plugin' / 'AlbumShelf'
    version = ET.parse(plugin / 'install.xml').getroot().findtext('version')
    if not version or not all(c.isdigit() or c == '.' for c in version):
        raise ValueError('Invalid plugin version')
    files = {}
    for path in plugin.rglob('*'):
        if path.is_symlink():
            raise ValueError(f'Symlink not permitted: {path.name}')
        if path.is_file() and not path.name.endswith('.webp.json') and not any(part.startswith('.') or part == '__pycache__' for part in path.relative_to(plugin).parts):
            files['AlbumShelf/' + path.relative_to(plugin).as_posix()] = path.read_bytes()
    for name in ('README.md', 'LICENSE', 'INTERFACE.md'):
        files['AlbumShelf/' + name] = (ROOT / name).read_bytes()
    for name in ('Plugin.pm','install.xml','strings.txt'):
        if 'AlbumShelf/' + name not in files:
            raise ValueError(f'Missing required file: {name}')
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    archive = output_dir / f'AlbumShelf-{version}.zip'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026,1,1,0,0,0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data, compresslevel=9)
    data = buffer.getvalue()
    if archive.exists() and archive.read_bytes() != data:
        raise ValueError(f'Refusing to overwrite existing release: {archive.name}; use a fresh output directory or a new version')
    archive.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n', encoding='ascii')
    print(f'{archive.name}: {len(files)} files; SHA256 {digest}')
    return archive


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT/'dist')
    build(parser.parse_args().output_dir)
