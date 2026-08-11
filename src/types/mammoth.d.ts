declare module 'mammoth' {
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;
}
