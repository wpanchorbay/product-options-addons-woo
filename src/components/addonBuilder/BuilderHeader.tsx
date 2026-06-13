import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import { ArrowLeft } from "lucide-react";
import { ClassicButton } from "../classics";
import { useAddonContext } from "../../store/AddonContext";
import apiFetch from "../../utils/apiFetch";
import { useToast } from "../../store/toast/use-toast";

interface BuilderHeaderProps {
  handleSave: () => void;
  isEdit: boolean;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  handleSave,
  isEdit,
}) => {
  const { state, dispatch } = useAddonContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleStatusToggle = async () => {
    const newStatus = state.status === "publish" ? "draft" : "publish";

    // 1. Optimistic Update local status
    dispatch({ type: "SET_STATUS", payload: newStatus });

    // 2. If editing an existing item, call the status update API directly
    if (isEdit && state.id) {
      dispatch({ type: "SET_SAVING", payload: true });
      try {
        await apiFetch({
          path: `smart-product-options-addons/v1/groups/${state.id}/status`,
          method: "PUT",
          data: {
            status: newStatus,
          },
        });
        addToast(
          newStatus === "publish"
            ? __("Option group published.", "smart-product-options-addons")
            : __("Option group moved to draft.", "smart-product-options-addons"),
          "success",
        );
      } catch (err: any) {
        addToast(
          err.message || __("Failed to update status.", "smart-product-options-addons"),
          "error",
        );
        // Revert local status if request fails
        dispatch({ type: "SET_STATUS", payload: state.status });
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    }
  };

  return (
    <div className="spoa-flex spoa-flex-col sm:spoa-flex-row spoa-justify-between spoa-items-start sm:spoa-items-center spoa-gap-4 spoa-mb-6 spoa-bg-white spoa-p-[15px_20px] spoa-rounded-lg spoa-shadow-sm">
      <Link
        to="/"
        className="button button-secondary !spoa-inline-flex spoa-items-center spoa-gap-1.5 spoa-no-underline"
      >
        <ArrowLeft size={14} className="spoa-w-3.5 spoa-h-3.5" />
        {__("Back to List", "smart-product-options-addons")}
      </Link>
      <div className="spoa-flex spoa-flex-wrap spoa-items-center spoa-gap-4">
        <div className="spoa-flex spoa-items-center spoa-gap-2">
          <span className="spoa-text-[13px] spoa-text-[#646970] spoa-mr-1">
            {__("Status:", "smart-product-options-addons")}
          </span>
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={state.isSaving}
            className={`spoa-relative spoa-inline-flex spoa-h-5 spoa-w-10 spoa-items-center spoa-rounded-full spoa-transition-colors focus:spoa-outline-none ${
              state.status === "publish"
                ? "spoa-bg-blue-600"
                : "spoa-bg-gray-400"
            } ${
              state.isSaving
                ? "spoa-opacity-50 spoa-cursor-not-allowed"
                : "spoa-cursor-pointer"
            }`}
            title={
              state.status === "publish"
                ? __("Published", "smart-product-options-addons")
                : __("Draft", "smart-product-options-addons")
            }
          >
            <span
              className={`spoa-inline-block spoa-h-3.5 spoa-w-3.5 spoa-transform spoa-rounded-full spoa-bg-white spoa-transition-transform ${
                state.status === "publish"
                  ? "spoa-translate-x-5"
                  : "spoa-translate-x-1"
              }`}
            />
          </button>
          <span
            className={`spoa-text-[13px] spoa-min-w-[45px] ${
              state.status === "publish"
                ? "spoa-text-[#1d2327]"
                : "spoa-text-[#646970]"
            }`}
          >
            {state.status === "publish"
              ? __("Published", "smart-product-options-addons")
              : __("Draft", "smart-product-options-addons")}
          </span>
        </div>
        <ClassicButton
          variant="primary"
          onClick={handleSave}
          disabled={state.isSaving}
        >
          {state.isSaving
            ? __("Saving…", "smart-product-options-addons")
            : isEdit
            ? __("Update Group", "smart-product-options-addons")
            : __("Create Group", "smart-product-options-addons")}
        </ClassicButton>
      </div>
    </div>
  );
};
