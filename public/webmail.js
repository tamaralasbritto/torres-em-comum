(() => {
  const OFFICE_EMAIL = 'tercio@tercioguilhermeadv.com';
  const PARTICIPANT_KEY = 'torres-em-comum:participant';

  const readParticipant = () => {
    try { return JSON.parse(localStorage.getItem(PARTICIPANT_KEY) || 'null'); }
    catch { return null; }
  };

  const emailContent = () => {
    const participant = readParticipant();
    const name = participant?.name || 'Participante';
    const unit = participant ? `Torre ${participant.tower} — Apartamento ${participant.apartment}` : '';
    const subject = participant
      ? `Manifestação sobre o Regimento Interno — Torre ${participant.tower} / Apto. ${participant.apartment}`
      : 'Manifestação sobre o Regimento Interno — Torres de Olinda';
    const body = `Prezados,\n\nSeguem, em anexo, minhas considerações a respeito da proposta de Regimento Interno do Condomínio Torres de Olinda.\n\nAtenciosamente,\n${name}${unit ? `\n${unit}` : ''}`;
    return { subject, body };
  };

  const fullEmailText = (subject, body) => `Para: ${OFFICE_EMAIL}\nAssunto: ${subject}\n\n${body}`;

  const copyEmailText = async (subject, body) => {
    try {
      await navigator.clipboard.writeText(fullEmailText(subject, body));
      return true;
    } catch {
      return false;
    }
  };

  const ensureDialog = () => {
    let dialog = document.getElementById('webmail-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'webmail-dialog';
    dialog.className = 'webmail-dialog';
    dialog.innerHTML = `
      <form method="dialog" class="webmail-card">
        <p class="webmail-eyebrow">ENVIAR MANIFESTAÇÃO</p>
        <h2>Onde você quer abrir o e-mail?</h2>
        <p class="webmail-copy">O destinatário, o assunto e o texto já vão preenchidos. Como segurança, esses dados também serão copiados automaticamente. Se o seu provedor abrir uma mensagem vazia, basta colar e anexar o PDF.</p>
        <div class="webmail-options">
          <button type="button" data-webmail="gmail">Abrir no Gmail →</button>
          <button type="button" data-webmail="outlook">Abrir no Outlook / Hotmail →</button>
          <button type="button" class="secondary" data-webmail="copy">Copiar texto do e-mail</button>
        </div>
        <button class="webmail-close" value="cancel">Cancelar</button>
        <p class="webmail-status" aria-live="polite"></p>
      </form>`;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-webmail]');
      if (!button) return;
      const { subject, body } = emailContent();
      const provider = button.dataset.webmail;
      const status = dialog.querySelector('.webmail-status');

      if (provider === 'gmail' || provider === 'outlook') {
        const copied = await copyEmailText(subject, body);
        if (status) status.textContent = copied
          ? 'Dados do e-mail copiados. Se a nova mensagem abrir vazia, basta colar.'
          : 'Não consegui copiar automaticamente, mas vou tentar abrir a mensagem preenchida.';

        const url = provider === 'gmail'
          ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(OFFICE_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          : `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(OFFICE_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => dialog.close(), 350);
      } else if (provider === 'copy') {
        const copied = await copyEmailText(subject, body);
        if (status) status.textContent = copied
          ? 'Texto copiado.'
          : 'Não foi possível copiar automaticamente.';
      }
    });
    return dialog;
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest('#receipt-email');
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const dialog = ensureDialog();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, true);

  const relabel = () => {
    const button = document.getElementById('receipt-email');
    if (button) button.textContent = 'Abrir e-mail no navegador →';
  };
  relabel();
  new MutationObserver(relabel).observe(document.documentElement, { childList: true, subtree: true });
})();
