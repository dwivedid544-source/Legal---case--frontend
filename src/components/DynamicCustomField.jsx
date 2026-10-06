import React from 'react';
import { Field, Input, Select } from './UI.jsx';

/**
 * Dynamic Metadata-Driven Custom Field Renderer
 * Renders supported field types (text, textarea, number, currency, date, email, phone, dropdown, checkbox, toggle, country, etc.)
 */
export function DynamicCustomField({ field, value, onChange, disabled }) {
  if (!field) return null;

  const val = value !== undefined ? value : (field.defaultValue || '');

  switch (field.type) {
    case 'textarea':
    case 'richtext':
      return (
        <Field label={field.label} required={field.required}>
          <textarea
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={disabled || field.readOnly}
            required={field.required}
            className="form-input w-full min-h-[80px] text-xs font-medium custom-scrollbar"
          />
        </Field>
      );

    case 'dropdown':
    case 'select':
      return (
        <Field label={field.label} required={field.required}>
          <Select
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            disabled={disabled || field.readOnly}
            required={field.required}
          >
            <option value="">{field.placeholder || 'Select option...'}</option>
            {field.options && field.options.map(opt => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </Select>
        </Field>
      );

    case 'checkbox':
    case 'toggle':
      return (
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all">
            <input
              type="checkbox"
              name={field.name}
              checked={Boolean(val)}
              onChange={e => onChange?.(field.name, e.target.checked)}
              disabled={disabled || field.readOnly}
              className="rounded bg-white/10 border-white/20 text-[#0057c7] focus:ring-0 w-4 h-4"
            />
            <span className="text-xs font-bold text-white">{field.label}</span>
          </label>
        </div>
      );

    case 'number':
    case 'currency':
      return (
        <Field label={field.label} required={field.required}>
          <Input
            type="number"
            step={field.type === 'currency' ? '0.01' : '1'}
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            placeholder={field.placeholder || (field.type === 'currency' ? '$0.00' : '0')}
            disabled={disabled || field.readOnly}
            required={field.required}
          />
        </Field>
      );

    case 'date':
    case 'time':
    case 'datetime':
      return (
        <Field label={field.label} required={field.required}>
          <Input
            type={field.type === 'datetime' ? 'datetime-local' : field.type}
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            disabled={disabled || field.readOnly}
            required={field.required}
          />
        </Field>
      );

    case 'country':
      return (
        <Field label={field.label} required={field.required}>
          <Select
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            disabled={disabled || field.readOnly}
            required={field.required}
          >
            <option value="">Select Country...</option>
            <option value="United States">United States</option>
            <option value="Mexico">Mexico</option>
            <option value="India">India</option>
            <option value="Canada">Canada</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="China">China</option>
            <option value="Other">Other</option>
          </Select>
        </Field>
      );

    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    default:
      return (
        <Field label={field.label} required={field.required}>
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            name={field.name}
            value={val}
            onChange={e => onChange?.(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={disabled || field.readOnly}
            required={field.required}
          />
        </Field>
      );
  }
}

/**
 * Dynamic Custom Field Group Renderer
 */
export function DynamicCustomFieldGroup({ groupName, fields = [], values = {}, onChange }) {
  if (!fields.length) return null;

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 my-3">
      <h4 className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
        <span>⚙️ {groupName}</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(field => (
          <DynamicCustomField
            key={field.id}
            field={field}
            value={values[field.name]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
