import React from "react";
import { __ } from "@wordpress/i18n";
import {
  ClassicCheckbox,
  ClassicSelect,
  ClassicInput,
  ClassicButton,
} from "../classics";
import { useAddonContext, FieldDefinition } from "../../store/AddonContext";
import { FormError } from "./FormError";
import { CirclePlus, Trash2 } from "lucide-react";

interface ConditionEditorProps {
  field: FieldDefinition;
  index: number;
  hideLabel?: boolean;
}

export const ConditionEditor: React.FC<ConditionEditorProps> = ({
  field,
  index,
  hideLabel = false,
}) => {
  const { state, dispatch } = useAddonContext();
  const siblingFields = state.schema.filter((f) => f.id !== field.id);
  const conditions = field.conditions;

  console.log('ConditionEditor for field:', field.id, 'label:', field.label);
  console.log('Total schema fields:', state.schema.length);
  console.log('Sibling fields:', siblingFields.length);

  const updateConditions = (updates: Partial<typeof conditions>) => {
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        id: field.id,
        updates: { conditions: { ...conditions, ...updates } },
      },
    });
  };

  if (siblingFields.length === 0) {
    return (
      <p
        className={`spoa-text-[#666] spoa-italic ${
          !hideLabel ? "spoa-mt-4" : ""
        }`}
      >
        {__("Add more fields to set up conditional logic.", "smart-product-options-addons")}
      </p>
    );
  }

  return (
    <div className="">
      <div className="spoa-flex spoa-justify-between spoa-items-center">
        <ClassicCheckbox
          label={__("Enable Conditional Logic", "smart-product-options-addons")}
          checked={conditions.status === "active"}
          onChange={(checked) =>
            updateConditions({
              status: checked ? "active" : "inactive",
            })
          }
        />
        {conditions.status === "active" && (
          <ClassicButton
            variant="secondary"
            onClick={() => {
              const rules = [
                ...(conditions.rules || []),
                {
                  target_field_id: "",
                  operator: "==",
                  value: "",
                },
              ];
              updateConditions({ rules });
            }}
          >
            <CirclePlus className="spoa-size-4" />{" "}
            {__("Add Rule", "smart-product-options-addons")}
          </ClassicButton>
        )}
      </div>

      {conditions.status === "active" && (
        <div className="spoa-mt-4 spoa-space-y-4">
          <div className="spoa-flex spoa-gap-2 spoa-items-center spoa-text-[13px]">
            <ClassicSelect
              value={conditions.action}
              classNames={{
                innerContainer: "!spoa-w-[85px]",
              }}
              onChange={(val) =>
                updateConditions({
                  action: val as "show" | "hide",
                })
              }
              options={[
                {
                  value: "show",
                  label: __("Show", "smart-product-options-addons"),
                },
                {
                  value: "hide",
                  label: __("Hide", "smart-product-options-addons"),
                },
              ]}
            />
            <span>{__("this field if", "smart-product-options-addons")}</span>
            <ClassicSelect
              value={conditions.match}
              classNames={{
                innerContainer: "!spoa-w-[85px]",
              }}
              onChange={(val) =>
                updateConditions({
                  match: val as "ALL" | "ANY",
                })
              }
              options={[
                {
                  value: "ALL",
                  label: __("ALL", "smart-product-options-addons"),
                },
                {
                  value: "ANY",
                  label: __("ANY", "smart-product-options-addons"),
                },
              ]}
            />
            <span>{__("of these rules match:", "smart-product-options-addons")}</span>
          </div>

          <div className="spoa-border spoa-border-[#c3c4c7] spoa-rounded-[12px] spoa-overflow-hidden spoa-bg-white spoa-condition-rules-table">
            <div className="spoa-w-0 spoa-min-w-full spoa-overflow-x-auto">
              <table
                className="spoa-w-full spoa-text-left spoa-text-[13px]"
                style={{ minWidth: "500px" }}
              >
                <thead>
                  <tr className="spoa-border-b spoa-border-[#c3c4c7]">
                    <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327]">
                      {__("Field", "smart-product-options-addons")}
                    </th>
                    <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327] spoa-w-[150px]">
                      {__("Operator", "smart-product-options-addons")}
                    </th>
                    <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-font-semibold spoa-text-[#1d2327]">
                      {__("Value", "smart-product-options-addons")}
                    </th>
                    <th className="!spoa-py-[10px] !spoa-px-[12px] spoa-w-[40px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {conditions.rules && conditions.rules.length > 0 ? (
                    conditions.rules.map((rule, idx) => {
                      const targetField = siblingFields.find(
                        (f) => f.id === rule.target_field_id,
                      );
                      const ruleType = targetField?.type || "text";

                      const operatorOptions = [
                        {
                          value: "==",
                          label: __("equals", "smart-product-options-addons"),
                        },
                        {
                          value: "!=",
                          label: __("not equals", "smart-product-options-addons"),
                        },
                      ];

                      // Operators for scalar fields that support math or partial matching
                      if (
                        ["number", "text", "textarea"].includes(ruleType) ||
                        typeof targetField === "undefined"
                      ) {
                        if (ruleType === "number") {
                          operatorOptions.push(
                            {
                              value: ">",
                              label: __("greater than", "smart-product-options-addons"),
                            },
                            {
                              value: "<",
                              label: __("less than", "smart-product-options-addons"),
                            },
                            {
                              value: ">=",
                              label: __("greater than or equals", "smart-product-options-addons"),
                            },
                            {
                              value: "<=",
                              label: __("less than or equals", "smart-product-options-addons"),
                            },
                          );
                        } else {
                          operatorOptions.push(
                            {
                              value: "contains",
                              label: __("contains", "smart-product-options-addons"),
                            },
                            {
                              value: "not_contains",
                              label: __("not contains", "smart-product-options-addons"),
                            },
                          );
                        }
                      } else if (
                        ["select", "radio", "checkbox"].includes(ruleType)
                      ) {
                        operatorOptions.push(
                          {
                            value: "contains",
                            label: __("contains", "smart-product-options-addons"),
                          },
                          {
                            value: "not_contains",
                            label: __("not contains", "smart-product-options-addons"),
                          },
                        );
                      }

                      // Add empty/not_empty to all types
                      operatorOptions.push(
                        {
                          value: "empty",
                          label: __("is empty", "smart-product-options-addons"),
                        },
                        {
                          value: "not_empty",
                          label: __("is not empty", "smart-product-options-addons"),
                        },
                      );

                      return (
                        <tr
                          key={idx}
                          className="spoa-border-b spoa-border-[#c3c4c7] last:spoa-border-none"
                        >
                          <td className="spoa-py-2 spoa-px-3">
                            <ClassicSelect
                              value={rule.target_field_id}
                              differentDropdownWidth
                              isError={
                                !!state.errors?.[
                                  `schema.${index}.conditions.rules.${idx}.target_field_id`
                                ]
                              }
                              onChange={(val) => {
                                const rules = [...(conditions.rules || [])];
                                rules[idx] = {
                                  ...rules[idx],
                                  target_field_id: String(val),
                                  // Reset operator and value when field changes
                                  operator: "==",
                                  value: "",
                                };
                                updateConditions({ rules });
                              }}
                              options={[
                                {
                                  value: "",
                                  label: __("Select field…", "smart-product-options-addons"),
                                },
                                ...siblingFields.map((sf) => ({
                                  value: sf.id,
                                  label: sf.label || sf.id,
                                })),
                              ]}
                            />
                            <FormError
                              message={
                                state.errors?.[
                                  `schema.${index}.conditions.rules.${idx}.target_field_id`
                                ]
                              }
                            />
                          </td>
                          <td className="spoa-py-2 spoa-px-3">
                            <ClassicSelect
                              differentDropdownWidth
                              value={rule.operator}
                              isError={
                                !!state.errors?.[
                                  `schema.${index}.conditions.rules.${idx}.operator`
                                ]
                              }
                              onChange={(val) => {
                                const rules = [...(conditions.rules || [])];
                                rules[idx] = {
                                  ...rules[idx],
                                  operator: String(val),
                                };
                                updateConditions({ rules });
                              }}
                              options={operatorOptions}
                            />
                            <FormError
                              message={
                                state.errors?.[
                                  `schema.${index}.conditions.rules.${idx}.operator`
                                ]
                              }
                            />
                          </td>
                          <td className="spoa-py-2 spoa-px-3">
                            {!["empty", "not_empty"].includes(rule.operator) &&
                              targetField && (
                                <>
                                  {targetField.type === "single_checkbox" ? (
                                    <ClassicSelect
                                      value={rule.value}
                                      differentDropdownWidth
                                      isError={
                                        !!state.errors?.[
                                          `schema.${index}.conditions.rules.${idx}.value`
                                        ]
                                      }
                                      onChange={(val) => {
                                        const rules = [
                                          ...(conditions.rules || []),
                                        ];
                                        rules[idx] = {
                                          ...rules[idx],
                                          value: String(val),
                                        };
                                        updateConditions({
                                          rules,
                                        });
                                      }}
                                      options={[
                                        {
                                          value: "1",
                                          label: __("Checked", "smart-product-options-addons"),
                                        },
                                        {
                                          value: "",
                                          label: __("Unchecked", "smart-product-options-addons"),
                                        },
                                      ]}
                                    />
                                  ) : (targetField.type === "select" ||
                                      targetField.type === "radio" ||
                                      targetField.type === "checkbox") &&
                                    targetField.options &&
                                    targetField.options.length > 0 ? (
                                    <ClassicSelect
                                      value={rule.value}
                                      differentDropdownWidth
                                      isError={
                                        !!state.errors?.[
                                          `schema.${index}.conditions.rules.${idx}.value`
                                        ]
                                      }
                                      onChange={(val) => {
                                        const rules = [
                                          ...(conditions.rules || []),
                                        ];
                                        rules[idx] = {
                                          ...rules[idx],
                                          value: String(val),
                                        };
                                        updateConditions({
                                          rules,
                                        });
                                      }}
                                      options={[
                                        {
                                          value: "",
                                          label: __(
                                            "Select option…",
                                            "smart-product-options-addons",
                                          ),
                                        },
                                        ...targetField.options.map((opt) => ({
                                          value: opt.value,
                                          label: opt.label || opt.value,
                                        })),
                                      ]}
                                    />
                                  ) : (
                                    <ClassicInput
                                      size="regular"
                                      value={rule.value}
                                      isError={
                                        !!state.errors?.[
                                          `schema.${index}.conditions.rules.${idx}.value`
                                        ]
                                      }
                                      onChange={(e) => {
                                        const rules = [
                                          ...(conditions.rules || []),
                                        ];
                                        rules[idx] = {
                                          ...rules[idx],
                                          value: e.target.value,
                                        };
                                        updateConditions({
                                          rules,
                                        });
                                      }}
                                      placeholder={__("Value", "smart-product-options-addons")}
                                    />
                                  )}
                                  <FormError
                                    message={
                                      state.errors?.[
                                        `schema.${index}.conditions.rules.${idx}.value`
                                      ]
                                    }
                                  />
                                </>
                              )}
                          </td>
                          <td className="spoa-py-2">
                            <button
                              type="button"
                              onClick={() => {
                                const rules = (conditions.rules || []).filter(
                                  (_, i) => i !== idx,
                                );
                                updateConditions({ rules });
                              }}
                              className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-1 spoa-text-[#d63638] hover:spoa-text-[#b32d2e] spoa-transition-colors"
                              title={__("Remove rule", "smart-product-options-addons")}
                            >
                              <Trash2 className="spoa-size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="spoa-py-6 spoa-text-center spoa-text-[#94a3b8] spoa-italic"
                      >
                        {__("No rules added yet.", "smart-product-options-addons")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
