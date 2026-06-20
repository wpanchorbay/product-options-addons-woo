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
          path: `optionbay-product-options-addons-woo/v1/groups/${state.id}/status`,
          method: "PUT",
          data: {
            status: newStatus,
          },
        });
        addToast(
          newStatus === "publish"
            ? __("Option group published.", "optionbay-product-options-addons-woo")
            : __("Option group moved to draft.", "optionbay-product-options-addons-woo"),
          "success",
        );
      } catch (err: any) {
        addToast(
          err.message || __("Failed to update status.", "optionbay-product-options-addons-woo"),
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
    <div className="wpab-wpoa-flex wpab-wpoa-flex-col sm:wpab-wpoa-flex-row wpab-wpoa-justify-between wpab-wpoa-items-start sm:wpab-wpoa-items-center wpab-wpoa-gap-4 wpab-wpoa-mb-6 wpab-wpoa-bg-white wpab-wpoa-p-[15px_20px] wpab-wpoa-rounded-lg wpab-wpoa-shadow-sm">
      <Link
        to="/"
        className="button button-secondary !wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-no-underline"
      >
        <ArrowLeft size={14} className="wpab-wpoa-w-3.5 wpab-wpoa-h-3.5" />
        {__("Back to List", "optionbay-product-options-addons-woo")}
      </Link>
      <div className="wpab-wpoa-flex wpab-wpoa-flex-wrap wpab-wpoa-items-center wpab-wpoa-gap-4">
        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
          <span className="wpab-wpoa-text-[13px] wpab-wpoa-text-[#646970] wpab-wpoa-mr-1">
            {__("Status:", "optionbay-product-options-addons-woo")}
          </span>
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={state.isSaving}
            className={`wpab-wpoa-relative wpab-wpoa-inline-flex wpab-wpoa-h-5 wpab-wpoa-w-10 wpab-wpoa-items-center wpab-wpoa-rounded-full wpab-wpoa-transition-colors focus:wpab-wpoa-outline-none ${
              state.status === "publish"
                ? "wpab-wpoa-bg-blue-600"
                : "wpab-wpoa-bg-gray-400"
            } ${
              state.isSaving
                ? "wpab-wpoa-opacity-50 wpab-wpoa-cursor-not-allowed"
                : "wpab-wpoa-cursor-pointer"
            }`}
            title={
              state.status === "publish"
                ? __("Published", "optionbay-product-options-addons-woo")
                : __("Draft", "optionbay-product-options-addons-woo")
            }
          >
            <span
              className={`wpab-wpoa-inline-block wpab-wpoa-h-3.5 wpab-wpoa-w-3.5 wpab-wpoa-transform wpab-wpoa-rounded-full wpab-wpoa-bg-white wpab-wpoa-transition-transform ${
                state.status === "publish"
                  ? "wpab-wpoa-translate-x-5"
                  : "wpab-wpoa-translate-x-1"
              }`}
            />
          </button>
          <span
            className={`wpab-wpoa-text-[13px] wpab-wpoa-min-w-[45px] ${
              state.status === "publish"
                ? "wpab-wpoa-text-[#1d2327]"
                : "wpab-wpoa-text-[#646970]"
            }`}
          >
            {state.status === "publish"
              ? __("Published", "optionbay-product-options-addons-woo")
              : __("Draft", "optionbay-product-options-addons-woo")}
          </span>
        </div>
        <ClassicButton
          variant="primary"
          onClick={handleSave}
          disabled={state.isSaving}
        >
          {state.isSaving
            ? __("Saving…", "optionbay-product-options-addons-woo")
            : isEdit
            ? __("Update Group", "optionbay-product-options-addons-woo")
            : __("Create Group", "optionbay-product-options-addons-woo")}
        </ClassicButton>
      </div>
    </div>
  );
};
