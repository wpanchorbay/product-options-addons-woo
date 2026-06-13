import React, { useMemo } from "react";

interface ClassicCheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  className?: string;
  isError?: boolean;
  id?: string;
}

export const ClassicCheckbox: React.FC<ClassicCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled,
  description,
  className = "",
  isError = false,
  id,
}) => {
  const checkboxId = useMemo(
    () => id || `classic-cb-${Math.random().toString(36).slice(2, 9)}`,
    [id],
  );

  return (
    <div
      className={`spoa-flex spoa-flex-col spoa-gap-1 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className={`spoa-flex spoa-items-start spoa-gap-2 spoa-cursor-pointer ${
          disabled ? "spoa-opacity-50 spoa-cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`
          spoa-flex spoa-items-center spoa-justify-center
          spoa-w-4 spoa-h-4 spoa-rounded spoa-border-2 
          spoa-mt-[7px] spoa-transition-all spoa-duration-200
          ${
            checked
              ? isError
                ? "!spoa-border-red-400 spoa-bg-red-400"
                : "spoa-border-[#2271b1] spoa-bg-[#2271b1]"
              : isError
              ? "!spoa-border-red-400 spoa-bg-white"
              : "spoa-border-[#8c8f94] spoa-bg-white hover:spoa-border-[#2271b1]"
          }
        `}
        >
          <svg
            className={`spoa-w-3.5 spoa-h-3.5 spoa-text-white spoa-transform spoa-transition-transform spoa-duration-200 ${
              checked ? "spoa-scale-100" : "spoa-scale-0"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <input
            id={checkboxId}
            type="checkbox"
            className="!spoa-hidden"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
        {label && <span style={{ lineHeight: "28px" }}>{label}</span>}
      </label>
      {description && (
        <p className="description spoa-block spoa-mt-0 spoa-pl-6">
          {description}
        </p>
      )}
    </div>
  );
};
