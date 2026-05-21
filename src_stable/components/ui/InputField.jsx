import React, { useState } from 'react';
import { VisibilityIcon, VisibilityOffIcon } from '../Icons.jsx';

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
    icon: Icon,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={name} className="ncc-label text-sm font-semibold text-gray-700 dark:text-white/80">
                    {label}
                    {required && <span className="text-ncc-red ml-0.5">*</span>}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ncc-navy transition-colors pointer-events-none">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input
                    id={name}
                    name={name}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    min={min}
                    max={max}
                    step={step}
                    className={`ncc-input w-full ${Icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'} ${disabled || readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-ncc-navy dark:hover:text-ncc-gold transition-colors"
                        tabIndex="-1"
                    >
                        {showPassword ? (
                            <VisibilityOffIcon className="w-4 h-4" />
                        ) : (
                            <VisibilityIcon className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputField;
