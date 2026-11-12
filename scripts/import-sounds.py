"""Read the supplied cube-net workbook without modifying it. Uses Python stdlib only."""
import json, pathlib, sys, zipfile, xml.etree.ElementTree as ET
source=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/Users/micki/Downloads/Edge sounds.xlsx')
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
 strings=[''.join(t.text or '' for t in si.findall('.//m:t',ns)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
 cells={}
 for c in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:sheetData/m:row/m:c',ns):
  v=c.find('m:v',ns)
  if v is not None:cells[c.get('r')]=strings[int(v.text)] if c.get('t')=='s' else v.text
# Positions follow the face centers U/L/F/R/B/D in Sheet1. Labels follow
# cube.py's original scheme and the exact positional conversion in file_creation.py.
positions={'E5':('UB','F','F'),'D6':('UL','P','A'),'F6':('UR','D','D'),
 'B8':('LU','K','K'),'A9':('LB','I','I'),'C9':('LF','L','L'),'B10':('LD','Ø','Ø'),
 'D9':('FL','E','E'),'F9':('FR','H','X'),'E10':('FD','G','G'),
 'H8':('RU','T','T'),'G9':('RF','M','M'),'I9':('RB','C','C'),'H10':('RD','N','N'),
 'K8':('BU','S','S'),'J9':('BR','Q','Y'),'L9':('BL','O','O'),'K10':('BD','R','R'),
 'E11':('DF','B','B'),'D12':('DL','U','U'),'F12':('DR','J','J'),'E13':('DB','V','V')}
sounds={}
for cell,(sticker,firstLabel,secondLabel) in positions.items():
 parts=[s.strip() for s in cells[cell].split('/')]
 assert len(parts)==2 and all(parts),cell
 sounds[sticker]={'first':parts[0],'second':parts[1],'firstLabel':firstLabel,'secondLabel':secondLabel,'sourceCell':cell}
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'data/library.json';library=json.loads(p.read_text());library['sounds']=sounds
library['notes']['edgeSounds']={'source':'Edge sounds.xlsx','sheet':'Sheet1','range':'A5:L13','interpretation':'First/second sounds read directly from cube-net cells. Sticker positions inferred from face centers. Pair labels derived from cube.py plus file_creation.py; editable in the sound library.'}
p.write_text(json.dumps(library,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(sounds)} stickers / {len(sounds)*2} positional sounds.')
