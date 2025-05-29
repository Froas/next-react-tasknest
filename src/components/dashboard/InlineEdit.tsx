import React, { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  type?: 'text' | 'textarea';
  className?: string;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  className = '',
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(editValue);
  };

  const commonProps = {
    ref: inputRef,
    value: editValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    className: `w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 ${className}`,
  };

  return type === 'textarea' ? (
    <textarea {...commonProps} rows={3} />
  ) : (
    <input type="text" {...commonProps} />
  );
}; 