import React, { useRef, useEffect } from 'react';

interface InlineSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
  onCancel: () => void;
  className?: string;
}

export const InlineSelect: React.FC<InlineSelectProps> = ({
  value,
  options,
  onSave,
  onCancel,
  className = '',
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      className={`px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 ${className}`}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}; 