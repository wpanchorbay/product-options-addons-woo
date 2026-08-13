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

  // Normalize the incoming value: real pool ids may still be persisted as
  // strings from before inventory_id was cast to int on save, while
  // same-session, not-yet-saved pools use a "tmp_" string id — only the
  // former needs coercing so it compares correctly against ClassicSelect's
  // numeric option values.
  const normalizedValue =
    value === undefined || value === null || value === ""
      ? null
      : typeof value === "string" && value.startsWith("tmp_")
        ? value
        : Number(value);

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
      <div className="opopw-flex opopw-justify-between opopw-items-center opopw-w-full">
        <div className="opopw-flex opopw-flex-col opopw-py-0.5">
          <span className="opopw-font-semibold opopw-text-sm opopw-leading-tight">
            {opt.label}
          </span>
          <span
            className={`opopw-text-[11px] opopw-leading-tight ${
              isOutOfStock
                ? "opopw-text-red-500 opopw-font-medium"
                : "opopw-text-gray-400"
            }`}
          >
            {`${idLabel}${stockLabel}`}
          </span>
        </div>
        {isOutOfStock && (
          <span className="opopw-bg-red-50 opopw-text-red-600 opopw-text-[9px] opopw-font-bold opopw-px-1.5 opopw-py-0.5 opopw-rounded-full opopw-border opopw-border-red-100">
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
        value={normalizedValue}
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
            className="opopw-p-2 opopw-text-[#2271b1] hover:opopw-bg-[#f0f6fc] opopw-cursor-pointer opopw-text-sm opopw-font-medium opopw-flex opopw-items-center opopw-gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} />
            {__("Create New Pool", "optionbay-product-options-addons-woo")}
          </div>
        }
      />

      {isCreating && (
        <div
          className="opopw-fixed opopw-inset-0 opopw-bg-black/50 opopw-z-[9999999] opopw-flex opopw-items-center opopw-justify-center"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="opopw-bg-white opopw-p-5 opopw-rounded-lg opopw-shadow-xl opopw-w-[400px] opopw-max-w-[90vw] opopw-flex opopw-flex-col opopw-gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="opopw-m-0 opopw-text-sm opopw-font-semibold">
              {__("New Inventory Pool", "optionbay-product-options-addons-woo")}
            </h4>

            <div>
              <label
                htmlFor="opopw-new-inventory-name"
                className="opopw-text-xs opopw-font-medium opopw-mb-1 opopw-block"
              >
                {__("Pool Name", "optionbay-product-options-addons-woo")}
              </label>
              <ClassicInput
                id="opopw-new-inventory-name"
                size="regular"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={__("e.g. Premium Material", "optionbay-product-options-addons-woo")}
              />
            </div>

            <div className="opopw-flex opopw-gap-4">
              <div className="opopw-flex-1">
                <label
                  htmlFor="opopw-new-inventory-stock"
                  className="opopw-text-xs opopw-font-medium opopw-mb-1 opopw-block"
                >
                  {__("Initial Stock", "optionbay-product-options-addons-woo")}
                </label>
                <ClassicInput
                  id="opopw-new-inventory-stock"
                  type="number"
                  step="any"
                  size="small"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
              <div className="opopw-flex-1 opopw-pt-5">
                <ClassicCheckbox
                  label={__("Backorders?", "optionbay-product-options-addons-woo")}
                  checked={newBackorders}
                  onChange={setNewBackorders}
                />
              </div>
            </div>

            <div className="opopw-flex opopw-gap-2 opopw-justify-end opopw-mt-2">
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
