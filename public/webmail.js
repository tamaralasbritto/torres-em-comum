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
        <p class="webmail-copy">O destinatário, o assunto e o texto já vão preenchidos. Depois, é só anexar o PDF que você salvou.</p>
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

      if (provider === 'gmail') {
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(OFFICE_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        dialog.close();
      } else if (provider === 'outlook') {
        const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(OFFICE_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        dialog.close();
      } else if (provider === 'copy') {
        const full = `Para: ${OFFICE_EMAIL}\nAssunto: ${subject}\n\n${body}`;
        try {
          await navigator.clipboard.writeText(full);
          const status = dialog.querySelector('.webmail-status');
          if (status) status.textContent = 'Texto copiado.';
        } catch {
          const status = dialog.querySelector('.webmail-status');
          if (status) status.textContent = 'Não foi possível copiar automaticamente.';
        }
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
