export const categories = [
  { value: 'MORADIA', label: 'Moradia', color: '#176a53' },
  { value: 'ESTUDOS', label: 'Estudos', color: '#436ba0' },
  { value: 'TRANSPORTE', label: 'Transporte', color: '#96641e' },
  { value: 'SAUDE', label: 'Saúde', color: '#a34461' },
  { value: 'ASSINATURAS', label: 'Assinaturas', color: '#715399' },
  { value: 'ALIMENTACAO', label: 'Alimentação', color: '#aa4f21' },
  { value: 'LAZER', label: 'Lazer', color: '#267d86' },
  { value: 'OUTRAS', label: 'Outras', color: '#62716a' }
] as const;
export type Category = typeof categories[number]['value'];
export const categoryLabel = (value?: string) => categories.find(item => item.value === value)?.label ?? 'Outras';
