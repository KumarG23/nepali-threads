// src/collections/Categories.ts
import { CollectionConfig } from 'payload/types';
import slugify from 'slugify';

const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Category',
    plural: 'Categories',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent'],
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
        readOnly: false,
        description: 'Auto-fills from the name. Only edit if you know what you\'re doing.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Simple text for category copy.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Hero image',
      admin: {
        description: 'Shown at the top of the category page.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: ['categories'],
      required: false,
      label: 'Parent category',
      admin: {
        description: 'Leave blank for top-level categories. Pick a parent to nest this one under it.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.slug && data.name) {
          data.slug = slugify(data.name, { lower: true });
        }
        return data;
      },
    ],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => req.user?.collection === 'users',
    delete: ({ req }) => req.user?.collection === 'users',
  },
};

export default Categories;
