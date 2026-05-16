// LOCAL-LLM: DO NOT EDIT
import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "admin",
      options: [
        { label: "Super Admin", value: "super-admin" },
        { label: "Admin", value: "admin" },
        { label: "Viewer", value: "viewer" },
      ],
    },
  ],
};

export default Users;
