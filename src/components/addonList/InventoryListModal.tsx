import React, { useState, useEffect, useCallback } from "react";
import { __ } from "@wordpress/i18n";
import { RefreshCw, Search, Package, AlertCircle, Trash2 } from "lucide-react";
import apiFetch from "../../utils/apiFetch";
import CustomModal from "../common/CustomModal";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { ClassicButton, ClassicInput } from "../classics";

interface InventoryItem {
  id: number;
  name: string;
  stock_count: number;
  allow_backorders: boolean;
  date_modified: string;
}

interface InventoryListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryListModal: React.FC<InventoryListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{message: string, groups: {id: number, name: string}[]} | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/inventory/${deletingId}`,
        method: "DELETE",
      });
      setItems((prev) => prev.filter((i) => i.id !== deletingId));
      setDeletingId(null);
    } catch (err: any) {
      setDeletingId(null);
      if (err.code === "inventory_in_use" && err.data?.groups) {
        setDeleteError({
          message: err.message,
          groups: err.data.groups,
        });
      } else {
        console.error("Failed to delete inventory:", err);
        alert(__("Failed to delete inventory item.", "optionbay-product-options-addons-woo"));
      }
    }
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = (await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/inventory${query}`,
        method: "GET",
      })) as InventoryItem[];
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen, fetchInventory]);

  const handleUpdateStock = async (id: number) => {
    const newStock = parseFloat(editValue);
    if (isNaN(newStock)) {
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/inventory/${id}`,
        method: "PUT",
        data: { stock_count: newStock },
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, stock_count: newStock } : item,
        ),
      );
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update stock:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBackorders = async (item: InventoryItem) => {
    const newValue = !item.allow_backorders;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, allow_backorders: newValue } : i,
      ),
    );

    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/inventory/${item.id}`,
        method: "PUT",
        data: { allow_backorders: newValue },
      });
    } catch (err) {
      console.error("Failed to toggle backorders:", err);
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, allow_backorders: !newValue } : i,
        ),
      );
    }
  };

  const formatStock = ( stock: any ) => {
    const num = parseFloat( stock );
    if ( isNaN( num ) ) {
      return stock;
    }
    return num % 1 === 0 ? num.toString() : num.toFixed( 2 );
  };

  const filteredItems = items; // Already filtered by API in useEffect

  return (
    <>
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="opopw-flex opopw-items-center opopw-gap-2">
          <Package className="opopw-w-5 opopw-h-5 opopw-text-[#2271b1]" />
          <span>{__("Inventory Management", "optionbay-product-options-addons-woo")}</span>
        </div>
      }
      maxWidth="opopw-max-w-4xl"
      footer={
        <div className="opopw-flex opopw-justify-between opopw-w-full opopw-items-center">
          <p className="opopw-text-xs opopw-text-gray-500 opopw-m-0">
            {__("Total Pools:", "optionbay-product-options-addons-woo")} {items.length}
          </p>
          <ClassicButton variant="secondary" onClick={onClose}>
            {__("Close", "optionbay-product-options-addons-woo")}
          </ClassicButton>
        </div>
      }
    >
      <div className="opopw-flex opopw-flex-col opopw-gap-4">
        {/* Toolbar */}
        <div className="opopw-flex opopw-items-center opopw-justify-between opopw-gap-4">
          <div className="opopw-relative opopw-flex-1">
            <Search className="opopw-absolute opopw-left-3 opopw-top-1/2 opopw-translate-y-[-50%] opopw-w-4 opopw-h-4 opopw-text-gray-400" />
            <input
              type="text"
              className="opopw-w-full opopw-pl-9 opopw-pr-4 opopw-py-2 opopw-text-sm opopw-border opopw-border-gray-200 opopw-rounded-lg focus:opopw-outline-none focus:opopw-border-[#2271b1] focus:opopw-ring-1 focus:opopw-ring-[#2271b1]/20 opopw-transition-all"
              placeholder={__("Search inventory...", "optionbay-product-options-addons-woo")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ClassicButton
            variant="secondary"
            onClick={fetchInventory}
            disabled={loading}
            className="opopw-flex opopw-items-center opopw-gap-2"
          >
            <RefreshCw
              className={`opopw-w-4 opopw-h-4 ${
                loading ? "opopw-animate-spin" : ""
              }`}
            />
            {__("Refresh", "optionbay-product-options-addons-woo")}
          </ClassicButton>
        </div>

        {/* Table */}
        <div className="opopw-border opopw-border-gray-100 opopw-rounded-xl opopw-overflow-hidden">
          <table className="opopw-w-full opopw-text-left opopw-border-collapse">
            <thead className="opopw-bg-gray-50/50">
              <tr>
                <th className="opopw-px-4 opopw-py-3 opopw-text-xs opopw-font-semibold opopw-text-gray-500 opopw-uppercase opopw-tracking-wider">
                  {__("ID", "optionbay-product-options-addons-woo")}
                </th>
                <th className="opopw-px-4 opopw-py-3 opopw-text-xs opopw-font-semibold opopw-text-gray-500 opopw-uppercase opopw-tracking-wider">
                  {__("Name", "optionbay-product-options-addons-woo")}
                </th>
                <th className="opopw-px-4 opopw-py-3 opopw-text-xs opopw-font-semibold opopw-text-gray-500 opopw-uppercase opopw-tracking-wider">
                  {__("Stock Status", "optionbay-product-options-addons-woo")}
                </th>
                <th className="opopw-px-4 opopw-py-3 opopw-text-xs opopw-font-semibold opopw-text-gray-500 opopw-uppercase opopw-tracking-wider">
                  {__("Backorders", "optionbay-product-options-addons-woo")}
                </th>
                <th className="opopw-px-4 opopw-py-3 opopw-text-xs opopw-font-semibold opopw-text-gray-500 opopw-uppercase opopw-tracking-wider opopw-text-right">
                  {__("Action", "optionbay-product-options-addons-woo")}
                </th>
              </tr>
            </thead>
            <tbody className="opopw-divide-y opopw-divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="opopw-px-4 opopw-py-12 opopw-text-center"
                  >
                    <div className="opopw-flex opopw-flex-col opopw-items-center opopw-gap-3">
                      <RefreshCw className="opopw-w-8 opopw-h-8 opopw-text-gray-300 opopw-animate-spin" />
                      <span className="opopw-text-sm opopw-text-gray-400">
                        {__("Loading inventory data...", "optionbay-product-options-addons-woo")}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="opopw-px-4 opopw-py-12 opopw-text-center"
                  >
                    <div className="opopw-flex opopw-flex-col opopw-items-center opopw-gap-3">
                      <AlertCircle className="opopw-w-8 opopw-h-8 opopw-text-gray-200" />
                      <span className="opopw-text-sm opopw-text-gray-400">
                        {search
                          ? __("No matching inventory found.", "optionbay-product-options-addons-woo")
                          : __("No inventory pools created yet.", "optionbay-product-options-addons-woo")}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:opopw-bg-gray-50/50 opopw-transition-colors"
                  >
                    <td className="opopw-px-4 opopw-py-4 opopw-text-sm opopw-text-gray-400">
                      #{item.id}
                    </td>
                    <td className="opopw-px-4 opopw-py-4">
                      <span className="opopw-text-sm opopw-font-medium opopw-text-gray-900">
                        {item.name}
                      </span>
                    </td>
                    <td className="opopw-px-4 opopw-py-4">
                      {editingId === item.id ? (
                        <div className="opopw-flex opopw-items-center opopw-gap-2">
                          <input
                            autoFocus
                            type="number"
                            step={
                              parseFloat(item.stock_count.toString()) % 1 === 0 ? "1" : "0.01"
                            }
                            className="opopw-w-20 opopw-px-2 opopw-py-1 opopw-text-sm opopw-border opopw-border-[#2271b1] opopw-rounded focus:opopw-outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateStock(item.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <ClassicButton
                            onClick={() => handleUpdateStock(item.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? "..." : "✓"}
                          </ClassicButton>
                        </div>
                      ) : (
                        <div
                          className="opopw-flex opopw-items-center opopw-gap-2 opopw-group/stock opopw-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          <span
                            className={`opopw-text-sm opopw-font-semibold opopw-flex opopw-items-center opopw-gap-1.5 ${
                              item.stock_count <= 0
                                ? "opopw-text-red-600"
                                : item.stock_count < 10
                                  ? "opopw-text-orange-600"
                                  : "opopw-text-green-600"
                            }`}
                          >
                            {item.stock_count <= 0 && !item.allow_backorders && (
                              <AlertCircle className="opopw-w-3.5 opopw-h-3.5" />
                            )}
                            {formatStock(item.stock_count)}
                          </span>
                          <span className="opopw-text-[10px] opopw-text-[#2271b1] opopw-opacity-0 group-hover/stock:opopw-opacity-100 opopw-transition-opacity">
                            {__("Edit", "optionbay-product-options-addons-woo")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="opopw-px-4 opopw-py-4">
                      <span
                        onClick={() => handleToggleBackorders(item)}
                        className={`opopw-inline-flex opopw-items-center opopw-px-2.5 opopw-py-0.5 opopw-rounded-full opopw-text-xs opopw-font-medium opopw-cursor-pointer hover:opopw-opacity-80 opopw-transition-all ${
                          item.allow_backorders
                            ? "opopw-bg-blue-50 opopw-text-blue-700"
                            : "opopw-bg-gray-100 opopw-text-gray-600"
                        }`}
                        title={__("Click to toggle backorders", "optionbay-product-options-addons-woo")}
                      >
                        {item.allow_backorders
                          ? __("Allowed", "optionbay-product-options-addons-woo")
                          : __("Denied", "optionbay-product-options-addons-woo")}
                      </span>
                    </td>
                    <td className="opopw-px-4 opopw-py-4 opopw-text-right">
                      <div className="opopw-flex opopw-items-center opopw-justify-end opopw-gap-3">
                        <button
                          className="opopw-text-[#2271b1] hover:opopw-text-[#135e96] opopw-text-xs opopw-font-medium hover:opopw-underline opopw-bg-transparent opopw-border-none opopw-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          {__("Adjust Stock", "optionbay-product-options-addons-woo")}
                        </button>
                        <button
                          className="opopw-text-gray-400 hover:opopw-text-red-600 opopw-transition-colors opopw-bg-transparent opopw-border-none opopw-cursor-pointer"
                          onClick={() => setDeletingId(item.id)}
                          title={__("Delete Inventory", "optionbay-product-options-addons-woo")}
                        >
                          <Trash2 className="opopw-w-4 opopw-h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CustomModal>

      <ConfirmationModal
        isOpen={deletingId !== null}
        title={__("Delete Inventory", "optionbay-product-options-addons-woo")}
        message={__("Are you sure you want to delete this inventory item? This action cannot be undone.", "optionbay-product-options-addons-woo")}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmLabel={__("Delete", "optionbay-product-options-addons-woo")}
        classNames={{
          button: { confirmColor: "danger" }
        }}
      />

      {deleteError && (
        <CustomModal
          isOpen={true}
          onClose={() => setDeleteError(null)}
          title={
            <div className="opopw-text-red-600 opopw-font-semibold opopw-flex opopw-items-center opopw-gap-2">
              <AlertCircle className="opopw-w-5 opopw-h-5" />
              {__("Cannot Delete Inventory", "optionbay-product-options-addons-woo")}
            </div>
          }
          maxWidth="opopw-max-w-md"
          footer={
            <div className="opopw-flex opopw-justify-end opopw-w-full">
              <ClassicButton onClick={() => setDeleteError(null)}>
                {__("Close", "optionbay-product-options-addons-woo")}
              </ClassicButton>
            </div>
          }
        >
          <div className="opopw-p-2">
            <p className="opopw-mb-4 opopw-text-gray-700 opopw-text-sm leading-relaxed">
              {deleteError.message}
            </p>
            <div className="opopw-bg-red-50 opopw-p-4 opopw-rounded-lg opopw-border opopw-border-red-100">
              <h4 className="opopw-text-sm opopw-font-semibold opopw-text-red-800 opopw-mb-2">
                {__("Used by Option Groups:", "optionbay-product-options-addons-woo")}
              </h4>
              <ul className="opopw-list-disc opopw-list-inside opopw-text-sm opopw-text-red-700 opopw-flex opopw-flex-col opopw-gap-1">
                {deleteError.groups.map(g => (
                  <li key={g.id}>
                    <a href={`?post_type=product&page=opopw-options&action=edit&id=${g.id}`} target="_blank" rel="noreferrer" className="opopw-underline hover:opopw-text-red-900">
                      {g.name} (ID: {g.id})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CustomModal>
      )}
    </>
  );
};

export default InventoryListModal;
