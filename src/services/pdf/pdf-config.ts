// src/services/pdf/pdf-config.ts
export const PDF_CONFIG = {
    colors: {
        primary: '#0891b2',
        primaryLight: '#e0f2fe',
        background: '#f1f5f9',
        text: '#1e293b',
        textMuted: '#475569',
        textLight: '#64748b',
        border: '#e2e8f0',
        success: '#059669',
        successLight: '#ecfdf5',
        danger: '#dc2626',
    },
    layout: {
        pageWidth: 595,
        pageHeight: 842,
        leftMargin: 40,
        contentWidth: 515,
        headerHeight: 50,
    },
    fonts: {
        regular: 'Regular',
        bold: 'Bold',
        mono: 'Mono',
    },
    sizes: {
        title: 16,
        subtitle: 11,
        header: 9,
        normal: 8,
        small: 7.5,
        tiny: 7,
        micro: 6,
    },
} as const;

export type PDFConfig = typeof PDF_CONFIG;