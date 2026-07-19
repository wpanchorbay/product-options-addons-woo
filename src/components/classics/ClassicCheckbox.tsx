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
      className={`opopw-flex opopw-flex-col opopw-gap-1 ${className}`}
    >
      <label
        htmlFor={checkboxId}
        className={`opopw-flex opopw-items-start opopw-gap-2 opopw-cursor-pointer ${
          disabled ? "opopw-opacity-50 opopw-cursor-not-allowed" : ""
        }`}
      >
        <div
          className={`
          opopw-flex opopw-items-center opopw-justify-center
          opopw-w-4 opopw-h-4 opopw-rounded opopw-border-2 
          opopw-mt-[7px] opopw-transition-all opopw-duration-200
          ${
            checked
              ? isError
                ? "!opopw-border-red-400 opopw-bg-red-400"
                : "opopw-border-[#2271b1] opopw-bg-[#2271b1]"
              : isError
              ? "!opopw-border-red-400 opopw-bg-white"
              : "opopw-border-[#8c8f94] opopw-bg-white hover:opopw-border-[#2271b1]"
          }
        `}
        >
          <svg
            className={`opopw-w-3.5 opopw-h-3.5 opopw-text-white opopw-transform opopw-transition-transform opopw-duration-200 ${
              checked ? "opopw-scale-100" : "opopw-scale-0"
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
            className="!opopw-hidden"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </div>
        {label && <span style={{ lineHeight: "28px" }}>{label}</span>}
      </label>
      {description && (
        <p className="description opopw-block opopw-mt-0 opopw-pl-6">
          {description}
        </p>
      )}
    </div>
  );
};
