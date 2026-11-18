/** Link do WhatsApp para o contato do cliente (aceita número com ou sem 55). */
export function whatsLink(contact, text) {
  let n = String(contact || '').replace(/\D/g, '');
  if (n.length < 10) return null;
  if (n.length <= 11) n = `55${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
