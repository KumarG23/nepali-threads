// src/collections/Products.ts
import type { CollectionConfig } from 'payload';
import lexicalEditor from '@payloadcms/richtext-lexical';

const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'basePrice', 'status', 'featured'],
    description: 'Manage your products here.',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => req.user?.collection === 'users',
    delete: ({ req }) => req.user?.collection === 'users',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ data, originalDoc }) => {
            if (data.name && (!originalDoc || data.name !== originalDoc.name)) {
              const slugify = (text: string) =>
                text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '');
              return { ...data, slug: slugify(data.name) };
            }
            return data;
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'richText',
      editor: lexicalEditor(),
      label: 'Description',
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Category',
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      min: 0,
      label: 'Price (USD)',
      admin: {
        description: 'Stored as integer cents.',
        components: {
          Field: '@/components/admin/MoneyField',
          Cell: '@/components/admin/MoneyField#MoneyCell',
        },
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Show on homepage',
      defaultValue: false,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
      defaultValue: 'draft',
    },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
      admin: {
        description: 'Drag to reorder. First photo is the main image.',
      },
    },
    {
      name: 'seo',
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: ['name', 'description', 'basePrice', 'category', 'images', 'featured', 'status'],
        },
        {
          label: 'SEO',
          description: 'Optional — leave blank if you\'re not sure',
          fields: ['seoTitle', 'seoDescription', 'seoImage'],
        },
      ],
    },
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'seoDescription',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'seoImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
  ],
};

export const ProductsCollection = Products;
export default Products;
