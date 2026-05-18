// src/collections/ProductVariants.ts
import type { CollectionConfig } from 'payload';
import MoneyField from '@/components/admin/MoneyField';

const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  admin: {
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'product', 'size', 'color', 'inventoryCount', 'price'],
  },
  access: {
    read: () => true,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    {
      name: 'size',
      type: 'text',
      label: 'Size',
      description: 'e.g. S, M, L, XL — leave blank if this variant isn\'t size-specific.',
      required: false,
    },
    {
      name: 'color',
      type: 'text',
      label: 'Color',
      required: false,
    },
    {
      name: 'sku',
      type: 'text',
      label: 'SKU',
      description: 'Inventory code for this specific variant.',
      unique: true,
      index: true,
      required: true,
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price override (USD)',
      description:
        'Optional. If set, this overrides the product\'s base price for this variant. Stored as integer cents.',
      min: 0,
      admin: {
        components: {
          Field: MoneyField,
          Cell: `${MoneyField}#MoneyCell`,
        },
      },
      required: false,
    },
    {
      name: 'inventoryCount',
      type: 'number',
      label: 'Inventory',
      description: 'How many of this variant we have on hand.',
      min: 0,
      defaultValue: 0,
      required: true,
    },
    {
      name: 'images',
      type: 'array',
      label: 'Images',
      description:
        'Optional. Falls back to the product\'s main photos if blank.',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
};

export const ProductVariantsCollection = ProductVariants;
export default ProductVariants;
