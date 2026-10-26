(() => {
  'use strict';
  const status = document.getElementById('status');
  const message = document.getElementById('message');
  const frame = document.getElementById('guide');
  let pdfUrl;
  const from64 = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const failure = text => { message.textContent = text; };
  async function openGuide() {
    const keyText = new URLSearchParams(location.hash.slice(1)).get('k');
    if (!keyText) return failure('案内された共有リンクから開いてください。リンクは最後まで省略せずにお使いください。');
    if (!/^[A-Za-z0-9_-]{43}$/.test(keyText)) return failure('共有リンクが途中で切れているようです。送られてきたリンクをもう一度開いてください。');
    if (!globalThis.crypto?.subtle) return failure('このブラウザーでは開けません。SafariやChromeで共有リンクを開いてください。');
    try {
      const response = await fetch('./content.enc.json', { cache: 'no-cache', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('fetch');
      const encrypted = await response.json();
      const key = await crypto.subtle.importKey('raw', from64(keyText), 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(encrypted.iv), additionalData: new TextEncoder().encode('trip-guide-v1') }, key, from64(encrypted.data));
      const content = JSON.parse(new TextDecoder().decode(decrypted));
      if (typeof content.html !== 'string' || typeof content.pdf !== 'string') throw new Error('format');
      const doc = new DOMParser().parseFromString(content.html, 'text/html');
      for (const [name, value] of [['robots', 'noindex,nofollow,noarchive'], ['referrer', 'no-referrer']]) {
        const meta = doc.createElement('meta'); meta.name = name; meta.content = value; doc.head.append(meta);
      }
      doc.querySelectorAll('script').forEach(el => el.remove());
      doc.querySelectorAll('a').forEach(el => { el.target = '_blank'; el.rel = 'noopener noreferrer'; });
      frame.addEventListener('load', () => {
        const frameDoc = frame.contentDocument;
        const labels = [...frameDoc.querySelectorAll('.tabs label[for]')];
        if (labels.length) {
          const nav = document.createElement('nav');
          nav.id = 'guide-tabs';
          nav.setAttribute('aria-label', 'しおりの表示切り替え');
          for (const label of labels) {
            const input = frameDoc.getElementById(label.htmlFor);
            if (!input) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.tab = input.id;
            button.textContent = label.firstChild.textContent.trim();
            button.setAttribute('aria-pressed', String(input.checked));
            button.addEventListener('click', () => {
              input.checked = true;
              nav.querySelectorAll('button').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            nav.append(button);
          }
          document.getElementById('toolbar').append(nav);
          frameDoc.querySelector('.tabs').style.display = 'none';
        }
        frameDoc.querySelectorAll('a[href="#top"]').forEach(link => {
          link.removeAttribute('target');
          link.addEventListener('click', event => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });
        const contentRoot = frameDoc.body;
        const resize = () => { frame.style.height = `${Math.ceil(contentRoot.getBoundingClientRect().height) + 1}px`; };
        resize(); new ResizeObserver(resize).observe(contentRoot);
        frame.contentDocument.querySelectorAll('img').forEach(img => img.addEventListener('load', resize));
      }, { once: true });
      frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
      pdfUrl = URL.createObjectURL(new Blob([from64(content.pdf)], { type: 'application/pdf' }));
      document.getElementById('download').href = pdfUrl;
      document.getElementById('toolbar').hidden = false;
      status.hidden = true; frame.hidden = false;
    } catch {
      failure('しおりを開けませんでした。通信状態を確認して再読み込みするか、案内された共有リンクをもう一度開いてください。');
    }
  }

  addEventListener('hashchange', () => location.reload());
  openGuide();
})();