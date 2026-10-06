#!/usr/bin/env python3
"""Set a unique synthetic folio in the template downloaded through the real UI."""
import sys
import zipfile
import xml.etree.ElementTree as ET
source, destination, folio = sys.argv[1:]
namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
with zipfile.ZipFile(source) as book, zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as out:
    for entry in book.infolist():
        content = book.read(entry.filename)
        if entry.filename == 'xl/worksheets/sheet1.xml':
            root = ET.fromstring(content)
            cell = root.find('.//s:c[@r="A2"]', {'s': namespace})
            if cell is None:
                raise ValueError('Expected folio cell A2 in server template')
            cell.clear()
            cell.set('r', 'A2')
            cell.set('t', 'inlineStr')
            ET.SubElement(ET.SubElement(cell, '{'+namespace+'}is'), '{'+namespace+'}t').text = folio
            content = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        out.writestr(entry, content)
