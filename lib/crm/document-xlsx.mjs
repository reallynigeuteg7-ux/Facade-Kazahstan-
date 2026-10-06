import { zipSync, unzipSync, strFromU8, strToU8 } from 'fflate';
import template from './document-template.json' with { type: 'json' };
import {
  totals,
  vatLabels,
  escapeXml,
  documentHeading,
  extraLines,
} from './documents.mjs';
// The template and styles were authored and verified with Artifact Tool.
export function documentXlsx(doc, kind) {
  const files = unzipSync(Buffer.from(template.base64, 'base64'));
  const normalize = (value) =>
    strFromU8(value)
      .replace(/(<\/?)(?:x:)/g, '$1')
      .replace('xmlns:x=', 'xmlns=');
  let xml = normalize(files['xl/worksheets/sheet1.xml']);
  const { amounts, total } = totals(doc),
    rows = [],
    merges = [];
  const text = (ref, value, style = 2) =>
    `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  const num = (ref, value, formula = '', style = 13) =>
    `<c r="${ref}" s="${style}">${formula ? `<f>${formula}</f>` : ''}${value === null ? '' : `<v>${value}</v>`}</c>`;
  let r = 0;
  const wide = (value, style = 8) => {
    r++;
    rows.push(
      `<row r="${r}" ht="${Math.max(
        22,
        String(value)
          .split('\n')
          .reduce(
            (s, line) => s + Math.max(1, Math.ceil(line.length / 120)),
            0,
          ) * 18,
      )}" customHeight="1">${text('A' + r, value, style)}</row>`,
    );
    merges.push(`A${r}:F${r}`);
  };
  wide(doc.supplier);
  wide(documentHeading(kind), 3);
  wide(
    `№ ${kind.toUpperCase()}-${doc.number} от ${doc.date.split('-').reverse().join('.')}`,
  );
  wide(doc.title);
  if (kind === 'kp') {
    wide('Клиент: ' + doc.recipient);
    if (doc.phone) wide('Телефон: ' + doc.phone);
  }
  wide(
    doc.vat === 'included'
      ? 'Цены включают НДС.'
      : doc.vat === 'without'
        ? 'Цены указаны без НДС.'
        : 'Налоговый режим не указан.',
  );
  if (doc.pricing === 'package') wide('Общая цена за комплект.');
  const headers = [
    'Наименование',
    'Примечание',
    'Ед. изм.',
    'Количество',
    'Цена за ед., ₸',
    `Сумма ${vatLabels[doc.vat]}, ₸`,
  ];
  r++;
  const header = r;
  rows.push(
    `<row r="${r}" ht="36" customHeight="1">${headers.map((v, i) => text('ABCDEF'[i] + r, v, 10)).join('')}</row>`,
  );
  const first = r + 1;
  doc.items.forEach((i, k) => {
    r++;
    const height = Math.max(
      46,
      Math.ceil(i.name.length / 30) * 16 + 12,
      Math.ceil(i.description.length / 42) * 16 + 12,
    );
    rows.push(
      `<row r="${r}" ht="${height}" customHeight="1">${text('A' + r, i.name, 11)}${text('B' + r, i.description, 11)}${text('C' + r, i.unit, 11)}${num('D' + r, Number(i.quantity), '', Number.isInteger(Number(i.quantity)) ? 16 : 15)}${doc.pricing === 'package' ? text('E' + r, '', 13) + num('F' + r, k === 0 ? total : null) : num('E' + r, Number(i.price)) + num('F' + r, amounts[k], `ROUND(D${r}*E${r},2)`)}</row>`,
    );
  });
  const last = r;
  if (doc.pricing === 'package' && last > first)
    merges.push(`F${first}:F${last}`);
  r++;
  rows.push(
    `<row r="${r}" ht="28" customHeight="1">${text('A' + r, `Итого ${vatLabels[doc.vat]}:`, 12)}${num('F' + r, total, `SUM(F${first}:F${last})`, 14)}</row>`,
  );
  merges.push(`A${r}:E${r}`);
  for (const [label, value] of extraLines(doc, kind))
    wide(`${label}: ${value}`);
  xml = xml
    .replace(
      /<sheetData>[\s\S]*?<\/sheetData>/,
      `<sheetData>${rows.join('')}</sheetData>`,
    )
    .replace(
      /<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>/,
      `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`,
    )
    .replace(/<dimension[^>]*\/>/, `<dimension ref="A1:F${r}"/>`)
    .replace(/<pageMargins[^>]*\/>/g, '')
    .replace(/<pageSetup[^>]*\/>/g, '');
  xml = xml.replace(
    '</worksheet>',
    `<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`,
  );
  files['xl/worksheets/sheet1.xml'] = strToU8(xml);
  let book = normalize(files['xl/workbook.xml'])
    .replace(/<definedNames>[\s\S]*?<\/definedNames>/, '')
    .replace(/<calcPr[^>]*\/>/g, '');
  book = book.replace(
    '</workbook>',
    `<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'Предложение'!$A$1:$F$${r}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'Предложение'!$${header}:$${header}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
  );
  files['xl/workbook.xml'] = strToU8(book);
  let styles = normalize(files['xl/styles.xml']);
  styles = styles
    .replace('<numFmts count="1">', '<numFmts count="3">')
    .replace(
      '</numFmts>',
      '<numFmt numFmtId="201" formatCode="#,##0.####"/><numFmt numFmtId="202" formatCode="#,##0"/></numFmts>',
    );
  styles = styles
    .replace('<cellXfs count="15">', '<cellXfs count="17">')
    .replace(
      '</cellXfs>',
      [201, 202]
        .map(
          (n) =>
            `<xf numFmtId="${n}" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`,
        )
        .join('') + '</cellXfs>',
    );
  files['xl/styles.xml'] = strToU8(styles);
  return zipSync(files, { level: 6 });
}
