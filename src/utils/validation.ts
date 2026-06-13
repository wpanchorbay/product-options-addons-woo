import { z } from 'zod';
import { __ } from '@wordpress/i18n';

export const conditionRuleSchema = z
	.object({
		target_field_id: z
			.string()
			.min(1, { message: __('Target field is required', 'smart-product-options-addons') }),
		operator: z.string(),
		value: z.string().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.operator !== 'empty' && data.operator !== 'not_empty') {
			if (!data.value || data.value.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __('Value is required', 'smart-product-options-addons'),
					path: ['value'],
				});
			}
		}
	});

export const fieldConditionsSchema = z
	.object({
		status: z.enum(['active', 'inactive']),
		action: z.enum(['show', 'hide']),
		match: z.enum(['ALL', 'ANY']),
		rules: z.array(conditionRuleSchema),
	})
	.superRefine((data, ctx) => {
		if (data.status === 'active' && data.rules.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __(
					'At least one rule is required when logic is active',
					'smart-product-options-addons'
				),
				path: ['rules'],
			});
		}
	});

export const fieldOptionSchema = z
	.object({
		label: z
			.string()
			.min(1, { message: __("Choice label is required", "smart-product-options-addons") }),
		value: z
			.string()
			.min(1, { message: __("Choice value is required", "smart-product-options-addons") }),
		price_type: z.string().optional(),
		price: z.number().optional(),
		formula: z.string().optional(),
		weight: z.number().optional(),
		enable_stock: z.boolean().optional(),
		inventory_id: z.union([z.number(), z.string()]).nullable().optional(),
		reduction_mode: z.string().optional(),
		reduction_formula: z.string().optional(),
		color: z.string().optional(),
		image_url: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.price_type && data.price_type !== "none" && data.price_type !== "") {
			if (data.price_type !== "formula") {
				if (data.price === undefined || data.price === null || data.price === 0) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: __("Price is required", "smart-product-options-addons"),
						path: ["price"],
					});
				}
			}
			if (data.price_type === "formula" && !data.formula) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("Formula is required", "smart-product-options-addons"),
					path: ["formula"],
				});
			}
		}

		if (data.enable_stock && !data.inventory_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Inventory pool is required", "smart-product-options-addons"),
				path: ["inventory_id"],
			});
		}

		if (data.reduction_mode === "formula" && !data.reduction_formula) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Reduction formula is required", "smart-product-options-addons"),
				path: ["reduction_formula"],
			});
		}
	});

export const fieldDefinitionSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		label: z.string().min(1, {
			message: __("Field label is required", "smart-product-options-addons"),
		}),
		description: z.string().optional(),
		placeholder: z.string().optional(),
		required: z.boolean(),
		class_name: z.string().optional(),
		content: z.string().optional(),
		price_type: z.string().optional(),
		price: z.number().optional(),
		formula: z.string().optional(),
		weight: z.number().optional(),
		options: z.array(fieldOptionSchema).optional(),
		min_length: z.number().optional(),
		max_length: z.number().optional(),
		min_value: z.number().optional(),
		max_value: z.number().optional(),
		step: z.number().optional(),
		allowed_types: z.string().optional(),
		max_file_size: z.number().optional(),
		enable_stock: z.boolean().optional(),
		inventory_id: z.union([z.number(), z.string()]).nullable().optional(),
		reduction_mode: z.string().optional(),
		reduction_formula: z.string().optional(),
		conditions: fieldConditionsSchema,
	})
	.superRefine((data, ctx) => {
		// 1. Check options for choice types
		if (["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type)) {
			if (!data.options || data.options.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("At least one choice is required", "smart-product-options-addons"),
					path: ["options"],
				});
			}
		}

		// 2. Check price if price_type is set
		const isChoiceType = ["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type);

		if (!isChoiceType && data.price_type && data.price_type !== "none" && data.price_type !== "") {
			if (data.price_type !== "formula") {
				if (data.price === undefined || data.price === null || data.price === 0) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: __("Price is required", "smart-product-options-addons"),
						path: ["price"],
					});
				}
			}
			if (data.price_type === "formula" && !data.formula) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("Formula is required", "smart-product-options-addons"),
					path: ["formula"],
				});
			}
		}

		// 2.1 Check options for specific swatch types
		if (data.type === "color_swatch" && data.options) {
			data.options.forEach((opt, idx) => {
				if (!opt.color) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: __("Color is required for swatch choices", "smart-product-options-addons"),
						path: ["options", idx, "color"],
					});
				}
			});
		}

		if (data.type === "image_swatch" && data.options) {
			data.options.forEach((opt, idx) => {
				if (!opt.image_url) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: __("Image is required for swatch choices", "smart-product-options-addons"),
						path: ["options", idx, "image_url"],
					});
				}
			});
		}

		// 3. Static content check
		if (data.type === "static_content" && !data.content) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Content is required for static fields", "smart-product-options-addons"),
				path: ["content"],
			});
		}

		// 4. Inventory check
		if (data.enable_stock && !data.inventory_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Inventory pool is required", "smart-product-options-addons"),
				path: ["inventory_id"],
			});
		}

		// 5. Reduction formula check
		if (data.reduction_mode === "formula" && !data.reduction_formula) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Reduction formula is required", "smart-product-options-addons"),
				path: ["reduction_formula"],
			});
		}

		// 6. If any option has stock tracking enabled, the field itself cannot have stock tracking enabled
		const fieldHasOptions = ["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type);
		const optionsHaveStock = fieldHasOptions && data.options?.some((opt) => opt.enable_stock);
		if (optionsHaveStock && data.enable_stock) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Field stock tracking cannot be enabled when individual choice stock tracking is enabled", "smart-product-options-addons"),
				path: ["enable_stock"],
			});
		}
	});

export const assignmentSchema = z.object({
	target_type: z.enum(['global', 'product', 'category', 'tag']),
	target_id: z.number(),
	is_exclusion: z.boolean(),
});

export const addonGroupSchema = z
	.object({
		title: z
			.string()
			.min(1, { message: __('Group Title is required', 'smart-product-options-addons') }),
		status: z.enum(['publish', 'draft']),
		schema: z.array(fieldDefinitionSchema),
		assignments: z.array(assignmentSchema),
		new_inventories: z
			.array(
				z.object({
					tmp_id: z.string(),
					name: z.string().min(1),
					stock_count: z.number(),
					allow_backorders: z.boolean(),
				})
			)
			.optional(),
	})
	.superRefine((data, ctx) => {
		const hasGlobal = data.assignments.some((a) => a.target_type === 'global');
		const hasInclusion = data.assignments.some((a) => !a.is_exclusion && a.target_type !== 'global');

		if (!hasGlobal && !hasInclusion) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __('At least one target (product, category, or tag) is required for targeted visibility.', 'smart-product-options-addons'),
				path: ['assignments'],
			});
		}
	});
