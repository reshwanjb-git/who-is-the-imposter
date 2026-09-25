import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeImage({ url, size = 200 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#1a2332', light: '#f1faee' },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) return null;
  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={`QR-code om te joinen via ${url}`}
      style={{ borderRadius: 12, display: 'block', margin: '0 auto' }}
    />
  );
}
