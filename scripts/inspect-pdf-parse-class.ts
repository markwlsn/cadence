async function inspectPDFParseClass() {
  const mod: any = await import('pdf-parse');
  console.log('PDFParse type:', typeof mod.PDFParse);
  console.log('PDFParse properties:', Object.getOwnPropertyNames(mod.PDFParse));
  console.log('PDFParse prototype properties:', Object.getOwnPropertyNames(mod.PDFParse.prototype));
}

inspectPDFParseClass();
