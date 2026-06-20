import { z } from 'zod';
import { __ } from '@wordpress/i18n';

export const conditionRuleSchema = z
	.object({
		target_field_id: z
			.string()
			.min(1, { message: __('Target field is required', 'optionbay-product-options-addons-woo') }),
		operator: z.string(),
		value: z.string().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.operator !== 'empty' && data.operator !== 'not_empty') {
			if (!data.value || data.value.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __('Value is required', 'optionbay-product-options-addons-woo'),
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
					'optionbay-product-options-addons-woo'
				),
				path: ['rules'],
			});
		}
	});

export const fieldOptionSchema = z
	.object({
		label: z
			.string()
			.min(1, { message: __("Choice label is required", "optionbay-product-options-addons-woo") }),
		value: z
			.string()
			.min(1, { message: __("Choice value is required", "optionbay-product-options-addons-woo") }),
		price_type: z.string().optional(),
		price: z.number().optional(),
		weight: z.number().optional(),
		enable_stock: z.boolean().optional(),
		inventory_id: z.union([z.number(), z.string()]).nullable().optional(),
		reduction_mode: z.string().optional(),
		color: z.string().optional(),
		image_url: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.price_type && data.price_type !== "none" && data.price_type !== "") {
			if (data.price === undefined || data.price === null || data.price === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("Price is required", "optionbay-product-options-addons-woo"),
					path: ["price"],
				});
			}
		}

		if (data.enable_stock && !data.inventory_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Inventory pool is required", "optionbay-product-options-addons-woo"),
				path: ["inventory_id"],
			});
		}
	});

export const fieldDefinitionSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		label: z.string().min(1, {
			message: __("Field label is required", "optionbay-product-options-addons-woo"),
		}),
		description: z.string().optional(),
		placeholder: z.string().optional(),
		required: z.boolean(),
		class_name: z.string().optional(),
		content: z.string().optional(),
		price_type: z.string().optional(),
		price: z.number().optional(),
		weight: z.number().optional(),
		options: z.array(fieldOptionSchema).optional(),
		min_length: z.number().optional(),
		max_length: z.number().optional(),
		min_value: z.number().optional(),
		max_value: z.number().optional(),
		step: z.number().optional(),
		enable_stock: z.boolean().optional(),
		inventory_id: z.union([z.number(), z.string()]).nullable().optional(),
		reduction_mode: z.string().optional(),
		conditions: fieldConditionsSchema,
	})
	.superRefine((data, ctx) => {
		// 1. Check options for choice types
		if (["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type)) {
			if (!data.options || data.options.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("At least one choice is required", "optionbay-product-options-addons-woo"),
					path: ["options"],
				});
			}
		}

		// 2. Check price if price_type is set
		const isChoiceType = ["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type);

		if (!isChoiceType && data.price_type && data.price_type !== "none" && data.price_type !== "") {
			if (data.price === undefined || data.price === null || data.price === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: __("Price is required", "optionbay-product-options-addons-woo"),
					path: ["price"],
				});
			}
		}

		// 2.1 Check options for specific swatch types
		if (data.type === "color_swatch" && data.options) {
			data.options.forEach((opt, idx) => {
				if (!opt.color) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: __("Color is required for swatch choices", "optionbay-product-options-addons-woo"),
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
						message: __("Image is required for swatch choices", "optionbay-product-options-addons-woo"),
						path: ["options", idx, "image_url"],
					});
				}
			});
		}

		// 3. Static content check
		if (data.type === "static_content" && !data.content) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Content is required for static fields", "optionbay-product-options-addons-woo"),
				path: ["content"],
			});
		}

		// 4. Inventory check
		if (data.enable_stock && !data.inventory_id) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Inventory pool is required", "optionbay-product-options-addons-woo"),
				path: ["inventory_id"],
			});
		}

		// 5. If any option has stock tracking enabled, the field itself cannot have stock tracking enabled
		const fieldHasOptions = ["select", "radio", "checkbox", "color_swatch", "image_swatch"].includes(data.type);
		const optionsHaveStock = fieldHasOptions && data.options?.some((opt) => opt.enable_stock);
		if (optionsHaveStock && data.enable_stock) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __("Field stock tracking cannot be enabled when individual choice stock tracking is enabled", "optionbay-product-options-addons-woo"),
				path: ["enable_stock"],
			});
		}
	});

export const assignmentSchema = z.object({
	target_type: z.enum(['global', 'product']),
	target_id: z.number(),
});

export const addonGroupSchema = z
	.object({
		title: z
			.string()
			.min(1, { message: __('Group Title is required', 'optionbay-product-options-addons-woo') }),
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
		const hasProduct = data.assignments.some((a) => a.target_type === 'product');

		if (!hasGlobal && !hasProduct) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: __('At least one target (global or product) is required for targeted visibility.', 'optionbay-product-options-addons-woo'),
				path: ['assignments'],
			});
		}
	});
