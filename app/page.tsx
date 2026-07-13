import Script from 'next/script';

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Demo del SDK Drawer (React / Next.js)</h1>
      <p style={{ color: '#555', marginTop: 12 }}>
        Esta página instala el drawer con el componente <code>next/script</code>. Debería aparecer
        un botón &quot;Reservar&quot; abajo a la derecha. Al hacer clic se abre el panel con el mockup.
      </p>
      <Script src="/drawer.js" strategy="afterInteractive" />
    </main>
  );
}
