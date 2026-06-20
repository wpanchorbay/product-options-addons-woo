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
        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
          <Package className="wpab-wpoa-w-5 wpab-wpoa-h-5 wpab-wpoa-text-[#2271b1]" />
          <span>{__("Inventory Management", "optionbay-product-options-addons-woo")}</span>
        </div>
      }
      maxWidth="wpab-wpoa-max-w-4xl"
      footer={
        <div className="wpab-wpoa-flex wpab-wpoa-justify-between wpab-wpoa-w-full wpab-wpoa-items-center">
          <p className="wpab-wpoa-text-xs wpab-wpoa-text-gray-500 wpab-wpoa-m-0">
            {__("Total Pools:", "optionbay-product-options-addons-woo")} {items.length}
          </p>
          <ClassicButton variant="secondary" onClick={onClose}>
            {__("Close", "optionbay-product-options-addons-woo")}
          </ClassicButton>
        </div>
      }
    >
      <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-4">
        {/* Toolbar */}
        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-between wpab-wpoa-gap-4">
          <div className="wpab-wpoa-relative wpab-wpoa-flex-1">
            <Search className="wpab-wpoa-absolute wpab-wpoa-left-3 wpab-wpoa-top-1/2 wpab-wpoa-translate-y-[-50%] wpab-wpoa-w-4 wpab-wpoa-h-4 wpab-wpoa-text-gray-400" />
            <input
              type="text"
              className="wpab-wpoa-w-full wpab-wpoa-pl-9 wpab-wpoa-pr-4 wpab-wpoa-py-2 wpab-wpoa-text-sm wpab-wpoa-border wpab-wpoa-border-gray-200 wpab-wpoa-rounded-lg focus:wpab-wpoa-outline-none focus:wpab-wpoa-border-[#2271b1] focus:wpab-wpoa-ring-1 focus:wpab-wpoa-ring-[#2271b1]/20 wpab-wpoa-transition-all"
              placeholder={__("Search inventory...", "optionbay-product-options-addons-woo")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ClassicButton
            variant="secondary"
            onClick={fetchInventory}
            disabled={loading}
            className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2"
          >
            <RefreshCw
              className={`wpab-wpoa-w-4 wpab-wpoa-h-4 ${
                loading ? "wpab-wpoa-animate-spin" : ""
              }`}
            />
            {__("Refresh", "optionbay-product-options-addons-woo")}
          </ClassicButton>
        </div>

        {/* Table */}
        <div className="wpab-wpoa-border wpab-wpoa-border-gray-100 wpab-wpoa-rounded-xl wpab-wpoa-overflow-hidden">
          <table className="wpab-wpoa-w-full wpab-wpoa-text-left wpab-wpoa-border-collapse">
            <thead className="wpab-wpoa-bg-gray-50/50">
              <tr>
                <th className="wpab-wpoa-px-4 wpab-wpoa-py-3 wpab-wpoa-text-xs wpab-wpoa-font-semibold wpab-wpoa-text-gray-500 wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                  {__("ID", "optionbay-product-options-addons-woo")}
                </th>
                <th className="wpab-wpoa-px-4 wpab-wpoa-py-3 wpab-wpoa-text-xs wpab-wpoa-font-semibold wpab-wpoa-text-gray-500 wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                  {__("Name", "optionbay-product-options-addons-woo")}
                </th>
                <th className="wpab-wpoa-px-4 wpab-wpoa-py-3 wpab-wpoa-text-xs wpab-wpoa-font-semibold wpab-wpoa-text-gray-500 wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                  {__("Stock Status", "optionbay-product-options-addons-woo")}
                </th>
                <th className="wpab-wpoa-px-4 wpab-wpoa-py-3 wpab-wpoa-text-xs wpab-wpoa-font-semibold wpab-wpoa-text-gray-500 wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
                  {__("Backorders", "optionbay-product-options-addons-woo")}
                </th>
                <th className="wpab-wpoa-px-4 wpab-wpoa-py-3 wpab-wpoa-text-xs wpab-wpoa-font-semibold wpab-wpoa-text-gray-500 wpab-wpoa-uppercase wpab-wpoa-tracking-wider wpab-wpoa-text-right">
                  {__("Action", "optionbay-product-options-addons-woo")}
                </th>
              </tr>
            </thead>
            <tbody className="wpab-wpoa-divide-y wpab-wpoa-divide-gray-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="wpab-wpoa-px-4 wpab-wpoa-py-12 wpab-wpoa-text-center"
                  >
                    <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-items-center wpab-wpoa-gap-3">
                      <RefreshCw className="wpab-wpoa-w-8 wpab-wpoa-h-8 wpab-wpoa-text-gray-300 wpab-wpoa-animate-spin" />
                      <span className="wpab-wpoa-text-sm wpab-wpoa-text-gray-400">
                        {__("Loading inventory data...", "optionbay-product-options-addons-woo")}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="wpab-wpoa-px-4 wpab-wpoa-py-12 wpab-wpoa-text-center"
                  >
                    <div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-items-center wpab-wpoa-gap-3">
                      <AlertCircle className="wpab-wpoa-w-8 wpab-wpoa-h-8 wpab-wpoa-text-gray-200" />
                      <span className="wpab-wpoa-text-sm wpab-wpoa-text-gray-400">
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
                    className="hover:wpab-wpoa-bg-gray-50/50 wpab-wpoa-transition-colors"
                  >
                    <td className="wpab-wpoa-px-4 wpab-wpoa-py-4 wpab-wpoa-text-sm wpab-wpoa-text-gray-400">
                      #{item.id}
                    </td>
                    <td className="wpab-wpoa-px-4 wpab-wpoa-py-4">
                      <span className="wpab-wpoa-text-sm wpab-wpoa-font-medium wpab-wpoa-text-gray-900">
                        {item.name}
                      </span>
                    </td>
                    <td className="wpab-wpoa-px-4 wpab-wpoa-py-4">
                      {editingId === item.id ? (
                        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
                          <input
                            autoFocus
                            type="number"
                            step={
                              parseFloat(item.stock_count.toString()) % 1 === 0 ? "1" : "0.01"
                            }
                            className="wpab-wpoa-w-20 wpab-wpoa-px-2 wpab-wpoa-py-1 wpab-wpoa-text-sm wpab-wpoa-border wpab-wpoa-border-[#2271b1] wpab-wpoa-rounded focus:wpab-wpoa-outline-none"
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
                          className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-group/stock wpab-wpoa-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          <span
                            className={`wpab-wpoa-text-sm wpab-wpoa-font-semibold wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 ${
                              item.stock_count <= 0
                                ? "wpab-wpoa-text-red-600"
                                : item.stock_count < 10
                                  ? "wpab-wpoa-text-orange-600"
                                  : "wpab-wpoa-text-green-600"
                            }`}
                          >
                            {item.stock_count <= 0 && !item.allow_backorders && (
                              <AlertCircle className="wpab-wpoa-w-3.5 wpab-wpoa-h-3.5" />
                            )}
                            {formatStock(item.stock_count)}
                          </span>
                          <span className="wpab-wpoa-text-[10px] wpab-wpoa-text-[#2271b1] wpab-wpoa-opacity-0 group-hover/stock:wpab-wpoa-opacity-100 wpab-wpoa-transition-opacity">
                            {__("Edit", "optionbay-product-options-addons-woo")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="wpab-wpoa-px-4 wpab-wpoa-py-4">
                      <span
                        onClick={() => handleToggleBackorders(item)}
                        className={`wpab-wpoa-inline-flex wpab-wpoa-items-center wpab-wpoa-px-2.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded-full wpab-wpoa-text-xs wpab-wpoa-font-medium wpab-wpoa-cursor-pointer hover:wpab-wpoa-opacity-80 wpab-wpoa-transition-all ${
                          item.allow_backorders
                            ? "wpab-wpoa-bg-blue-50 wpab-wpoa-text-blue-700"
                            : "wpab-wpoa-bg-gray-100 wpab-wpoa-text-gray-600"
                        }`}
                        title={__("Click to toggle backorders", "optionbay-product-options-addons-woo")}
                      >
                        {item.allow_backorders
                          ? __("Allowed", "optionbay-product-options-addons-woo")
                          : __("Denied", "optionbay-product-options-addons-woo")}
                      </span>
                    </td>
                    <td className="wpab-wpoa-px-4 wpab-wpoa-py-4 wpab-wpoa-text-right">
                      <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-end wpab-wpoa-gap-3">
                        <button
                          className="wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-text-[#135e96] wpab-wpoa-text-xs wpab-wpoa-font-medium hover:wpab-wpoa-underline wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.stock_count.toString());
                          }}
                        >
                          {__("Adjust Stock", "optionbay-product-options-addons-woo")}
                        </button>
                        <button
                          className="wpab-wpoa-text-gray-400 hover:wpab-wpoa-text-red-600 wpab-wpoa-transition-colors wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer"
                          onClick={() => setDeletingId(item.id)}
                          title={__("Delete Inventory", "optionbay-product-options-addons-woo")}
                        >
                          <Trash2 className="wpab-wpoa-w-4 wpab-wpoa-h-4" />
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
            <div className="wpab-wpoa-text-red-600 wpab-wpoa-font-semibold wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
              <AlertCircle className="wpab-wpoa-w-5 wpab-wpoa-h-5" />
              {__("Cannot Delete Inventory", "optionbay-product-options-addons-woo")}
            </div>
          }
          maxWidth="wpab-wpoa-max-w-md"
          footer={
            <div className="wpab-wpoa-flex wpab-wpoa-justify-end wpab-wpoa-w-full">
              <ClassicButton onClick={() => setDeleteError(null)}>
                {__("Close", "optionbay-product-options-addons-woo")}
              </ClassicButton>
            </div>
          }
        >
          <div className="wpab-wpoa-p-2">
            <p className="wpab-wpoa-mb-4 wpab-wpoa-text-gray-700 wpab-wpoa-text-sm leading-relaxed">
              {deleteError.message}
            </p>
            <div className="wpab-wpoa-bg-red-50 wpab-wpoa-p-4 wpab-wpoa-rounded-lg wpab-wpoa-border wpab-wpoa-border-red-100">
              <h4 className="wpab-wpoa-text-sm wpab-wpoa-font-semibold wpab-wpoa-text-red-800 wpab-wpoa-mb-2">
                {__("Used by Option Groups:", "optionbay-product-options-addons-woo")}
              </h4>
              <ul className="wpab-wpoa-list-disc wpab-wpoa-list-inside wpab-wpoa-text-sm wpab-wpoa-text-red-700 wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1">
                {deleteError.groups.map(g => (
                  <li key={g.id}>
                    <a href={`?post_type=product&page=wpab-wpoa-options&action=edit&id=${g.id}`} target="_blank" rel="noreferrer" className="wpab-wpoa-underline hover:wpab-wpoa-text-red-900">
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
