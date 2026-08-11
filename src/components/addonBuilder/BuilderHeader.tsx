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
    <div className="opopw-flex opopw-flex-col sm:opopw-flex-row opopw-justify-between opopw-items-start sm:opopw-items-center opopw-gap-4 opopw-mb-6 opopw-bg-white opopw-p-[15px_20px] opopw-rounded-lg opopw-shadow-sm">
      <Link
        to="/"
        className="button button-secondary !opopw-inline-flex opopw-items-center opopw-gap-1.5 opopw-no-underline"
      >
        <ArrowLeft size={14} className="opopw-w-3.5 opopw-h-3.5" />
        {__("Back to List", "optionbay-product-options-addons-woo")}
      </Link>
      <div className="opopw-flex opopw-flex-wrap opopw-items-center opopw-gap-4">
        <div className="opopw-flex opopw-items-center opopw-gap-2">
          <span className="opopw-text-[13px] opopw-text-[#646970] opopw-mr-1">
            {__("Status:", "optionbay-product-options-addons-woo")}
          </span>
          <button
            type="button"
            onClick={handleStatusToggle}
            disabled={state.isSaving}
            className={`opopw-relative opopw-inline-flex opopw-h-5 opopw-w-10 opopw-items-center opopw-rounded-full opopw-transition-colors focus:opopw-outline-none ${
              state.status === "publish"
                ? "opopw-bg-blue-600"
                : "opopw-bg-gray-400"
            } ${
              state.isSaving
                ? "opopw-opacity-50 opopw-cursor-not-allowed"
                : "opopw-cursor-pointer"
            }`}
            title={
              state.status === "publish"
                ? __("Published", "optionbay-product-options-addons-woo")
                : __("Draft", "optionbay-product-options-addons-woo")
            }
          >
            <span
              className={`opopw-inline-block opopw-h-3.5 opopw-w-3.5 opopw-transform opopw-rounded-full opopw-bg-white opopw-transition-transform ${
                state.status === "publish"
                  ? "opopw-translate-x-5"
                  : "opopw-translate-x-1"
              }`}
            />
          </button>
          <span
            className={`opopw-text-[13px] opopw-min-w-[45px] ${
              state.status === "publish"
                ? "opopw-text-[#1d2327]"
                : "opopw-text-[#646970]"
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
