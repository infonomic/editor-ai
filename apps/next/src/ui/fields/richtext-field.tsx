import { defaultEditorConfig, EditorField, type EditorSettingsOverride } from '@infonomic/editor'
import type { SerializedEditorState } from 'lexical'

interface Props {
  field: {
    name: string
    label: string
    helpText?: string
    required?: boolean
  }
  readonly?: boolean
  className?: string
  instanceKey?: string
  value?: SerializedEditorState
  defaultValue?: SerializedEditorState
  editorSettings?: EditorSettingsOverride
  minHeight?: number | string
  maxHeight?: number | string
  onChange?: (value: SerializedEditorState) => void
  path?: string
}

export const RichTextField = ({
  field,
  value,
  defaultValue,
  editorSettings,
  readonly = false,
  instanceKey,
  onChange,
  path,
  className,
  minHeight,
  maxHeight,
}: Props) => {
  const _fieldPath = path ?? field.name
  // const fieldError = useFieldError(fieldPath)
  // const isDirty = useIsDirty(fieldPath)
  // const fieldValue = useFieldValue<any>(fieldPath)

  const editorConfig = editorSettings
    ? {
      ...defaultEditorConfig,
      settings: {
        ...defaultEditorConfig.settings,
        ...editorSettings,
        options: {
          ...defaultEditorConfig.settings.options,
          ...(editorSettings.options ?? {}),
        },
      },
    }
    : defaultEditorConfig

  const incomingValue = value // ?? fieldValue
  const incomingDefault = defaultValue
  return (
    <div className={className}>
      <EditorField
        onChange={onChange}
        editorConfig={editorConfig}
        id={instanceKey ? `${field.name}-${instanceKey}` : field.name}
        name={field.name}
        description={field.helpText}
        readonly={readonly}
        label={field.label}
        required={field.required}
        value={incomingValue}
        defaultValue={incomingDefault}
        minHeight={minHeight}
        maxHeight={maxHeight}
        // Ensure React fully remounts when instanceKey changes
        key={instanceKey ? `${field.name}-${instanceKey}` : field.name}
      />
    </div>
  )
}
