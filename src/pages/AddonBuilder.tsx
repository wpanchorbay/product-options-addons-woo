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
          path: `optionbay-product-options-addons-woo/v1/groups/${params.id}`,
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
          payload: __("Failed to load option group.", "optionbay-product-options-addons-woo"),
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
            const fieldDisplayName = field?.label || `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1}`;

            let section = "";
            if (parts[2] === "options" && parts[3]) {
              const optionIndex = parseInt(parts[3]);
              const option = field?.options?.[optionIndex];
              const optionDisplayName = option?.label || `${__("Choice", "optionbay-product-options-addons-woo")} #${optionIndex + 1}`;
              const propertyName = parts[4] || "";
              section = `${__("Choices", "optionbay-product-options-addons-woo")} > ${optionDisplayName} (${propertyName})`;
              readablePath = `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1} (${fieldDisplayName}) -> ${__("Choice", "optionbay-product-options-addons-woo")} #${optionIndex + 1} (${optionDisplayName}) ${propertyName} : `.trim();
            } else {
              const propertyName = parts[2] || "";
              section = propertyName.toString();
              readablePath = `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1} (${fieldDisplayName}) ${propertyName} : `.trim();
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
            readablePath = __("Group Title : ", "optionbay-product-options-addons-woo");
            meta = {
              fieldName: __("Option Group Title", "optionbay-product-options-addons-woo"),
              errorText: issue.message,
            };
          } else if (path.startsWith("assignments")) {
            readablePath = __("Assignment Rules : ", "optionbay-product-options-addons-woo");
            meta = {
              fieldName: __("Assignment Rules", "optionbay-product-options-addons-woo"),
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
          "optionbay-product-options-addons-woo",
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
          path: `optionbay-product-options-addons-woo/v1/groups/${state.id}`,
          method: "PUT",
          data: payload,
        });
        dispatch({ type: "MARK_CLEAN" });
        addToast(__("Option group updated.", "optionbay-product-options-addons-woo"), "success");
      } else {
        const response = (await apiFetch({
          path: "optionbay-product-options-addons-woo/v1/groups",
          method: "POST",
          data: payload,
        })) as any;

        if (response.id) {
          addToast(__("Option group created.", "optionbay-product-options-addons-woo"), "success");
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
            const fieldDisplayName = field?.label || `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1}`;

            let section = "";
            if (parts[2] === "options" && parts[3]) {
              const optionIndex = parseInt(parts[3]);
              const option = field?.options?.[optionIndex];
              const optionDisplayName = option?.label || `${__("Choice", "optionbay-product-options-addons-woo")} #${optionIndex + 1}`;
              const propertyName = parts[4] || "";
              section = `${__("Choices", "optionbay-product-options-addons-woo")} > ${optionDisplayName} (${propertyName})`;
              readablePath = `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1} (${fieldDisplayName}) -> ${__("Choice", "optionbay-product-options-addons-woo")} #${optionIndex + 1} (${optionDisplayName}) ${propertyName} : `.trim();
            } else {
              const propertyName = parts[2] || "";
              section = propertyName.toString();
              readablePath = `${__("Field", "optionbay-product-options-addons-woo")} #${fieldIndex + 1} (${fieldDisplayName}) ${propertyName} : `.trim();
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
            readablePath = __("Group Title : ", "optionbay-product-options-addons-woo");
            meta = {
              fieldName: __("Option Group Title", "optionbay-product-options-addons-woo"),
              errorText: message as string,
            };
          } else if (path.startsWith("assignments")) {
            readablePath = __("Assignment Rules : ", "optionbay-product-options-addons-woo");
            meta = {
              fieldName: __("Assignment Rules", "optionbay-product-options-addons-woo"),
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
            "optionbay-product-options-addons-woo",
          ),
        });

        // Show the first 3 errors in the toast
        toastsToTrigger.slice(0, 3).forEach(({ msg, meta }) => {
          addToast(msg, "error", meta);
        });
      } else {
        const errMsg =
          err?.message || __("Failed to save option group.", "optionbay-product-options-addons-woo");
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
      <div className="wpab-wpoa-p-6">
        <SkeletonBuilder />
      </div>
    );
  }

  return (
    <div className="wpab-wpoa-ignore-preflight ">
      <TopProgressBar isSaving={state.isSaving} />
      {/* Error notice */}
      {state.error && (
        <div className="notice notice-error is-dismissible wpab-wpoa-mb-5">
          <p>{state.error}</p>
        </div>
      )}

      {/* Top bar */}
      <BuilderHeader handleSave={handleSave} isEdit={isEdit} />

      {/* Main content: 2-column layout */}
      <div className="wpab-wpoa-flex wpab-wpoa-flex-col 2xl:wpab-wpoa-flex-row wpab-wpoa-gap-6 wpab-wpoa-items-start">
        {/* Left: Title + Fields */}
        <div className="wpab-wpoa-w-full wpab-wpoa-min-w-0 wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-6">
          {/* Group Title */}
          <div>
            <div className="inside !wpab-wpoa-p-0">
              <ClassicInput
                className="wpab-wpoa-w-full !wpab-wpoa-text-[20px] !wpab-wpoa-font-semibold !wpab-wpoa-py-3 !wpab-wpoa-px-4 !wpab-wpoa-border !wpab-wpoa-border-[#ddd] !wpab-wpoa-rounded-md focus:!wpab-wpoa-border-[#2271b1] focus:!wpab-wpoa-shadow-[0_0_0_1px_#2271b1] focus:!wpab-wpoa-outline-none"
                size="large"
                value={state.title}
                onChange={(e) =>
                  dispatch({
                    type: "SET_TITLE",
                    payload: e.target.value,
                  })
                }
                placeholder={__("Enter Option Group Title", "optionbay-product-options-addons-woo")}
              />
              <FormError message={state.errors?.title} />
            </div>
          </div>

          {/* Assignment Rules */}
          <AssignmentRules />

          <div>
            <h2 className="wpab-wpoa-ignore-preflight">
              {__("Fields", "optionbay-product-options-addons-woo")}
            </h2>
            <p className="description">
              {__("Drag and drop fields to reorder them.", "optionbay-product-options-addons-woo")}
            </p>
          </div>

          {/* Fields list mit header and table layout */}
          <div className="wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] !wpab-wpoa-m-0 wpab-wpoa-rounded-[12px] wpab-wpoa-overflow-x-hidden wpab-wpoa-overflow-y-visible">
            {/* Table Header */}
            <div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-bg-[#f6f7f7] wpab-wpoa-border-b wpab-wpoa-border-[#c3c4c7] wpab-wpoa-px-4 wpab-wpoa-py-2 wpab-wpoa-font-semibold wpab-wpoa-text-[#1d2327]">
              <div className="wpab-wpoa-w-10">
                <span className="dashicons dashicons-editor-help wpab-wpoa-text-[#9ca3af] !wpab-wpoa-flex !wpab-wpoa-items-center !wpab-wpoa-w-full !wpab-wpoa-h-full"></span>
              </div>
              <div className="wpab-wpoa-flex-1">{__("Name", "optionbay-product-options-addons-woo")}</div>
              <div className="wpab-wpoa-w-1/3">{__("Type", "optionbay-product-options-addons-woo")}</div>
              <div className="wpab-wpoa-w-32 wpab-wpoa-text-right"></div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields-list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-min-h-[50px]"
                  >
                    {state.schema.length === 0 ? (
                      <div className="wpab-wpoa-text-center wpab-wpoa-px-5 wpab-wpoa-py-[60px] wpab-wpoa-text-[#999] wpab-wpoa-border-dashed wpab-wpoa-border-[#c3c4c7] wpab-wpoa-m-4 wpab-wpoa-rounded-lg">
                        <p className="wpab-wpoa-text-base wpab-wpoa-mb-2">
                          {__("Your group is empty", "optionbay-product-options-addons-woo")}
                        </p>
                        <p className="wpab-wpoa-text-[13px]">
                          {__(
                            "Click the field buttons in the sidebar to start building.",
                            "optionbay-product-options-addons-woo",
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
            <div className="wpab-wpoa-p-3 wpab-wpoa-bg-[#f6f7f7]">
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
                {__("Add field", "optionbay-product-options-addons-woo")}
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
