import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { __, sprintf } from "@wordpress/i18n";
import {
  ClassicButton,
  ClassicCheckbox,
  ClassicToggle,
} from "../components/classics";
import { useWpabStore } from "../store/wpabStore";
import apiFetch from "../utils/apiFetch";
import { SkeletonAddonList } from "../components/loading/SkeletonAddonList";
import { TopProgressBar } from "../components/loading/TopProgressBar";
import { useToast } from "../store/toast/use-toast";
import { Switch } from "../components/common/Switch";
import { Popover } from "../components/common/Popover";
import { Checkbox } from "../components/common/Checkbox";
import { ConfirmationModal } from "../components/common/ConfirmationModal";
import InventoryListModal from "../components/addonList/InventoryListModal";
import { Package } from "lucide-react";
import { ExportCard } from "../components/settings/ExportCard";
import { ImportCard } from "../components/settings/ImportCard";

interface GroupListItem {
  id: number;
  title: string;
  status: string;
  field_count: number;
  settings: {
    active: boolean;
  };
  assignments: Array<{
    target_type: string;
    target_id: number;
    is_exclusion: boolean;
  }>;
  author_name: string;
  modified_by_name: string;
  date_created: string;
  date_modified: string;
}

interface ListResponse {
  items: GroupListItem[];
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  counts: {
    all: number;
    publish: number;
    draft: number;
    trash: number;
  };
}

export default function AddonList() {
  const navigate = useNavigate();
  const store = useWpabStore();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("any");
  const [counts, setCounts] = useState({
    all: 0,
    publish: 0,
    draft: 0,
    trash: 0,
  });

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParam, setSearchParam] = useState("");

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "fields",
    "assigned",
    "status",
  ]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId],
    );
  };

  // Bulk Actions State
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [isActioning, setIsActioning] = useState(false);
  const { addToast } = useToast();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmColor?: "primary" | "secondary" | "danger";
    autoFocus?: "confirm" | "cancel";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/groups?page=${page}&per_page=20&status=${statusFilter}&search=${encodeURIComponent(searchParam)}`,
        method: "GET",
      })) as ListResponse;
      setGroups(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      setCounts(data.counts);
    } catch (err) {
      console.error("Failed to fetch option groups:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchParam]);

  useEffect(() => {
    fetchGroups();
    // Clear selection when page changes
    setSelectedGroups([]);
  }, [fetchGroups, statusFilter, searchParam]);

  const handleSearch = () => {
    setPage(1);
    setSearchParam(searchQuery);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(groups.map((g) => g.id));
    } else {
      setSelectedGroups([]);
    }
  };

  const toggleSelectGroup = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedGroups((prev) => [...prev, id]);
    } else {
      setSelectedGroups((prev) => prev.filter((groupId) => groupId !== id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedGroups.length === 0) {
      return;
    }

    const actionText =
      bulkAction === "delete"
        ? statusFilter === "trash"
          ? __("permanently delete", "optionbay-product-options-addons-woo")
          : __("move to trash", "optionbay-product-options-addons-woo")
        : bulkAction === "restore"
        ? __("restore", "optionbay-product-options-addons-woo")
        : bulkAction === "activate"
        ? __("publish", "optionbay-product-options-addons-woo")
        : __("draft", "optionbay-product-options-addons-woo");

    setConfirmModal({
      isOpen: true,
      title: __("Confirm Action", "optionbay-product-options-addons-woo"),
      message: sprintf(
        __("Are you sure you want to %s %d selected items?", "optionbay-product-options-addons-woo"),
        actionText,
        selectedGroups.length,
      ),
      confirmColor: bulkAction === "delete" ? "danger" : "primary",
      autoFocus: bulkAction === "delete" ? "cancel" : "confirm",
      onConfirm: async () => {
        closeConfirmModal();
        setIsActioning(true);
        try {
          await apiFetch({
            path: `optionbay-product-options-addons-woo/v1/groups/bulk`,
            method: "POST",
            data: {
              action: bulkAction,
              ids: selectedGroups,
            },
          });
          setSelectedGroups([]);
          setBulkAction("");
          addToast(
            __("Bulk action applied successfully.", "optionbay-product-options-addons-woo"),
            "success",
          );
          fetchGroups();
        } catch (err: any) {
          addToast(
            err.message || __("Failed to execute bulk action.", "optionbay-product-options-addons-woo"),
            "error",
          );
        } finally {
          setIsActioning(false);
        }
      },
    });
  };

  const handleDelete = async (id: number) => {
    const isTrash = statusFilter === "trash";
    setConfirmModal({
      isOpen: true,
      title: isTrash
        ? __("Permanently Delete", "optionbay-product-options-addons-woo")
        : __("Move to Trash", "optionbay-product-options-addons-woo"),
      message: isTrash
        ? __(
            "Are you sure you want to permanently delete this option group? This action cannot be undone.",
            "optionbay-product-options-addons-woo",
          )
        : __(
            "Are you sure you want to move this option group to trash?",
            "optionbay-product-options-addons-woo",
          ),
      confirmColor: "danger",
      autoFocus: "cancel",
      onConfirm: async () => {
        closeConfirmModal();
        setIsActioning(true);
        try {
          await apiFetch({
            path: `optionbay-product-options-addons-woo/v1/groups/${id}`,
            method: "DELETE",
          });
          addToast(
            isTrash
              ? __("Option group permanently deleted.", "optionbay-product-options-addons-woo")
              : __("Option group moved to trash.", "optionbay-product-options-addons-woo"),
            "success",
          );
          fetchGroups();
        } catch (err: any) {
          addToast(
            err.message || __("Failed to delete group.", "optionbay-product-options-addons-woo"),
            "error",
          );
        } finally {
          setIsActioning(false);
        }
      },
    });
  };

  const handleDuplicate = async (id: number) => {
    setIsActioning(true);
    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/groups/${id}/duplicate`,
        method: "POST",
      });
      addToast(__("Option group duplicated.", "optionbay-product-options-addons-woo"), "success");
      fetchGroups();
    } catch (err: any) {
      addToast(
        err.message || __("Failed to duplicate group.", "optionbay-product-options-addons-woo"),
        "error",
      );
    } finally {
      setIsActioning(false);
    }
  };

  const handleRestore = async (id: number) => {
    setIsActioning(true);
    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/groups/bulk`,
        method: "POST",
        data: {
          action: "restore",
          ids: [id],
        },
      });
      addToast(__("Option group restored.", "optionbay-product-options-addons-woo"), "success");
      fetchGroups();
    } catch (err: any) {
      addToast(
        err.message || __("Failed to restore group.", "optionbay-product-options-addons-woo"),
        "error",
      );
    } finally {
      setIsActioning(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "publish" ? "draft" : "publish";
    setIsActioning(true);
    try {
      await apiFetch({
        path: `optionbay-product-options-addons-woo/v1/groups/${id}/status`,
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
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status: newStatus } : g)),
      );
    } catch (err: any) {
      addToast(
        err.message || __("Failed to update status.", "optionbay-product-options-addons-woo"),
        "error",
      );
    } finally {
      setIsActioning(false);
    }
  };

  const getAssignmentSummary = (assignments: GroupListItem["assignments"]) => {
    if (!assignments || assignments.length === 0) {
      return __("None", "optionbay-product-options-addons-woo");
    }

    const hasGlobal = assignments.some((a) => a.target_type === "global");
    if (hasGlobal) {
      return __("All Products", "optionbay-product-options-addons-woo");
    }

    const cats = assignments.filter(
      (a) => a.target_type === "category" && !a.is_exclusion,
    ).length;
    const products = assignments.filter(
      (a) => a.target_type === "product" && !a.is_exclusion,
    ).length;
    const parts: string[] = [];
    if (cats > 0) {
      parts.push(`${cats} ${__("categories", "optionbay-product-options-addons-woo")}`);
    }
    if (products > 0) {
      parts.push(`${products} ${__("products", "optionbay-product-options-addons-woo")}`);
    }
    return parts.join(", ") || __("None", "optionbay-product-options-addons-woo");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "-";
    }
    const date = new Date(dateString.replace(" ", "T")); // Quick fix for WP date format to ISO
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderBulkActions = (position: "top" | "bottom") => (
    <div
      className={`alignleft actions bulkactions wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 ${
        position === "bottom"
          ? "wpab-wpoa-mt-4"
          : "wpab-wpoa-mt-4 sm:wpab-wpoa-mt-0"
      }`}
    >
      <select
        value={position === "bottom" ? "" : bulkAction} // Only bind value to top to prevent double selection issues
        onChange={(e) => setBulkAction(e.target.value)}
        className="wpab-wpoa-h-[30px]"
        disabled={isActioning}
      >
        <option value="">{__("Bulk actions", "optionbay-product-options-addons-woo")}</option>
        {statusFilter === "trash" ? (
          <>
            <option value="restore">{__("Restore", "optionbay-product-options-addons-woo")}</option>
            <option value="delete">
              {__("Delete Permanently", "optionbay-product-options-addons-woo")}
            </option>
          </>
        ) : (
          <>
            <option value="activate">{__("Publish", "optionbay-product-options-addons-woo")}</option>
            <option value="draft">{__("Draft", "optionbay-product-options-addons-woo")}</option>
            <option value="delete">{__("Move to Trash", "optionbay-product-options-addons-woo")}</option>
          </>
        )}
      </select>
      <ClassicButton
        variant="secondary"
        onClick={handleBulkAction}
        disabled={!bulkAction || selectedGroups.length === 0 || isActioning}
      >
        {__("Apply", "optionbay-product-options-addons-woo")}
      </ClassicButton>
      {selectedGroups.length > 0 && (
        <span className="wpab-wpoa-text-sm wpab-wpoa-text-gray-500">
          {sprintf(
            __("%1$d of %2$d selected", "optionbay-product-options-addons-woo"),
            selectedGroups.length,
            total,
          )}
        </span>
      )}
    </div>
  );

  const renderPagination = (position: "top" | "bottom") => {
    return (
      <div
        className={`tablenav-pages wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 ${
          position === "bottom" ? "wpab-wpoa-mt-4" : ""
        }`}
      >
        <span className="displaying-num wpab-wpoa-text-[13px] wpab-wpoa-mr-2">
          {total} {__("items", "optionbay-product-options-addons-woo")}
        </span>
        <ClassicButton
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          {__("← Previous", "optionbay-product-options-addons-woo")}
        </ClassicButton>
        <span className="wpab-wpoa-leading-[30px] wpab-wpoa-px-2">
          {__("Page", "optionbay-product-options-addons-woo")} {page} {__("of", "optionbay-product-options-addons-woo")} {totalPages}
        </span>
        <ClassicButton
          variant="secondary"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          {__("Next →", "optionbay-product-options-addons-woo")}
        </ClassicButton>

        <div className="wpab-wpoa-ml-2">
          <Popover
            align="bottom-right"
            trigger={
              <div className="wpab-wpoa-p-1 wpab-wpoa-rounded hover:wpab-wpoa-bg-gray-100 wpab-wpoa-text-gray-500">
                <svg
                  className="wpab-wpoa-w-5 wpab-wpoa-h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
            }
            content={
              <div className="wpab-wpoa-p-3 wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-2">
                <p className="wpab-wpoa-font-semibold wpab-wpoa-text-xs wpab-wpoa-uppercase wpab-wpoa-text-gray-400 wpab-wpoa-mb-1">
                  {__("Display Columns", "optionbay-product-options-addons-woo")}
                </p>
                {[
                  {
                    id: "fields",
                    label: __("Fields", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "assigned",
                    label: __("Assigned To", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "status",
                    label: __("Status", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "created_by",
                    label: __("Created By", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "created_at",
                    label: __("Created At", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "updated_by",
                    label: __("Updated By", "optionbay-product-options-addons-woo"),
                  },
                  {
                    id: "updated_at",
                    label: __("Updated At", "optionbay-product-options-addons-woo"),
                  },
                ].map((col) => (
                  <label
                    key={col.id}
                    className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-cursor-pointer hover:wpab-wpoa-text-primary"
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                    />
                    <span className="wpab-wpoa-text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="wpab-wpoa-ignore-preflight">
      <TopProgressBar isSaving={isActioning} />
      {/* WordPress-style Inline Header Row */}
      <div className="wrap wpab-wpoa-mb-4" style={{ margin: "0 0 20px 0", padding: 0 }}>
        <h1 className="wp-heading-inline" style={{
          fontSize: "23px",
          fontWeight: 400,
          color: "#1d2327",
          margin: "0 10px 0 0",
          lineHeight: "1.5",
          display: "inline-block",
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
        }}>
          {__("Option Groups", "optionbay-product-options-addons-woo")}
        </h1>
        <a
          href="#/option-groups/new"
          className="page-title-action"
          style={{
            marginLeft: "4px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            border: "1px solid #2271b1",
            borderRadius: "4px",
            background: "#f6f7f7",
            fontSize: "13px",
            height: "30px",
            boxSizing: "border-box",
            padding: "0 10px",
            cursor: "pointer",
            color: "#2271b1",
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
            verticalAlign: "middle"
          }}
        >
          {__("Add new group", "optionbay-product-options-addons-woo")}
        </a>
        <button
          type="button"
          className={`page-title-action ${showImportPanel ? "active" : ""}`}
          style={{
            marginLeft: "4px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: showImportPanel ? "1px solid #0a4b78" : "1px solid #2271b1",
            borderRadius: "4px",
            background: showImportPanel ? "#f0f0f1" : "#f6f7f7",
            fontSize: "13px",
            height: "30px",
            boxSizing: "border-box",
            padding: "0 10px",
            cursor: "pointer",
            color: showImportPanel ? "#0a4b78" : "#2271b1",
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
            verticalAlign: "middle"
          }}
          onClick={() => {
            setShowImportPanel(!showImportPanel);
            setShowExportPanel(false);
          }}
        >
          {__("Import", "optionbay-product-options-addons-woo")}
        </button>
        <button
          type="button"
          className={`page-title-action ${showExportPanel ? "active" : ""}`}
          style={{
            marginLeft: "4px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: showExportPanel ? "1px solid #0a4b78" : "1px solid #2271b1",
            borderRadius: "4px",
            background: showExportPanel ? "#f0f0f1" : "#f6f7f7",
            fontSize: "13px",
            height: "30px",
            boxSizing: "border-box",
            padding: "0 10px",
            cursor: "pointer",
            color: showExportPanel ? "#0a4b78" : "#2271b1",
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
            verticalAlign: "middle"
          }}
          onClick={() => {
            setShowExportPanel(!showExportPanel);
            setShowImportPanel(false);
          }}
        >
          {__("Export", "optionbay-product-options-addons-woo")}
        </button>
        <hr className="wp-header-end" style={{ clear: "both", border: 0, margin: 0, padding: 0 }} />
      </div>

      {/* Toggleable Import Panel */}
      {showImportPanel && (
        <div className="wpab-wpoa-bg-white wpab-wpoa-border wpab-wpoa-border-gray-200 wpab-wpoa-rounded-lg wpab-wpoa-p-6 wpab-wpoa-mb-6 wpab-wpoa-shadow-sm wpab-wpoa-animate-fadeIn">
          <div className="wpab-wpoa-flex wpab-wpoa-justify-between wpab-wpoa-items-center wpab-wpoa-border-b wpab-wpoa-border-gray-100 wpab-wpoa-pb-3 wpab-wpoa-mb-4">
            <h3 className="wpab-wpoa-m-0 wpab-wpoa-text-lg wpab-wpoa-font-medium">{__("Import Option Groups", "optionbay-product-options-addons-woo")}</h3>
            <button
              onClick={() => setShowImportPanel(false)}
              className="wpab-wpoa-text-gray-400 hover:wpab-wpoa-text-gray-600 wpab-wpoa-border-0 wpab-wpoa-bg-transparent wpab-wpoa-cursor-pointer wpab-wpoa-text-lg"
            >
              ✕
            </button>
          </div>
          <ImportCard />
        </div>
      )}

      {/* Toggleable Export Panel */}
      {showExportPanel && (
        <div className="wpab-wpoa-bg-white wpab-wpoa-border wpab-wpoa-border-gray-200 wpab-wpoa-rounded-lg wpab-wpoa-p-6 wpab-wpoa-mb-6 wpab-wpoa-shadow-sm wpab-wpoa-animate-fadeIn">
          <div className="wpab-wpoa-flex wpab-wpoa-justify-between wpab-wpoa-items-center wpab-wpoa-border-b wpab-wpoa-border-gray-100 wpab-wpoa-pb-3 wpab-wpoa-mb-4">
            <h3 className="wpab-wpoa-m-0 wpab-wpoa-text-lg wpab-wpoa-font-medium">{__("Export Option Groups", "optionbay-product-options-addons-woo")}</h3>
            <button
              onClick={() => setShowExportPanel(false)}
              className="wpab-wpoa-text-gray-400 hover:wpab-wpoa-text-gray-600 wpab-wpoa-border-0 wpab-wpoa-bg-transparent wpab-wpoa-cursor-pointer wpab-wpoa-text-lg"
            >
              ✕
            </button>
          </div>
          <ExportCard />
        </div>
      )}

      {/* Filters, View Inventory, and Search Row */}
      <div className="wpab-wpoa-flex wpab-wpoa-flex-col lg:wpab-wpoa-flex-row wpab-wpoa-justify-between wpab-wpoa-items-start lg:wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-mb-4">
        {/* Left side: Subsubsub filters */}
        <p className="wpab-wpoa-text-gray-600 wpab-wpoa-m-0">
          {loading ? (
            __("Loading…", "optionbay-product-options-addons-woo")
          ) : (
            <ul className="subsubsub wpab-wpoa-w-full wpab-wpoa-list-none wpab-wpoa-p-0 wpab-wpoa-flex wpab-wpoa-gap-2 wpab-wpoa-text-sm wpab-wpoa-m-0">
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setStatusFilter("any");
                    setPage(1);
                  }}
                  className={
                    statusFilter === "any"
                      ? "current wpab-wpoa-font-bold"
                      : "!wpab-wpoa-text-[#50a9e0]"
                  }
                >
                  {__("All", "optionbay-product-options-addons-woo")}{" "}
                  <span className="count">({counts.all})</span>
                </a>{" "}
                |
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setStatusFilter("publish");
                    setPage(1);
                  }}
                  className={
                    statusFilter === "publish"
                      ? "current wpab-wpoa-font-bold"
                      : "!wpab-wpoa-text-[#50a9e0]"
                  }
                >
                  {__("Published", "optionbay-product-options-addons-woo")}{" "}
                  <span className="count">({counts.publish})</span>
                </a>{" "}
                |
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setStatusFilter("draft");
                    setPage(1);
                  }}
                  className={
                    statusFilter === "draft"
                      ? "current wpab-wpoa-font-bold"
                      : "!wpab-wpoa-text-[#50a9e0]"
                  }
                >
                  {__("Draft", "optionbay-product-options-addons-woo")}{" "}
                  <span className="count">({counts.draft})</span>
                </a>{" "}
                {counts.trash > 0 && "|"}
              </li>
              {counts.trash > 0 && (
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setStatusFilter("trash");
                      setPage(1);
                    }}
                    className={
                      statusFilter === "trash"
                        ? "current wpab-wpoa-font-bold"
                        : "!wpab-wpoa-text-[#50a9e0]"
                    }
                  >
                    {__("Trash", "optionbay-product-options-addons-woo")}{" "}
                    <span className="count">({counts.trash})</span>
                  </a>
                </li>
              )}
            </ul>
          )}
        </p>

        {/* Right side: View Inventory & Search controls */}
        <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-flex-wrap wpab-wpoa-gap-2 wpab-wpoa-w-full lg:wpab-wpoa-w-auto wpab-wpoa-justify-end">
          <ClassicButton
            variant="secondary"
            onClick={() => setIsInventoryModalOpen(true)}
            className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2 wpab-wpoa-h-[30px]"
          >
            <Package size={14} />
            {__("View Inventory", "optionbay-product-options-addons-woo")}
          </ClassicButton>

          {/* WordPress-style Search Box */}
          <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1">
            <input
              type="search"
              className="wpab-wpoa-h-[30px] wpab-wpoa-px-3 wpab-wpoa-border wpab-wpoa-border-gray-300 wpab-wpoa-rounded wpab-wpoa-text-sm wpab-wpoa-bg-white"
              placeholder={__("Search option groups...", "optionbay-product-options-addons-woo")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button
              type="button"
              className="button wpab-wpoa-h-[30px] wpab-wpoa-px-3 wpab-wpoa-bg-[#f6f7f7] hover:wpab-wpoa-bg-[#f0f0f1] wpab-wpoa-border wpab-wpoa-border-gray-300 wpab-wpoa-rounded wpab-wpoa-text-sm wpab-wpoa-cursor-pointer wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-text-[#0a4b78] wpab-wpoa-font-medium"
              onClick={handleSearch}
            >
              {__("Search groups", "optionbay-product-options-addons-woo")}
            </button>
          </div>
        </div>
      </div>


      {/* Top Controls */}
      <div className="wpab-wpoa-flex wpab-wpoa-flex-wrap wpab-wpoa-w-full wpab-wpoa-justify-between wpab-wpoa-mb-2">
        {renderBulkActions("top")}
        {renderPagination("top")}
      </div>

      {/* Table */}
      <div className="wpab-wpoa-table-responsive">
        <table className="wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="!wpab-wpoa-w-[2.2em]">
                <ClassicCheckbox
                  checked={
                    groups.length > 0 && selectedGroups.length === groups.length
                  }
                  onChange={(e) => toggleSelectAll(e)}
                />
              </td>
              <th className="wpab-wpoa-w-[40%]">{__("Title", "optionbay-product-options-addons-woo")}</th>
              {visibleColumns.includes("fields") && (
                <th>{__("Fields", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("assigned") && (
                <th>{__("Assigned To", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("status") && (
                <th>{__("Status", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("created_by") && (
                <th>{__("Created By", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("created_at") && (
                <th>{__("Created At", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("updated_by") && (
                <th>{__("Updated By", "optionbay-product-options-addons-woo")}</th>
              )}
              {visibleColumns.includes("updated_at") && (
                <th>{__("Updated At", "optionbay-product-options-addons-woo")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonAddonList />
            ) : groups.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="wpab-wpoa-text-center wpab-wpoa-p-10"
                >
                  <p>{__("No option groups found.", "optionbay-product-options-addons-woo")}</p>
                  <ClassicButton
                    variant="primary"
                    onClick={() => navigate("/option-groups/new")}
                    className="wpab-wpoa-mt-2"
                  >
                    {__("Create your first option group", "optionbay-product-options-addons-woo")}
                  </ClassicButton>
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id}>
                  <th
                    scope="row"
                    className="wpab-wpoa-flex wpab-wpoa-justify-start wpab-wpoa-mt-[1px]"
                  >
                    <ClassicCheckbox
                      checked={selectedGroups.includes(group.id)}
                      onChange={(e) => toggleSelectGroup(group.id, e)}
                      className="wpab-wpoa-mt-0"
                    />
                  </th>
                  <td className="wpab-wpoa-group">
                    <a
                      href={`#/option-groups/${group.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/option-groups/${group.id}`);
                      }}
                      className="wpab-wpoa-font-semibold wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-text-[#135e96]"
                    >
                      {group.title || __("(Untitled)", "optionbay-product-options-addons-woo")}
                    </a>

                    {/* Hover Actions */}
                    <div className="wpab-wpoa-row-actions wpab-wpoa-text-[12px] wpab-wpoa-flex wpab-wpoa-gap-1 wpab-wpoa-opacity-0 group-hover:wpab-wpoa-opacity-100 wpab-wpoa-transition-opacity wpab-wpoa-mt-1">
                      <span className="wpab-wpoa-text-[#999]">
                        ID: {group.id}
                      </span>
                      {statusFilter === "trash" ? (
                        <>
                          <span className="wpab-wpoa-text-[#ddd]">|</span>
                          <span
                            className="wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-underline wpab-wpoa-cursor-pointer"
                            onClick={() => handleRestore(group.id)}
                          >
                            {__("Restore", "optionbay-product-options-addons-woo")}
                          </span>
                          <span className="wpab-wpoa-text-[#ddd]">|</span>
                          <span
                            className="wpab-wpoa-text-[#d63638] hover:wpab-wpoa-text-[#b32d2e] hover:wpab-wpoa-underline wpab-wpoa-cursor-pointer"
                            onClick={() => handleDelete(group.id)}
                          >
                            {__("Delete Permanently", "optionbay-product-options-addons-woo")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="wpab-wpoa-text-[#ddd]">|</span>
                          <a
                            className="wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-underline wpab-wpoa-cursor-pointer"
                            href={`#/option-groups/${group.id}`}
                          >
                            {__("Edit", "optionbay-product-options-addons-woo")}
                          </a>
                          <span className="wpab-wpoa-text-[#ddd]">|</span>
                          <span
                            className="wpab-wpoa-text-[#2271b1] hover:wpab-wpoa-underline wpab-wpoa-cursor-pointer"
                            onClick={() => handleDuplicate(group.id)}
                          >
                            {__("Duplicate", "optionbay-product-options-addons-woo")}
                          </span>
                          <span className="wpab-wpoa-text-[#ddd]">|</span>
                          <span
                            className="wpab-wpoa-text-[#d63638] hover:wpab-wpoa-text-[#b32d2e] hover:wpab-wpoa-underline wpab-wpoa-cursor-pointer"
                            onClick={() => handleDelete(group.id)}
                          >
                            {__("Trash", "optionbay-product-options-addons-woo")}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  {visibleColumns.includes("fields") && (
                    <td>{group.field_count}</td>
                  )}
                  {visibleColumns.includes("assigned") && (
                    <td>{getAssignmentSummary(group.assignments)}</td>
                  )}
                  {visibleColumns.includes("status") && (
                    <td>
                      <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-3">
                        {statusFilter === "trash" ? (
                          <span className="wpab-wpoa-inline-block wpab-wpoa-px-2 wpab-wpoa-py-0.5 wpab-wpoa-rounded wpab-wpoa-text-xs wpab-wpoa-bg-gray-100 wpab-wpoa-text-gray-600">
                            {__("Trash", "optionbay-product-options-addons-woo")}
                          </span>
                        ) : (
                          <>
                            <Switch
                              checked={group.status === "publish"}
                              onChange={() =>
                                handleToggleStatus(group.id, group.status)
                              }
                              disabled={isActioning}
                              size="small"
                            />
                            <span
                              className={`wpab-wpoa-inline-block wpab-wpoa-px-2 wpab-wpoa-py-0.5 wpab-wpoa-rounded wpab-wpoa-text-xs ${
                                group.status === "publish"
                                  ? "wpab-wpoa-bg-[#dff0d8] wpab-wpoa-text-[#3c763d]"
                                  : "wpab-wpoa-bg-[#f2dede] wpab-wpoa-text-[#a94442]"
                              }`}
                            >
                              {group.status === "publish"
                                ? __("Published", "optionbay-product-options-addons-woo")
                                : __("Draft", "optionbay-product-options-addons-woo")}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes("created_by") && (
                    <td>{group.author_name}</td>
                  )}
                  {visibleColumns.includes("created_at") && (
                    <td>{formatDate(group.date_created)}</td>
                  )}
                  {visibleColumns.includes("updated_by") && (
                    <td>{group.modified_by_name}</td>
                  )}
                  {visibleColumns.includes("updated_at") && (
                    <td>{formatDate(group.date_modified)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Controls */}
      <div className="wpab-wpoa-flex wpab-wpoa-justify-between wpab-wpoa-flex-wrap">
        {renderBulkActions("bottom")}
        {renderPagination("bottom")}
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        autoFocus={confirmModal.autoFocus}
      />

      <InventoryListModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
      />
    </div>
  );
}
