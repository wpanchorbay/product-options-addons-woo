import React, { useState } from "react";
import { __ } from "@wordpress/i18n";
import { Plus } from "lucide-react";
import { useAddonContext, InventoryPool } from "../../store/AddonContext";
import {
  ClassicInput,
  ClassicButton,
  ClassicCheckbox,
  ClassicSelect,
} from "../classics";
import { SelectOption } from "../../utils/types";

interface InventoryPickerProps {
  value?: number | string;
  isError?: boolean;
  onChange: (value: number | string | undefined) => void;
}

export const InventoryPicker: React.FC<InventoryPickerProps> = ({
  value,
  isError,
  onChange,
}) => {
  const { state, dispatch } = useAddonContext();
  const [isCreating, setIsCreating] = useState(false);

  // New Inventory State
  const [newName, setNewName] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newBackorders, setNewBackorders] = useState(false);

  const handleCreate = () => {
    const tmpId = `tmp_${Math.random().toString(36).substr(2, 9)}`;
    const newPool: InventoryPool = {
      tmp_id: tmpId,
      name: newName,
      stock_count: parseFloat(newStock) || 0,
      allow_backorders: newBackorders,
    };

    dispatch({ type: "ADD_NEW_INVENTORY", payload: newPool });
    onChange(tmpId);
    setIsCreating(false);
    setNewName("");
    setNewStock("");
    setNewBackorders(false);
  };

  // Convert state.new_inventories to SelectOption format
  const localOptions: SelectOption[] = state.new_inventories.map((inv) => ({
    value: inv.tmp_id!,
    label: inv.name,
    // Store extra data for custom render
    stock_count: inv.stock_count,
    allow_backorders: inv.allow_backorders,
    is_new: true,
  }));

  const formatStock = (stock: any) => {
    const num = parseFloat(stock);
    if (isNaN(num)) {
      return stock;
    }
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const renderInventoryOption = (
    opt: SelectOption & {
      stock_count?: number;
      is_new?: boolean;
      allow_backorders?: boolean;
    },
  ) => {
    const isTmp = String(opt.value).startsWith("tmp_") || opt.is_new;
    const idLabel = isTmp ? __("[New]", "optionbay-product-options-addons-woo") : `#${opt.value}`;

    const isOutOfStock =
      opt.stock_count !== undefined &&
      opt.stock_count <= 0 &&
      !opt.allow_backorders;

    const stockLabel =
      opt.stock_count !== undefined
        ? ` • ${formatStock(opt.stock_count)} ${__("in stock", "optionbay-product-options-addons-woo")}`
        : "";

    return (
      <div className="wpab-wpoa-flex wpab-wpoa-justify-between wpab-wpoa-items-center wpab-wpoa-w-full">
        <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-py-0.5">
          <span className="wpab-wpoa-font-semibold wpab-wpoa-text-sm wpab-wpoa-leading-tight">
            {opt.label}
          </span>
          <span
            className={`wpab-wpoa-text-[11px] wpab-wpoa-leading-tight ${
              isOutOfStock
                ? "wpab-wpoa-text-red-500 wpab-wpoa-font-medium"
                : "wpab-wpoa-text-gray-400"
            }`}
          >
            {`${idLabel}${stockLabel}`}
          </span>
        </div>
        {isOutOfStock && (
          <span className="wpab-wpoa-bg-red-50 wpab-wpoa-text-red-600 wpab-wpoa-text-[9px] wpab-wpoa-font-bold wpab-wpoa-px-1.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-full wpab-wpoa-border wpab-wpoa-border-red-100">
            {__("OUT OF STOCK", "optionbay-product-options-addons-woo")}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <ClassicSelect
        size="regular"
        value={value || null}
        isError={isError}
        onChange={(val) => onChange(val)}
        options={localOptions}
        endpoint="optionbay-product-options-addons-woo/v1/inventory"
        enableSearch
        allowClear
        placeholder={__("Select inventory pool…", "optionbay-product-options-addons-woo")}
        renderOption={renderInventoryOption as any}
        dropdownFooter={
          <div
            className="wpab-wpoa-p-2 wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-bg-[#f0f6fc] wpab-wpoa-cursor-pointer wpab-wpoa-text-sm wpab-wpoa-font-medium wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
            {__("Create New Pool", "optionbay-product-options-addons-woo")}
          </div>
        }
      />

      {isCreating && (
        <div
          className="wpab-wpoa-fixed wpab-wpoa-inset-0 wpab-wpoa-bg-black/50 wpab-wpoa-z-[9999999] wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-center"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="wpab-wpoa-bg-white wpab-wpoa-p-5 wpab-wpoa-rounded-lg wpab-wpoa-shadow-xl wpab-wpoa-w-[400px] wpab-wpoa-max-w-[90vw] wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="wpab-wpoa-m-0 wpab-wpoa-text-sm wpab-wpoa-font-semibold">
              {__("New Inventory Pool", "optionbay-product-options-addons-woo")}
            </h4>

            <div>
              <label
                htmlFor="ob-new-inventory-name"
                className="wpab-wpoa-text-xs wpab-wpoa-font-medium wpab-wpoa-mb-1 wpab-wpoa-block"
              >
                {__("Pool Name", "optionbay-product-options-addons-woo")}
              </label>
              <ClassicInput
                id="ob-new-inventory-name"
                size="regular"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={__("e.g. Premium Material", "optionbay-product-options-addons-woo")}
              />
            </div>

            <div className="wpab-wpoa-flex wpab-wpoa-gap-4">
              <div className="wpab-wpoa-flex-1">
                <label
                  htmlFor="ob-new-inventory-stock"
                  className="wpab-wpoa-text-xs wpab-wpoa-font-medium wpab-wpoa-mb-1 wpab-wpoa-block"
                >
                  {__("Initial Stock", "optionbay-product-options-addons-woo")}
                </label>
                <ClassicInput
                  id="ob-new-inventory-stock"
                  type="number"
                  step="any"
                  size="small"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
              <div className="wpab-wpoa-flex-1 wpab-wpoa-pt-5">
                <ClassicCheckbox
                  label={__("Backorders?", "optionbay-product-options-addons-woo")}
                  checked={newBackorders}
                  onChange={setNewBackorders}
                />
              </div>
            </div>

            <div className="wpab-wpoa-flex wpab-wpoa-gap-2 wpab-wpoa-justify-end wpab-wpoa-mt-2">
              <ClassicButton
                variant="secondary"
                onClick={() => setIsCreating(false)}
              >
                {__("Cancel", "optionbay-product-options-addons-woo")}
              </ClassicButton>
              <ClassicButton
                variant="primary"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                {__("Add & Select", "optionbay-product-options-addons-woo")}
              </ClassicButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
