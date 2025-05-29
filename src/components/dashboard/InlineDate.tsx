import React, { useRef, useEffect } from 'react';

interface InlineDateProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  className?: string;
}

export const InlineDate: React.FC<InlineDateProps> = ({
  value,
  onSave,
  onCancel,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={(e) => onSave(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
      className={`px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 ${className}`}
    />
  );
}; 