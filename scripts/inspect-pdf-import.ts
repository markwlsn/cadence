async function inspectPdfParse() {
  const mod = await import('pdf-parse');
  console.log('Type of mod:', typeof mod);
  console.log('Keys of mod:', Object.keys(mod));
  console.log('mod default:', (mod as any).default);
  console.log('mod itself:', mod);
}

inspectPdfParse();
