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
        path: `smart-product-options-addons/v1/inventory/${deletingId}`,
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
        alert(__("Failed to delete inventory item.", "smart-product-options-addons"));
      }
    }
  };

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = (await apiFetch({
        path: `smart-product-options-addons/v1/inventory${query}`,
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
        path: `smart-product-options-addons/v1/inventory/${id}`,
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
        path: `smart-product-options-addons/v1/inventory/${item.id}`,
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
        <div className="spoa-flex spoa-items-center spoa-gap-2">
          <Package className="spoa-w-5 spoa-h-5 spoa-text-[#2271b1]" />
          <span>{__("Inventory Management", "smart-product-options-addons")}</span>
        </div>
      }
      maxWidth="spoa-max-w-4xl"
      footer={
        <div className="spoa-flex spoa-justify-between spoa-w-full spoa-items-center">
          <p className="spoa-text-xs spoa-text-gray-500 spoa-m-0">
            {__("Total Pools:", "smart-product-options-addons")} {items.length}
          </p>
          <ClassicButton variant="secondary" onClick={onClose}>
            {__("Close", "smart-product-options-addons")}
          </ClassicButton>
        </div>
      }
    >
      <div className="spoa-flex spoa-flex-col spoa-gap-4">
        {/* Toolbar */}
        <div className="spoa-flex spoa-items-center spoa-justify-between spoa-gap-4">
          <div className="spoa-relative spoa-flex-1">
            <Search className="spoa-absolute spoa-left-3 spoa-top-1/2 spoa-translate-y-[-50%] spoa-w-4 spoa-h-4 spoa-text-gray-400" />
            <input
              type="text"
              className="spoa-w-full spoa-pl-9 spoa-pr-4 spoa-py-2 spoa-text-sm spoa-border spoa-border-gray-200 spoa-rounded-lg focus:spoa-outline-none focus:spoa-border-[#2271b1] focus:spoa-ring-1 focus:spoa-ring-[#2271b1]/20 spoa-transition-all"
              placeholder={__("Search inventory...", "smart-product-options-addons")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ClassicButton
            variant="secondary"
            onClick={fetchInventory}
            disabled={loading}
            className="spoa-flex spoa-items-center spoa-gap-2"
          >
            <RefreshCw
              className={`spoa-w-4 spoa-h-4 ${
                loading ? "spoa-animate-spin" : ""
              }`}
            />
            {__("Refresh", "smart-product-options-addons")}
          </ClassicButton>
        </div>

        {/* Table */}
        <div className="spoa-border spoa-border-gray-100 spoa-rounded-xl spoa-overflow-hidden">
          <table className="spoa-w-full spoa-text-left spoa-border-collapse">
            <thead className="spoa-bg-gray-50/50">
              <tr>
                <th className="spoa-px-4 spoa-py-3 spoa-text-xs spoa-font-semibold spoa-text-gray-500 spoa-uppercase spoa-tracking-wider">
                  {__("ID", "smart-product-options-addons")}
                </th>
                <th className="spoa-px-4 spoa-py-3 spoa-text-xs spoa-font-semibold spoa-text-gray-500 spoa-uppercase spoa-tracking-wider">
                  {__("Name", "smart-product-options-addons")}
                </th>
                <th className="spoa-px-4 spoa-py-3 spoa-text-xs spoa-font-semibold spoa-text-gray-500 spoa-uppercase spoa-tracking-wider">
                  {__("Stock Status", "smart-product-options-addons")}
                </th>
                <th className="spoa-px-4 spoa-py-3 spoa-text-xs spoa-font-semibold spoa-text-gray-500 spoa-uppercase spoa-tracking-wider">
                  {__("Backorders", "smart-product-options-addons")}
                </th>
                <th className="spoa-px-4 spoa-py-3 spoa-text-xs spoa-font-semibold spoa-text-gray-500 spoa-uppercase spoa-tracking-wider spoa-text-right">
                  {__("Action", "smart-product-options-addons")}
                </th>
              </tr>
            </thead>
            <tbody className="spoa-divide-y spoa-divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="spoa-px-4 spoa-py-12 spoa-text-center"
                  >
                    <div className="spoa-flex spoa-flex-col spoa-items-center spoa-gap-3">
                      <RefreshCw className="spoa-w-8 spoa-h-8 spoa-text-gray-300 spoa-animate-spin" />
                      <span className="spoa-text-sm spoa-text-gray-400">
                        {__("Loading inventory data...", "smart-product-options-addons")}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="spoa-px-4 spoa-py-12 spoa-text-center"
                  >
                    <div className="spoa-flex spoa-flex-col spoa-items-center spoa-gap-3">
                      <AlertCircle className="spoa-w-8 spoa-h-8 spoa-text-gray-200" />
                      <span className="spoa-text-sm spoa-text-gray-400">
                        {search
                          ? __("No matching inventory found.", "smart-product-options-addons")
                          : __("No inventory pools created yet.", "smart-product-options-addons")}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:spoa-bg-gray-50/50 spoa-transition-colors"
                  >
                    <td className="spoa-px-4 spoa-py-4 spoa-text-sm spoa-text-gray-400">
                      #{item.id}
                    </td>
                    <td className="spoa-px-4 spoa-py-4">
                      <span className="spoa-text-sm spoa-font-medium spoa-text-gray-900">
                        {item.name}
                      </span>
                    </td>
                    <td className="spoa-px-4 spoa-py-4">
                      {editingId === item.id ? (
                        <div className="spoa-flex spoa-items-center spoa-gap-2">
                          <input
                            autoFocus
                            type="number"
                            step={
                              parseFloat(item.stock_count.toString()) % 1 === 0 ? "1" : "0.01"
                            }
                            className="spoa-w-20 spoa-px-2 spoa-py-1 spoa-text-sm spoa-border spoa-border-[#2271b1] spoa-rounded focus:spoa-outline-none"
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
                          className="spoa-flex spoa-items-center spoa-gap-2 spoa-group/stock spoa-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          <span
                            className={`spoa-text-sm spoa-font-semibold spoa-flex spoa-items-center spoa-gap-1.5 ${
                              item.stock_count <= 0
                                ? "spoa-text-red-600"
                                : item.stock_count < 10
                                  ? "spoa-text-orange-600"
                                  : "spoa-text-green-600"
                            }`}
                          >
                            {item.stock_count <= 0 && !item.allow_backorders && (
                              <AlertCircle className="spoa-w-3.5 spoa-h-3.5" />
                            )}
                            {formatStock(item.stock_count)}
                          </span>
                          <span className="spoa-text-[10px] spoa-text-[#2271b1] spoa-opacity-0 group-hover/stock:spoa-opacity-100 spoa-transition-opacity">
                            {__("Edit", "smart-product-options-addons")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="spoa-px-4 spoa-py-4">
                      <span
                        onClick={() => handleToggleBackorders(item)}
                        className={`spoa-inline-flex spoa-items-center spoa-px-2.5 spoa-py-0.5 spoa-rounded-full spoa-text-xs spoa-font-medium spoa-cursor-pointer hover:spoa-opacity-80 spoa-transition-all ${
                          item.allow_backorders
                            ? "spoa-bg-blue-50 spoa-text-blue-700"
                            : "spoa-bg-gray-100 spoa-text-gray-600"
                        }`}
                        title={__("Click to toggle backorders", "smart-product-options-addons")}
                      >
                        {item.allow_backorders
                          ? __("Allowed", "smart-product-options-addons")
                          : __("Denied", "smart-product-options-addons")}
                      </span>
                    </td>
                    <td className="spoa-px-4 spoa-py-4 spoa-text-right">
                      <div className="spoa-flex spoa-items-center spoa-justify-end spoa-gap-3">
                        <button
                          className="spoa-text-[#2271b1] hover:spoa-text-[#135e96] spoa-text-xs spoa-font-medium hover:spoa-underline spoa-bg-transparent spoa-border-none spoa-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          {__("Adjust Stock", "smart-product-options-addons")}
                        </button>
                        <button
                          className="spoa-text-gray-400 hover:spoa-text-red-600 spoa-transition-colors spoa-bg-transparent spoa-border-none spoa-cursor-pointer"
                          onClick={() => setDeletingId(item.id)}
                          title={__("Delete Inventory", "smart-product-options-addons")}
                        >
                          <Trash2 className="spoa-w-4 spoa-h-4" />
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
        title={__("Delete Inventory", "smart-product-options-addons")}
        message={__("Are you sure you want to delete this inventory item? This action cannot be undone.", "smart-product-options-addons")}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        confirmLabel={__("Delete", "smart-product-options-addons")}
        classNames={{
          button: { confirmColor: "danger" }
        }}
      />

      {deleteError && (
        <CustomModal
          isOpen={true}
          onClose={() => setDeleteError(null)}
          title={
            <div className="spoa-text-red-600 spoa-font-semibold spoa-flex spoa-items-center spoa-gap-2">
              <AlertCircle className="spoa-w-5 spoa-h-5" />
              {__("Cannot Delete Inventory", "smart-product-options-addons")}
            </div>
          }
          maxWidth="spoa-max-w-md"
          footer={
            <div className="spoa-flex spoa-justify-end spoa-w-full">
              <ClassicButton onClick={() => setDeleteError(null)}>
                {__("Close", "smart-product-options-addons")}
              </ClassicButton>
            </div>
          }
        >
          <div className="spoa-p-2">
            <p className="spoa-mb-4 spoa-text-gray-700 spoa-text-sm leading-relaxed">
              {deleteError.message}
            </p>
            <div className="spoa-bg-red-50 spoa-p-4 spoa-rounded-lg spoa-border spoa-border-red-100">
              <h4 className="spoa-text-sm spoa-font-semibold spoa-text-red-800 spoa-mb-2">
                {__("Used by Option Groups:", "smart-product-options-addons")}
              </h4>
              <ul className="spoa-list-disc spoa-list-inside spoa-text-sm spoa-text-red-700 spoa-flex spoa-flex-col spoa-gap-1">
                {deleteError.groups.map(g => (
                  <li key={g.id}>
                    <a href={`?post_type=product&page=spoa-options&action=edit&id=${g.id}`} target="_blank" rel="noreferrer" className="spoa-underline hover:spoa-text-red-900">
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
