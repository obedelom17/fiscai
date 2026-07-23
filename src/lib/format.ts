// Formatage de dates en français, factorisé pour éviter les répétitions.

export function formatDateFr(
  date: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleDateString('fr-FR', options)
}
