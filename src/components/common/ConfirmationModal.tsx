import React, { useEffect, useRef } from "react";
import Button from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  autoFocus?: "confirm" | "cancel";
  classNames?: {
    overlay?: string;
    content?: string;
    title?: string;
    message?: string;
    footer?: string;
    button?: {
      cancelClassName?: string;
      confirmClassName?: string;
      cancelVariant?: "solid" | "outline" | "ghost";
      confirmVariant?: "solid" | "outline" | "ghost";
      cancelColor?: "primary" | "secondary" | "danger";
      confirmColor?: "primary" | "secondary" | "danger";
    };
  };
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  autoFocus = "confirm",
  classNames = {},
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (autoFocus === "cancel") {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }
  }, [isOpen, autoFocus]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`opopw-fixed opopw-inset-0 opopw-z-[60000] opopw-flex opopw-items-center opopw-justify-center opopw-bg-black/50 opopw-backdrop-blur-sm opopw-transition-opacity ${
        classNames.overlay || ""
      }`}
    >
      <div
        className={`opopw-bg-white opopw-rounded-lg opopw-shadow-xl opopw-py-2 opopw-px-4 opopw-max-w-sm opopw-w-full opopw-mx-4 opopw-transform opopw-transition-all opopw-scale-100 ${
          classNames.content || ""
        }`}
      >
        <h3
          className={`opopw-ignore-preflight opopw-mb-2 opopw-mt-0 opopw-text-nowrap ${
            classNames.title || ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`opopw-text-gray-600 opopw-mb-6 opopw-text-sm opopw-leading-relaxed ${
            classNames.message || ""
          }`}
        >
          {message}
        </p>
        <div
          className={`opopw-flex opopw-justify-end opopw-gap-3 opopw-mt-3 ${
            classNames.footer || ""
          }`}
        >
          <Button
            ref={cancelRef}
            className={classNames.button?.cancelClassName || ""}
            variant={classNames.button?.cancelVariant || "ghost"}
            color={classNames.button?.cancelColor || "secondary"}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            className={classNames.button?.confirmClassName || ""}
            variant={classNames.button?.confirmVariant || "solid"}
            color={classNames.button?.confirmColor || "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
