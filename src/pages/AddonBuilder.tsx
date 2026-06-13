import { useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { __ } from "@wordpress/i18n";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { ClassicInput } from "../components/classics";
import {
  AddonProvider,
  useAddonContext,
  getDefaultField,
} from "../store/AddonContext";
import apiFetch from "../utils/apiFetch";
import { addonGroupSchema } from "../utils/validation";
import { flattenErrors } from "../utils/errorUtils";
import { useToast } from "../store/toast/use-toast";

// Components
import { BuilderHeader } from "../components/addonBuilder/BuilderHeader";
import { BuilderSidebar } from "../components/addonBuilder/BuilderSidebar";
import { AssignmentRules } from "../components/addonBuilder/AssignmentRules";
import { FieldRow } from "../components/addonBuilder/FieldRow";
import { FormError } from "../components/addonBuilder/FormError";
import { SkeletonBuilder } from "../components/loading/SkeletonBuilder";
import { TopProgressBar } from "../components/loading/TopProgressBar";

// ─── Main Builder (inner) ────────────────────────────────────────────────

function BuilderInner() {
  const { state, dispatch } = useAddonContext();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;

  // Load existing group
  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const loadGroup = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const data = (await apiFetch({
          path: `smart-product-options-addons/v1/groups/${params.id}`,
          method: "GET",
        })) as any;

        dispatch({
          type: "SET_GROUP",
          payload: {
            id: data.id,
            title: data.title,
            status: data.status,
            schema: data.schema || [],
            assignments: (data.assignments || []).map((a: any) => ({
              ...a,
              target_id: parseInt(a.target_id) || 0,
              is_exclusion:
                String(a.is_exclusion) === "1" || a.is_exclusion === true,
            })),
          },
        });
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: __("Failed to load option group.", "smart-product-options-addons"),
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    loadGroup();
  }, [isEdit, params.id, dispatch]);

  // Save handler
  const handleSave = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_ERRORS", payload: {} });

    try {
      const payload = {
        title: state.title,
        status: state.status,
        schema: state.schema,
        assignments: state.assignments,
        new_inventories: state.new_inventories,
      };

      console.log('Validating payload:', JSON.stringify(payload, null, 2));

      const result = addonGroupSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        const toastsToTrigger: { msg: string; meta?: any }[] = [];
        let firstErrorFieldId: string | null = null;

        result.error.issues.forEach((issue) => {
          const path = issue.path.join(".");
          fieldErrors[path] = issue.message;

          // Create human-readable message for toast
          let readablePath = path;
          let meta: any = undefined;
          if (path.startsWith("schema.")) {
            const parts = path.split(".");
            const fieldIndex = parseInt(parts[1]);
            const field = state.schema[fieldIndex];
            const fieldDisplayName = field?.label || `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1}`;

            let section = "";
            if (parts[2] === "options" && parts[3]) {
              const optionIndex = parseInt(parts[3]);
              const option = field?.options?.[optionIndex];
              const optionDisplayName = option?.label || `${__("Choice", "smart-product-options-addons")} #${optionIndex + 1}`;
              const propertyName = parts[4] || "";
              section = `${__("Choices", "smart-product-options-addons")} > ${optionDisplayName} (${propertyName})`;
              readablePath = `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1} (${fieldDisplayName}) -> ${__("Choice", "smart-product-options-addons")} #${optionIndex + 1} (${optionDisplayName}) ${propertyName} : `.trim();
            } else {
              const propertyName = parts[2] || "";
              section = propertyName.toString();
              readablePath = `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1} (${fieldDisplayName}) ${propertyName} : `.trim();
            }

            meta = {
              fieldName: fieldDisplayName,
              fieldId: field?.id,
              section: section,
              errorText: issue.message,
            };

            // Find the field ID to expand it
            if (!firstErrorFieldId && field) {
              firstErrorFieldId = field.id;
            }
          } else if (path === "title") {
            readablePath = __("Group Title : ", "smart-product-options-addons");
            meta = {
              fieldName: __("Option Group Title", "smart-product-options-addons"),
              errorText: issue.message,
            };
          } else if (path.startsWith("assignments")) {
            readablePath = __("Assignment Rules : ", "smart-product-options-addons");
            meta = {
              fieldName: __("Assignment Rules", "smart-product-options-addons"),
              errorText: issue.message,
            };
          }

          toastsToTrigger.push({
            msg: `${readablePath} ${issue.message}`,
            meta,
          });
        });

        dispatch({ type: "SET_ERRORS", payload: fieldErrors });

        if (firstErrorFieldId) {
          dispatch({ type: "EXPAND_FIELD", payload: firstErrorFieldId });
        }

        const topMessage = __(
          "Please fix the validation errors below.",
          "smart-product-options-addons",
        );
        dispatch({ type: "SET_ERROR", payload: topMessage });

        // Show the first 3 errors in the toast to avoid it being too huge
        toastsToTrigger.slice(0, 3).forEach(({ msg, meta }) => {
          addToast(msg, "error", meta);
        });

        dispatch({ type: "SET_SAVING", payload: false });
        return;
      }

      if (isEdit && state.id) {
        await apiFetch({
          path: `smart-product-options-addons/v1/groups/${state.id}`,
          method: "PUT",
          data: payload,
        });
        dispatch({ type: "MARK_CLEAN" });
        addToast(__("Option group updated.", "smart-product-options-addons"), "success");
      } else {
        const response = (await apiFetch({
          path: "smart-product-options-addons/v1/groups",
          method: "POST",
          data: payload,
        })) as any;

        if (response.id) {
          addToast(__("Option group created.", "smart-product-options-addons"), "success");
          navigate(`/option-groups/${response.id}`, {
            replace: true,
          });
        }
      }
    } catch (err: any) {
      if (err?.data?.status === 422 && err.data.errors) {
        const flattened = flattenErrors(err.data.errors);
        dispatch({ type: "SET_ERRORS", payload: flattened });

        const toastsToTrigger: { msg: string; meta?: any }[] = [];
        let firstErrorFieldId: string | null = null;

        Object.entries(flattened).forEach(([path, message]) => {
          let readablePath = path;
          let meta: any = undefined;
          if (path.startsWith("schema.")) {
            const parts = path.split(".");
            const fieldIndex = parseInt(parts[1]);
            const field = state.schema[fieldIndex];
            const fieldDisplayName = field?.label || `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1}`;

            let section = "";
            if (parts[2] === "options" && parts[3]) {
              const optionIndex = parseInt(parts[3]);
              const option = field?.options?.[optionIndex];
              const optionDisplayName = option?.label || `${__("Choice", "smart-product-options-addons")} #${optionIndex + 1}`;
              const propertyName = parts[4] || "";
              section = `${__("Choices", "smart-product-options-addons")} > ${optionDisplayName} (${propertyName})`;
              readablePath = `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1} (${fieldDisplayName}) -> ${__("Choice", "smart-product-options-addons")} #${optionIndex + 1} (${optionDisplayName}) ${propertyName} : `.trim();
            } else {
              const propertyName = parts[2] || "";
              section = propertyName.toString();
              readablePath = `${__("Field", "smart-product-options-addons")} #${fieldIndex + 1} (${fieldDisplayName}) ${propertyName} : `.trim();
            }

            meta = {
              fieldName: fieldDisplayName,
              fieldId: field?.id,
              section: section,
              errorText: message as string,
            };

            // Find the field ID to expand it
            if (!firstErrorFieldId && field) {
              firstErrorFieldId = field.id;
            }
          } else if (path === "title") {
            readablePath = __("Group Title : ", "smart-product-options-addons");
            meta = {
              fieldName: __("Option Group Title", "smart-product-options-addons"),
              errorText: message as string,
            };
          } else if (path.startsWith("assignments")) {
            readablePath = __("Assignment Rules : ", "smart-product-options-addons");
            meta = {
              fieldName: __("Assignment Rules", "smart-product-options-addons"),
              errorText: message as string,
            };
          }

          toastsToTrigger.push({
            msg: `${readablePath} ${message}`,
            meta,
          });
        });

        if (firstErrorFieldId) {
          dispatch({ type: "EXPAND_FIELD", payload: firstErrorFieldId });
        }

        dispatch({
          type: "SET_ERROR",
          payload: __(
            "Please fix the validation errors reported by the server.",
            "smart-product-options-addons",
          ),
        });

        // Show the first 3 errors in the toast
        toastsToTrigger.slice(0, 3).forEach(({ msg, meta }) => {
          addToast(msg, "error", meta);
        });
      } else {
        const errMsg =
          err?.message || __("Failed to save option group.", "smart-product-options-addons");
        dispatch({
          type: "SET_ERROR",
          payload: errMsg,
        });
        addToast(errMsg, "error");
      }
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state, isEdit, dispatch, navigate]);

  // Drag-and-drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const items = Array.from(state.schema);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    dispatch({ type: "REORDER_FIELDS", payload: items });
  };

  if (state.isLoading) {
    return (
      <div className="spoa-p-6">
        <SkeletonBuilder />
      </div>
    );
  }

  return (
    <div className="spoa-ignore-preflight ">
      <TopProgressBar isSaving={state.isSaving} />
      {/* Error notice */}
      {state.error && (
        <div className="notice notice-error is-dismissible spoa-mb-5">
          <p>{state.error}</p>
        </div>
      )}

      {/* Top bar */}
      <BuilderHeader handleSave={handleSave} isEdit={isEdit} />

      {/* Main content: 2-column layout */}
      <div className="spoa-flex spoa-flex-col 2xl:spoa-flex-row spoa-gap-6 spoa-items-start">
        {/* Left: Title + Fields */}
        <div className="spoa-w-full spoa-min-w-0 spoa-flex spoa-flex-col spoa-gap-6">
          {/* Group Title */}
          <div>
            <div className="inside !spoa-p-0">
              <ClassicInput
                className="spoa-w-full !spoa-text-[20px] !spoa-font-semibold !spoa-py-3 !spoa-px-4 !spoa-border !spoa-border-[#ddd] !spoa-rounded-md focus:!spoa-border-[#2271b1] focus:!spoa-shadow-[0_0_0_1px_#2271b1] focus:!spoa-outline-none"
                size="large"
                value={state.title}
                onChange={(e) =>
                  dispatch({
                    type: "SET_TITLE",
                    payload: e.target.value,
                  })
                }
                placeholder={__("Enter Option Group Title", "smart-product-options-addons")}
              />
              <FormError message={state.errors?.title} />
            </div>
          </div>

          {/* Assignment Rules */}
          <AssignmentRules />

          <div>
            <h2 className="spoa-ignore-preflight">
              {__("Fields", "smart-product-options-addons")}
            </h2>
            <p className="description">
              {__("Drag and drop fields to reorder them.", "smart-product-options-addons")}
            </p>
          </div>

          {/* Fields list mit header and table layout */}
          <div className="spoa-border spoa-border-[#c3c4c7] !spoa-m-0 spoa-rounded-[12px] spoa-overflow-x-hidden spoa-overflow-y-visible">
            {/* Table Header */}
            <div className="spoa-flex spoa-items-center spoa-bg-[#f6f7f7] spoa-border-b spoa-border-[#c3c4c7] spoa-px-4 spoa-py-2 spoa-font-semibold spoa-text-[#1d2327]">
              <div className="spoa-w-10">
                <span className="dashicons dashicons-editor-help spoa-text-[#9ca3af] !spoa-flex !spoa-items-center !spoa-w-full !spoa-h-full"></span>
              </div>
              <div className="spoa-flex-1">{__("Name", "smart-product-options-addons")}</div>
              <div className="spoa-w-1/3">{__("Type", "smart-product-options-addons")}</div>
              <div className="spoa-w-32 spoa-text-right"></div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields-list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="spoa-flex spoa-flex-col spoa-min-h-[50px]"
                  >
                    {state.schema.length === 0 ? (
                      <div className="spoa-text-center spoa-px-5 spoa-py-[60px] spoa-text-[#999] spoa-border-dashed spoa-border-[#c3c4c7] spoa-m-4 spoa-rounded-lg">
                        <p className="spoa-text-base spoa-mb-2">
                          {__("Your group is empty", "smart-product-options-addons")}
                        </p>
                        <p className="spoa-text-[13px]">
                          {__(
                            "Click the field buttons in the sidebar to start building.",
                            "smart-product-options-addons",
                          )}
                        </p>
                      </div>
                    ) : (
                      state.schema.map((field, index) => (
                        <FieldRow key={field.id} field={field} index={index} />
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Table Footer */}
            <div className="spoa-p-3 spoa-bg-[#f6f7f7]">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  // This will just open the sidebar if it was closed,
                  // but usually we add a default field or similar.
                  // For now, let's just use the existing sidebar logic
                  // but we could also trigger adding a field here.
                  dispatch({
                    type: "ADD_FIELD",
                    payload: getDefaultField("text"),
                  });
                }}
              >
                {__("Add field", "smart-product-options-addons")}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <BuilderSidebar />
      </div>
    </div>
  );
}

// ─── Exported Component (wraps with AddonProvider) ───────────────────────

export default function AddonBuilder() {
  return (
    <AddonProvider>
      <BuilderInner />
    </AddonProvider>
  );
}
