// No filter values: a barcode filter would otherwise reach the browser's download history.
export const getFileNameForExport = (type: string) => `${type}_export`;
