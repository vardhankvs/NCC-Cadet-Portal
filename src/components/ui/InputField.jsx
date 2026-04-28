// src/components/ui/InputField.jsx
import React from 'react';

export const InputField = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    required,
    placeholder,
    disabled,
    readOnly,
    min,
    max,
    step,
    className = '',
}) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
            <label htmlFor={name} className="ncc-label">
                {label}
                {required && <span className="text-ncc-red ml-0.5">*</span>}
            </label>
        )}
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            step={step}
            className={`ncc-input ${disabled || readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
        />
    </div>
);

export default InputField;
