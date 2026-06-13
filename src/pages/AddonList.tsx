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
        path: `smart-product-options-addons/v1/groups?page=${page}&per_page=20&status=${statusFilter}&search=${encodeURIComponent(searchParam)}`,
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
          ? __("permanently delete", "smart-product-options-addons")
          : __("move to trash", "smart-product-options-addons")
        : bulkAction === "restore"
        ? __("restore", "smart-product-options-addons")
        : bulkAction === "activate"
        ? __("publish", "smart-product-options-addons")
        : __("draft", "smart-product-options-addons");

    setConfirmModal({
      isOpen: true,
      title: __("Confirm Action", "smart-product-options-addons"),
      message: sprintf(
        __("Are you sure you want to %s %d selected items?", "smart-product-options-addons"),
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
            path: `smart-product-options-addons/v1/groups/bulk`,
            method: "POST",
            data: {
              action: bulkAction,
              ids: selectedGroups,
            },
          });
          setSelectedGroups([]);
          setBulkAction("");
          addToast(
            __("Bulk action applied successfully.", "smart-product-options-addons"),
            "success",
          );
          fetchGroups();
        } catch (err: any) {
          addToast(
            err.message || __("Failed to execute bulk action.", "smart-product-options-addons"),
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
        ? __("Permanently Delete", "smart-product-options-addons")
        : __("Move to Trash", "smart-product-options-addons"),
      message: isTrash
        ? __(
            "Are you sure you want to permanently delete this option group? This action cannot be undone.",
            "smart-product-options-addons",
          )
        : __(
            "Are you sure you want to move this option group to trash?",
            "smart-product-options-addons",
          ),
      confirmColor: "danger",
      autoFocus: "cancel",
      onConfirm: async () => {
        closeConfirmModal();
        setIsActioning(true);
        try {
          await apiFetch({
            path: `smart-product-options-addons/v1/groups/${id}`,
            method: "DELETE",
          });
          addToast(
            isTrash
              ? __("Option group permanently deleted.", "smart-product-options-addons")
              : __("Option group moved to trash.", "smart-product-options-addons"),
            "success",
          );
          fetchGroups();
        } catch (err: any) {
          addToast(
            err.message || __("Failed to delete group.", "smart-product-options-addons"),
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
        path: `smart-product-options-addons/v1/groups/${id}/duplicate`,
        method: "POST",
      });
      addToast(__("Option group duplicated.", "smart-product-options-addons"), "success");
      fetchGroups();
    } catch (err: any) {
      addToast(
        err.message || __("Failed to duplicate group.", "smart-product-options-addons"),
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
        path: `smart-product-options-addons/v1/groups/bulk`,
        method: "POST",
        data: {
          action: "restore",
          ids: [id],
        },
      });
      addToast(__("Option group restored.", "smart-product-options-addons"), "success");
      fetchGroups();
    } catch (err: any) {
      addToast(
        err.message || __("Failed to restore group.", "smart-product-options-addons"),
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
        path: `smart-product-options-addons/v1/groups/${id}/status`,
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
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status: newStatus } : g)),
      );
    } catch (err: any) {
      addToast(
        err.message || __("Failed to update status.", "smart-product-options-addons"),
        "error",
      );
    } finally {
      setIsActioning(false);
    }
  };

  const getAssignmentSummary = (assignments: GroupListItem["assignments"]) => {
    if (!assignments || assignments.length === 0) {
      return __("None", "smart-product-options-addons");
    }

    const hasGlobal = assignments.some((a) => a.target_type === "global");
    if (hasGlobal) {
      return __("All Products", "smart-product-options-addons");
    }

    const cats = assignments.filter(
      (a) => a.target_type === "category" && !a.is_exclusion,
    ).length;
    const products = assignments.filter(
      (a) => a.target_type === "product" && !a.is_exclusion,
    ).length;
    const parts: string[] = [];
    if (cats > 0) {
      parts.push(`${cats} ${__("categories", "smart-product-options-addons")}`);
    }
    if (products > 0) {
      parts.push(`${products} ${__("products", "smart-product-options-addons")}`);
    }
    return parts.join(", ") || __("None", "smart-product-options-addons");
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
      className={`alignleft actions bulkactions spoa-flex spoa-items-center spoa-gap-2 ${
        position === "bottom"
          ? "spoa-mt-4"
          : "spoa-mt-4 sm:spoa-mt-0"
      }`}
    >
      <select
        value={position === "bottom" ? "" : bulkAction} // Only bind value to top to prevent double selection issues
        onChange={(e) => setBulkAction(e.target.value)}
        className="spoa-h-[30px]"
        disabled={isActioning}
      >
        <option value="">{__("Bulk actions", "smart-product-options-addons")}</option>
        {statusFilter === "trash" ? (
          <>
            <option value="restore">{__("Restore", "smart-product-options-addons")}</option>
            <option value="delete">
              {__("Delete Permanently", "smart-product-options-addons")}
            </option>
          </>
        ) : (
          <>
            <option value="activate">{__("Publish", "smart-product-options-addons")}</option>
            <option value="draft">{__("Draft", "smart-product-options-addons")}</option>
            <option value="delete">{__("Move to Trash", "smart-product-options-addons")}</option>
          </>
        )}
      </select>
      <ClassicButton
        variant="secondary"
        onClick={handleBulkAction}
        disabled={!bulkAction || selectedGroups.length === 0 || isActioning}
      >
        {__("Apply", "smart-product-options-addons")}
      </ClassicButton>
      {selectedGroups.length > 0 && (
        <span className="spoa-text-sm spoa-text-gray-500">
          {sprintf(
            __("%1$d of %2$d selected", "smart-product-options-addons"),
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
        className={`tablenav-pages spoa-flex spoa-items-center spoa-gap-2 ${
          position === "bottom" ? "spoa-mt-4" : ""
        }`}
      >
        <span className="displaying-num spoa-text-[13px] spoa-mr-2">
          {total} {__("items", "smart-product-options-addons")}
        </span>
        <ClassicButton
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          {__("← Previous", "smart-product-options-addons")}
        </ClassicButton>
        <span className="spoa-leading-[30px] spoa-px-2">
          {__("Page", "smart-product-options-addons")} {page} {__("of", "smart-product-options-addons")} {totalPages}
        </span>
        <ClassicButton
          variant="secondary"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          {__("Next →", "smart-product-options-addons")}
        </ClassicButton>

        <div className="spoa-ml-2">
          <Popover
            align="bottom-right"
            trigger={
              <div className="spoa-p-1 spoa-rounded hover:spoa-bg-gray-100 spoa-text-gray-500">
                <svg
                  className="spoa-w-5 spoa-h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>
            }
            content={
              <div className="spoa-p-3 spoa-flex spoa-flex-col spoa-gap-2">
                <p className="spoa-font-semibold spoa-text-xs spoa-uppercase spoa-text-gray-400 spoa-mb-1">
                  {__("Display Columns", "smart-product-options-addons")}
                </p>
                {[
                  {
                    id: "fields",
                    label: __("Fields", "smart-product-options-addons"),
                  },
                  {
                    id: "assigned",
                    label: __("Assigned To", "smart-product-options-addons"),
                  },
                  {
                    id: "status",
                    label: __("Status", "smart-product-options-addons"),
                  },
                  {
                    id: "created_by",
                    label: __("Created By", "smart-product-options-addons"),
                  },
                  {
                    id: "created_at",
                    label: __("Created At", "smart-product-options-addons"),
                  },
                  {
                    id: "updated_by",
                    label: __("Updated By", "smart-product-options-addons"),
                  },
                  {
                    id: "updated_at",
                    label: __("Updated At", "smart-product-options-addons"),
                  },
                ].map((col) => (
                  <label
                    key={col.id}
                    className="spoa-flex spoa-items-center spoa-gap-2 spoa-cursor-pointer hover:spoa-text-primary"
                  >
                    <Checkbox
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                    />
                    <span className="spoa-text-sm">{col.label}</span>
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
    <div className="spoa-ignore-preflight">
      <TopProgressBar isSaving={isActioning} />
      {/* WordPress-style Inline Header Row */}
      <div className="wrap spoa-mb-4" style={{ margin: "0 0 20px 0", padding: 0 }}>
        <h1 className="wp-heading-inline" style={{
          fontSize: "23px",
          fontWeight: 400,
          color: "#1d2327",
          margin: "0 10px 0 0",
          lineHeight: "1.5",
          display: "inline-block",
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
        }}>
          {__("Option Groups", "smart-product-options-addons")}
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
          {__("Add new group", "smart-product-options-addons")}
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
          {__("Import", "smart-product-options-addons")}
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
          {__("Export", "smart-product-options-addons")}
        </button>
        <hr className="wp-header-end" style={{ clear: "both", border: 0, margin: 0, padding: 0 }} />
      </div>

      {/* Toggleable Import Panel */}
      {showImportPanel && (
        <div className="spoa-bg-white spoa-border spoa-border-gray-200 spoa-rounded-lg spoa-p-6 spoa-mb-6 spoa-shadow-sm spoa-animate-fadeIn">
          <div className="spoa-flex spoa-justify-between spoa-items-center spoa-border-b spoa-border-gray-100 spoa-pb-3 spoa-mb-4">
            <h3 className="spoa-m-0 spoa-text-lg spoa-font-medium">{__("Import Option Groups", "smart-product-options-addons")}</h3>
            <button
              onClick={() => setShowImportPanel(false)}
              className="spoa-text-gray-400 hover:spoa-text-gray-600 spoa-border-0 spoa-bg-transparent spoa-cursor-pointer spoa-text-lg"
            >
              ✕
            </button>
          </div>
          <ImportCard />
        </div>
      )}

      {/* Toggleable Export Panel */}
      {showExportPanel && (
        <div className="spoa-bg-white spoa-border spoa-border-gray-200 spoa-rounded-lg spoa-p-6 spoa-mb-6 spoa-shadow-sm spoa-animate-fadeIn">
          <div className="spoa-flex spoa-justify-between spoa-items-center spoa-border-b spoa-border-gray-100 spoa-pb-3 spoa-mb-4">
            <h3 className="spoa-m-0 spoa-text-lg spoa-font-medium">{__("Export Option Groups", "smart-product-options-addons")}</h3>
            <button
              onClick={() => setShowExportPanel(false)}
              className="spoa-text-gray-400 hover:spoa-text-gray-600 spoa-border-0 spoa-bg-transparent spoa-cursor-pointer spoa-text-lg"
            >
              ✕
            </button>
          </div>
          <ExportCard />
        </div>
      )}

      {/* Filters, View Inventory, and Search Row */}
      <div className="spoa-flex spoa-flex-col lg:spoa-flex-row spoa-justify-between spoa-items-start lg:spoa-items-center spoa-gap-2 spoa-mb-4">
        {/* Left side: Subsubsub filters */}
        <p className="spoa-text-gray-600 spoa-m-0">
          {loading ? (
            __("Loading…", "smart-product-options-addons")
          ) : (
            <ul className="subsubsub spoa-w-full spoa-list-none spoa-p-0 spoa-flex spoa-gap-2 spoa-text-sm spoa-m-0">
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
                      ? "current spoa-font-bold"
                      : "!spoa-text-[#50a9e0]"
                  }
                >
                  {__("All", "smart-product-options-addons")}{" "}
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
                      ? "current spoa-font-bold"
                      : "!spoa-text-[#50a9e0]"
                  }
                >
                  {__("Published", "smart-product-options-addons")}{" "}
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
                      ? "current spoa-font-bold"
                      : "!spoa-text-[#50a9e0]"
                  }
                >
                  {__("Draft", "smart-product-options-addons")}{" "}
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
                        ? "current spoa-font-bold"
                        : "!spoa-text-[#50a9e0]"
                    }
                  >
                    {__("Trash", "smart-product-options-addons")}{" "}
                    <span className="count">({counts.trash})</span>
                  </a>
                </li>
              )}
            </ul>
          )}
        </p>

        {/* Right side: View Inventory & Search controls */}
        <div className="spoa-flex spoa-items-center spoa-flex-wrap spoa-gap-2 spoa-w-full lg:spoa-w-auto spoa-justify-end">
          <ClassicButton
            variant="secondary"
            onClick={() => setIsInventoryModalOpen(true)}
            className="spoa-flex spoa-items-center spoa-gap-2 spoa-h-[30px]"
          >
            <Package size={14} />
            {__("View Inventory", "smart-product-options-addons")}
          </ClassicButton>

          {/* WordPress-style Search Box */}
          <div className="spoa-flex spoa-items-center spoa-gap-1">
            <input
              type="search"
              className="spoa-h-[30px] spoa-px-3 spoa-border spoa-border-gray-300 spoa-rounded spoa-text-sm spoa-bg-white"
              placeholder={__("Search option groups...", "smart-product-options-addons")}
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
              className="button spoa-h-[30px] spoa-px-3 spoa-bg-[#f6f7f7] hover:spoa-bg-[#f0f0f1] spoa-border spoa-border-gray-300 spoa-rounded spoa-text-sm spoa-cursor-pointer spoa-text-[#2271b1] hover:spoa-text-[#0a4b78] spoa-font-medium"
              onClick={handleSearch}
            >
              {__("Search groups", "smart-product-options-addons")}
            </button>
          </div>
        </div>
      </div>


      {/* Top Controls */}
      <div className="spoa-flex spoa-flex-wrap spoa-w-full spoa-justify-between spoa-mb-2">
        {renderBulkActions("top")}
        {renderPagination("top")}
      </div>

      {/* Table */}
      <div className="spoa-table-responsive">
        <table className="wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="!spoa-w-[2.2em]">
                <ClassicCheckbox
                  checked={
                    groups.length > 0 && selectedGroups.length === groups.length
                  }
                  onChange={(e) => toggleSelectAll(e)}
                />
              </td>
              <th className="spoa-w-[40%]">{__("Title", "smart-product-options-addons")}</th>
              {visibleColumns.includes("fields") && (
                <th>{__("Fields", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("assigned") && (
                <th>{__("Assigned To", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("status") && (
                <th>{__("Status", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("created_by") && (
                <th>{__("Created By", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("created_at") && (
                <th>{__("Created At", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("updated_by") && (
                <th>{__("Updated By", "smart-product-options-addons")}</th>
              )}
              {visibleColumns.includes("updated_at") && (
                <th>{__("Updated At", "smart-product-options-addons")}</th>
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
                  className="spoa-text-center spoa-p-10"
                >
                  <p>{__("No option groups found.", "smart-product-options-addons")}</p>
                  <ClassicButton
                    variant="primary"
                    onClick={() => navigate("/option-groups/new")}
                    className="spoa-mt-2"
                  >
                    {__("Create your first option group", "smart-product-options-addons")}
                  </ClassicButton>
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id}>
                  <th
                    scope="row"
                    className="spoa-flex spoa-justify-start spoa-mt-[1px]"
                  >
                    <ClassicCheckbox
                      checked={selectedGroups.includes(group.id)}
                      onChange={(e) => toggleSelectGroup(group.id, e)}
                      className="spoa-mt-0"
                    />
                  </th>
                  <td className="spoa-group">
                    <a
                      href={`#/option-groups/${group.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/option-groups/${group.id}`);
                      }}
                      className="spoa-font-semibold spoa-text-[#2271b1] hover:spoa-text-[#135e96]"
                    >
                      {group.title || __("(Untitled)", "smart-product-options-addons")}
                    </a>

                    {/* Hover Actions */}
                    <div className="spoa-row-actions spoa-text-[12px] spoa-flex spoa-gap-1 spoa-opacity-0 group-hover:spoa-opacity-100 spoa-transition-opacity spoa-mt-1">
                      <span className="spoa-text-[#999]">
                        ID: {group.id}
                      </span>
                      {statusFilter === "trash" ? (
                        <>
                          <span className="spoa-text-[#ddd]">|</span>
                          <span
                            className="spoa-text-[#2271b1] hover:spoa-underline spoa-cursor-pointer"
                            onClick={() => handleRestore(group.id)}
                          >
                            {__("Restore", "smart-product-options-addons")}
                          </span>
                          <span className="spoa-text-[#ddd]">|</span>
                          <span
                            className="spoa-text-[#d63638] hover:spoa-text-[#b32d2e] hover:spoa-underline spoa-cursor-pointer"
                            onClick={() => handleDelete(group.id)}
                          >
                            {__("Delete Permanently", "smart-product-options-addons")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="spoa-text-[#ddd]">|</span>
                          <a
                            className="spoa-text-[#2271b1] hover:spoa-underline spoa-cursor-pointer"
                            href={`#/option-groups/${group.id}`}
                          >
                            {__("Edit", "smart-product-options-addons")}
                          </a>
                          <span className="spoa-text-[#ddd]">|</span>
                          <span
                            className="spoa-text-[#2271b1] hover:spoa-underline spoa-cursor-pointer"
                            onClick={() => handleDuplicate(group.id)}
                          >
                            {__("Duplicate", "smart-product-options-addons")}
                          </span>
                          <span className="spoa-text-[#ddd]">|</span>
                          <span
                            className="spoa-text-[#d63638] hover:spoa-text-[#b32d2e] hover:spoa-underline spoa-cursor-pointer"
                            onClick={() => handleDelete(group.id)}
                          >
                            {__("Trash", "smart-product-options-addons")}
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
                      <div className="spoa-flex spoa-items-center spoa-gap-3">
                        {statusFilter === "trash" ? (
                          <span className="spoa-inline-block spoa-px-2 spoa-py-0.5 spoa-rounded spoa-text-xs spoa-bg-gray-100 spoa-text-gray-600">
                            {__("Trash", "smart-product-options-addons")}
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
                              className={`spoa-inline-block spoa-px-2 spoa-py-0.5 spoa-rounded spoa-text-xs ${
                                group.status === "publish"
                                  ? "spoa-bg-[#dff0d8] spoa-text-[#3c763d]"
                                  : "spoa-bg-[#f2dede] spoa-text-[#a94442]"
                              }`}
                            >
                              {group.status === "publish"
                                ? __("Published", "smart-product-options-addons")
                                : __("Draft", "smart-product-options-addons")}
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
      <div className="spoa-flex spoa-justify-between spoa-flex-wrap">
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
