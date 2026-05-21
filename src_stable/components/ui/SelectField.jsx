// src/components/ui/SelectField.jsx
import React from 'react';

export const SelectField = ({
    label,
    name,
    value,
    onChange,
    required,
    disabled,
    options = [],
    children,
    className = '',
}) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        {label && (
            <label htmlFor={name} className="ncc-label">
                {label}
                {required && <span className="text-ncc-red ml-0.5">*</span>}
            </label>
        )}
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`ncc-input appearance-none bg-no-repeat pr-8 ${
                disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
            }`}
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '12px',
            }}
        >
            {children || options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    </div>
);

export default SelectField;
