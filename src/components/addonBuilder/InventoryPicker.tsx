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
    const idLabel = isTmp ? __("[New]", "smart-product-options-addons") : `#${opt.value}`;

    const isOutOfStock =
      opt.stock_count !== undefined &&
      opt.stock_count <= 0 &&
      !opt.allow_backorders;

    const stockLabel =
      opt.stock_count !== undefined
        ? ` • ${formatStock(opt.stock_count)} ${__("in stock", "smart-product-options-addons")}`
        : "";

    return (
      <div className="spoa-flex spoa-justify-between spoa-items-center spoa-w-full">
        <div className="spoa-flex spoa-flex-col spoa-py-0.5">
          <span className="spoa-font-semibold spoa-text-sm spoa-leading-tight">
            {opt.label}
          </span>
          <span
            className={`spoa-text-[11px] spoa-leading-tight ${
              isOutOfStock
                ? "spoa-text-red-500 spoa-font-medium"
                : "spoa-text-gray-400"
            }`}
          >
            {`${idLabel}${stockLabel}`}
          </span>
        </div>
        {isOutOfStock && (
          <span className="spoa-bg-red-50 spoa-text-red-600 spoa-text-[9px] spoa-font-bold spoa-px-1.5 spoa-py-0.5 spoa-rounded-full spoa-border spoa-border-red-100">
            {__("OUT OF STOCK", "smart-product-options-addons")}
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
        endpoint="smart-product-options-addons/v1/inventory"
        enableSearch
        allowClear
        placeholder={__("Select inventory pool…", "smart-product-options-addons")}
        renderOption={renderInventoryOption as any}
        dropdownFooter={
          <div
            className="spoa-p-2 spoa-text-[#2271b1] hover:spoa-bg-[#f0f6fc] spoa-cursor-pointer spoa-text-sm spoa-font-medium spoa-flex spoa-items-center spoa-gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
            {__("Create New Pool", "smart-product-options-addons")}
          </div>
        }
      />

      {isCreating && (
        <div
          className="spoa-fixed spoa-inset-0 spoa-bg-black/50 spoa-z-[9999999] spoa-flex spoa-items-center spoa-justify-center"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="spoa-bg-white spoa-p-5 spoa-rounded-lg spoa-shadow-xl spoa-w-[400px] spoa-max-w-[90vw] spoa-flex spoa-flex-col spoa-gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="spoa-m-0 spoa-text-sm spoa-font-semibold">
              {__("New Inventory Pool", "smart-product-options-addons")}
            </h4>

            <div>
              <label
                htmlFor="ob-new-inventory-name"
                className="spoa-text-xs spoa-font-medium spoa-mb-1 spoa-block"
              >
                {__("Pool Name", "smart-product-options-addons")}
              </label>
              <ClassicInput
                id="ob-new-inventory-name"
                size="regular"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={__("e.g. Premium Material", "smart-product-options-addons")}
              />
            </div>

            <div className="spoa-flex spoa-gap-4">
              <div className="spoa-flex-1">
                <label
                  htmlFor="ob-new-inventory-stock"
                  className="spoa-text-xs spoa-font-medium spoa-mb-1 spoa-block"
                >
                  {__("Initial Stock", "smart-product-options-addons")}
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
              <div className="spoa-flex-1 spoa-pt-5">
                <ClassicCheckbox
                  label={__("Backorders?", "smart-product-options-addons")}
                  checked={newBackorders}
                  onChange={setNewBackorders}
                />
              </div>
            </div>

            <div className="spoa-flex spoa-gap-2 spoa-justify-end spoa-mt-2">
              <ClassicButton
                variant="secondary"
                onClick={() => setIsCreating(false)}
              >
                {__("Cancel", "smart-product-options-addons")}
              </ClassicButton>
              <ClassicButton
                variant="primary"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                {__("Add & Select", "smart-product-options-addons")}
              </ClassicButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
