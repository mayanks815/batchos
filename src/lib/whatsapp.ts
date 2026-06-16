export function shareOnWhatsApp(message: string) {
  if (typeof window !== 'undefined') {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }
}
