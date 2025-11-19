declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: string[][];
      body?: string[][];
      styles?: Record<string, unknown>;
      headStyles?: Record<string, unknown>;
    }) => jsPDF;
  }
}
