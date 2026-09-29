import type { ToolInputField } from "@/types/tool";

/**
 * One form field, driven by `field.type` (`Tool.inputSchema[i].type`).
 *
 * No `"use client"` directive: a plain function of its props, only ever
 * rendered inside `ToolRunner.tsx`'s client boundary — see that file's
 * header comment.
 */
export function ToolField({
  field,
  value,
  onChange,
}: {
  field: ToolInputField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <select id={field.key} value={value} onChange={(e) => onChange(e.target.value)} required={field.required}>
        <option value="">Select an option</option>
        {(field.options ?? []).map((option, index) => (
          <option key={`${index}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        rows={4}
      />
    );
  }
  return (
    <input
      id={field.key}
      type={field.type}
      placeholder={field.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}
