#!/usr/bin/env python3
"""Validate an AlbumShelf ZIP and exercise its actual extracted code, without installing LMS."""
import argparse
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def verify(archive):
    with tempfile.TemporaryDirectory(prefix='albumshelf-verify-') as temp:
        base = Path(temp)
        plugin_root = base / 'plugin'
        with zipfile.ZipFile(archive) as z:
            names = z.namelist()
            if len(set(names)) != len(names):
                raise ValueError('Duplicate archive paths')
            total = 0
            for info in z.infolist():
                path = PurePosixPath(info.filename)
                if (not path.parts or path.parts[0] != 'AlbumShelf' or path.is_absolute()
                        or '..' in path.parts or '\\' in info.filename
                        or stat.S_ISLNK(info.external_attr >> 16)):
                    raise ValueError(f'Unsafe archive path: {info.filename}')
                total += info.file_size
                if info.file_size > 10_000_000 or total > 50_000_000:
                    raise ValueError('Archive exceeds size limit')
            for name in ('Plugin.pm','install.xml','strings.txt','HTML/index.html','HTML/core.js','HTML/app.js','HTML/style.css'):
                if 'AlbumShelf/'+name not in names:
                    raise ValueError(f'Missing packaged runtime file: {name}')
            if z.testzip():
                raise ValueError('Archive CRC failure')
            z.extractall(plugin_root)
        plugin = plugin_root / 'AlbumShelf'
        metadata = ET.parse(plugin / 'install.xml').getroot()
        if metadata.findtext('module') != 'Plugins::AlbumShelf::Plugin':
            raise ValueError('Incorrect plugin module')
        env = dict(os.environ, ALBUMSHELF_PLUGIN=str(plugin / 'Plugin.pm'))
        subprocess.run(['prove','-v',str(ROOT/'tests/backend.t')],check=True,env=env)
        # Relocate only the tests so their relative imports resolve to the packaged frontend.
        tests = base / 'tests'
        tests.mkdir()
        shutil.copy2(ROOT/'tests/frontend.test.cjs',tests/'frontend.test.cjs')
        subprocess.run(['node','--test',str(tests/'frontend.test.cjs')],check=True)
        for script in plugin.glob('HTML/*.js'):
            subprocess.run(['node','--check',str(script)],check=True)
        print('Packaged backend and frontend tests: PASS (LMS/TIDAL boundary stubs; not live integration)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive',type=Path)
    args = parser.parse_args()
    try:
        verify(args.archive)
    except (ValueError,zipfile.BadZipFile,subprocess.CalledProcessError) as exc:
        parser.exit(1,f'Package verification failed: {exc}\n')
