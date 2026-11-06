import { useId } from 'react';

type Props = Readonly<{ label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }>;

export function SettingCheckbox({ label, description, checked, onChange }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  return <div className="setting-option">
    <input id={id} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} aria-describedby={hintId}/>
    <div className="setting-copy"><label htmlFor={id}>{label}</label><small id={hintId}>{description}</small></div>
  </div>;
}
