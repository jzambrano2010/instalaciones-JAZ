import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'ElectroPlan AR - Diseño Eléctrico Ley 10281 & AEA 770',
  description:
    'Aplicación profesional de diseño e ingeniería eléctrica para viviendas en Córdoba y Argentina. Visor interactivo de planos con calibración, medición de distancias y superficies, detección por IA, esquema unifilar IEC/IRAM, cómputo de cables y caños, e informe oficial de carga bajo normas AEA 90364-7-770, Ley 10281 ERSeP y EPEC.',
  openGraph: {
    title: 'ElectroPlan AR - Diseño Eléctrico Ley 10281 & AEA 770',
    description:
      'Aplicación profesional de diseño e ingeniería eléctrica para viviendas en Córdoba y Argentina. Visor interactivo de planos con calibración, medición de distancias y superficies, detección por IA, esquema unifilar IEC/IRAM, cómputo de cables y caños, e informe oficial de carga bajo normas AEA 90364-7-770, Ley 10281 ERSeP y EPEC.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ElectroPlan AR - Diseño Eléctrico Ley 10281 & AEA 770',
    description:
      'Aplicación profesional de diseño e ingeniería eléctrica para viviendas en Córdoba y Argentina. Visor interactivo de planos con calibración, medición de distancias y superficies, detección por IA, esquema unifilar IEC/IRAM, cómputo de cables y caños, e informe oficial de carga bajo normas AEA 90364-7-770, Ley 10281 ERSeP y EPEC.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
