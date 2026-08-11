/* eslint-disable */
import { CircleQuestionMark, CircleQuestionMarkIcon } from "lucide-react";
import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface ClassicTooltipProps {
  tip: string;
  className?: string;
}

/**
 * Renders the WooCommerce-native help tip icon.
 * Implements a pure React Portal tooltip instead of relying on
 * WooCommerce's bundled jQuery (tipTip) which fails on dynamically rendered React nodes.
 * @param root0
 * @param root0.tip
 * @param root0.className
 */
export const ClassicTooltip: React.FC<ClassicTooltipProps> = ({
  tip,
  className = "",
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLSpanElement>(null);

  const updateCoords = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  };
  return (
    <>
      <span
        ref={iconRef}
        onPointerEnter={(e) => {
          updateCoords();
          setVisible(true);
        }}
        onPointerLeave={(e) => {
          setVisible(false);
        }}
        onFocus={(e) => {
          updateCoords();
          setVisible(true);
        }}
        onBlur={(e) => {
          setVisible(false);
        }}
        tabIndex={0}
        className={`woocommerce-help-tip`}
      ></span>
      {visible &&
        createPortal(
          <div
            className="opopw-fixed opopw-z-[999999] opopw-bg-[#333] opopw-text-white opopw-px-2 opopw-py-1 opopw-rounded opopw-text-xs opopw-leading-snug opopw-max-w-[200px] opopw-text-center opopw-pointer-events-none opopw-shadow-sm"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)",
            }}
          >
            {tip}
            <div
              className="opopw-absolute opopw-border-[5px] opopw-border-solid opopw-border-t-[#333] opopw-border-x-transparent opopw-border-b-transparent"
              style={{
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
