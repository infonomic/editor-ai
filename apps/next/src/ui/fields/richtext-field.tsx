import { defaultEditorConfig, EditorField } from '@infonomic/editor'

interface Props {
  field: {
    name: string
    label: string
    helpText?: string
    required?: boolean
  }
  readonly?: boolean
  instanceKey?: string
  value?: any
  defaultValue?: any
  editorConfig?: any
  onChange?: (value: any) => void
  path?: string
}

export const RichTextField = ({
  field,
  value,
  defaultValue,
  editorConfig,
  readonly = false,
  instanceKey,
  onChange,
  path,
}: Props) => {
  const fieldPath = path ?? field.name
  // const fieldError = useFieldError(fieldPath)
  // const isDirty = useIsDirty(fieldPath)
  // const fieldValue = useFieldValue<any>(fieldPath)
  const incomingValue = value // ?? fieldValue
  const incomingDefault = defaultValue
  return (
    <div className="flex flex-1 h-full">
      <EditorField
        onChange={onChange}
        editorConfig={editorConfig || defaultEditorConfig}
        id={instanceKey ? `${field.name}-${instanceKey}` : field.name}
        name={field.name}
        description={field.helpText}
        readonly={readonly}
        label={field.label}
        required={field.required}
        value={incomingValue}
        defaultValue={incomingDefault}
        // Ensure React fully remounts when instanceKey changes
        key={instanceKey ? `${field.name}-${instanceKey}` : field.name}
      />
    </div>
  )
}
