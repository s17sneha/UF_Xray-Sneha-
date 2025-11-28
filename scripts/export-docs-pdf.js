
/*
 Export UF-Xray docs HTML to PDFs using Puppeteer.
 Usage:
   npm run docs:pdf
 Output:
   docs/pdf/UF_Xray_Viva_Guide.pdf
   docs/pdf/UF_Xray_Deployment_Guide.pdf
*/

const fs = require('fs');
const path = require('path');

(async () => {
  const puppeteer = require('puppeteer');
  const root = process.cwd();
  const docsDir = path.join(root, 'docs');
  const outDir = path.join(docsDir, 'pdf');
  await fs.promises.mkdir(outDir, { recursive: true });

  const inputs = [
    {
      html: path.join(docsDir, 'UF_Xray_Viva_Guide.html'),
      pdf: path.join(outDir, 'UF_Xray_Viva_Guide.pdf'),
      title: 'UF‑Xray Viva Guide'
    },
    {
      html: path.join(docsDir, 'UF_Xray_Deployment_Guide.html'),
      pdf: path.join(outDir, 'UF_Xray_Deployment_Guide.pdf'),
      title: 'UF‑Xray Deployment Guide'
    }
  ];

  // Helpers for header/footer templates in Puppeteer
  const escapeHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const makeHeaderTemplate = (title, date) => `
    <style>
      .pdf-header {
        font-size: 9px; color: #6b7280; padding: 6px 12px; width: 100%;
        box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid #e5e7eb; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .pdf-header .title { color: #111827; font-weight: 600; }
    </style>
    <div class="pdf-header">
      <div class="title">${escapeHtml(title)}</div>
      <div>${escapeHtml(date)}</div>
    </div>
  `;

  const makeFooterTemplate = () => `
    <style>
      .pdf-footer {
        font-size: 9px; color: #6b7280; padding: 6px 12px; width: 100%;
        box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;
        border-top: 1px solid #e5e7eb; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .pdf-footer .brand { color: #374151; }
      .pdf-footer .pages { color: #374151; }
    </style>
    <div class="pdf-footer">
      <div class="brand">UF‑Xray</div>
      <div class="pages"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });

  for (const doc of inputs) {
    try {
      if (!fs.existsSync(doc.html)) {
        console.error('Missing HTML file:', doc.html);
        continue;
      }

      const page = await browser.newPage();
      const fileUrl = 'file://' + doc.html.replace(/\\/g, '/');
      await page.goto(fileUrl, { waitUntil: ['load','domcontentloaded','networkidle0'] });

      // Ensure screen styles are used for consistent rendering
      await page.emulateMediaType('screen');

      const headerTemplate = makeHeaderTemplate(doc.title, dateStr);
      const footerTemplate = makeFooterTemplate();

      await page.pdf({
        path: doc.pdf,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        // Slightly larger top/bottom margins to accommodate header/footer
        margin: { top: '16mm', right: '12mm', bottom: '18mm', left: '12mm' },
        preferCSSPageSize: true,
        scale: 0.98
      });
      console.log('Saved PDF:', path.relative(root, doc.pdf));
      await page.close();
    } catch (err) {
      console.error('Failed to export PDF for', doc.html, '-', err.message);
    }
  }

  await browser.close();
})();
