"""Distribution checks; no dependencies outside Python's standard library."""
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]

class DistributionTests(unittest.TestCase):
    def test_install_metadata_is_standalone(self):
        path = ROOT / 'plugin/AlbumShelf/install.xml'
        self.assertTrue(path.is_file(), 'plugin metadata is missing')
        root = ET.parse(path).getroot()
        self.assertEqual(root.findtext('module'), 'Plugins::AlbumShelf::Plugin')
        self.assertEqual(root.findtext('version'), '0.1.0')
        self.assertEqual(root.findtext('name'), 'PLUGIN_ALBUMSHELF')
        self.assertEqual(root.findtext('targetApplication/minVersion'), '8.5')
        self.assertIsNone(root.find('optionsURL'))

    def test_reproducible_zip_has_only_plugin_and_documents(self):
        tool = ROOT / 'tools/package.py'
        self.assertTrue(tool.is_file(), 'packaging command is missing')
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            result = subprocess.run([sys.executable, str(tool), '--output-dir', str(out)], cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            archive = out / 'AlbumShelf-0.1.0.zip'
            self.assertTrue(archive.is_file())
            before = archive.read_bytes()
            with zipfile.ZipFile(archive) as z:
                self.assertIsNone(z.testzip())
                names = z.namelist()
                self.assertEqual(names, sorted(names))
                self.assertTrue(all(n.startswith('AlbumShelf/') for n in names))
                for required in ['Plugin.pm','install.xml','strings.txt','README.md','LICENSE','INTERFACE.md']:
                    self.assertIn('AlbumShelf/' + required, names)
                self.assertFalse(any('/tests/' in n or '/.git/' in n or n.endswith('.pyc') for n in names))
                self.assertEqual(z.read('AlbumShelf/Plugin.pm'), (ROOT/'plugin/AlbumShelf/Plugin.pm').read_bytes())
            again = subprocess.run([sys.executable,str(tool),'--output-dir',str(out)],cwd=ROOT,capture_output=True,text=True)
            self.assertEqual(again.returncode,0,again.stderr)
            self.assertEqual(before,archive.read_bytes(),'ZIP must be byte-reproducible')
            expected = hashlib.sha256(before).hexdigest()
            self.assertEqual((out/'AlbumShelf-0.1.0.zip.sha256').read_text().strip(),expected+'  AlbumShelf-0.1.0.zip')

    def test_packaged_code_is_exercised_and_unsafe_zip_is_rejected(self):
        tool = ROOT / 'tools/verify_package.py'
        self.assertTrue(tool.is_file(), 'package verifier is missing')
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            subprocess.run([sys.executable,str(ROOT/'tools/package.py'),'--output-dir',str(out)],check=True,capture_output=True)
            run = subprocess.run([sys.executable,str(tool),str(out/'AlbumShelf-0.1.0.zip')],cwd=ROOT,text=True,capture_output=True)
            self.assertEqual(run.returncode,0,run.stdout+run.stderr)
            self.assertIn('Packaged backend and frontend tests: PASS',run.stdout)
            bad = out/'unsafe.zip'
            with zipfile.ZipFile(bad,'w') as z:
                z.writestr('AlbumShelf/../../escape','bad')
            rejected = subprocess.run([sys.executable,str(tool),str(bad)],cwd=ROOT,text=True,capture_output=True)
            self.assertNotEqual(rejected.returncode,0)
            self.assertIn('Unsafe archive path',rejected.stdout+rejected.stderr)

if __name__ == '__main__':
    unittest.main()
