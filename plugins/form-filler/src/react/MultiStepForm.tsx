import React from 'react';
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

// ============================================================
// Types publics
// ============================================================

export interface FormFieldDef {
  /** Nom technique du champ (utilisé comme clé dans les valeurs) */
  name: string;
  /** Label affiché dans le formulaire */
  label: string;
  /** Type HTML du champ */
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  /** Options pour le type 'select' */
  options?: { value: string; label: string }[];
}

export interface FormStep {
  /** Identifiant unique de l'étape */
  id: string;
  /** Titre affiché dans la barre de progression */
  title: string;
  /** Liste des champs de cette étape */
  fields: FormFieldDef[];
}

export interface MultiStepFormProps {
  /**
   * Identifiant unique du formulaire sur la page.
   * Utilisé comme préfixe pour les tools IA :
   *   @domos-plugins/form-filler/{formId}/fill_fields
   *   @domos-plugins/form-filler/{formId}/next_step
   *   @domos-plugins/form-filler/{formId}/prev_step
   *   @domos-plugins/form-filler/{formId}/get_state
   */
  formId: string;
  /** Définition des étapes et de leurs champs */
  steps: FormStep[];
  /** Callback appelé quand le formulaire est soumis avec toutes les valeurs */
  onSubmit?: (values: Record<string, Record<string, string>>) => void;
  theme?: 'dark' | 'light';
  accentColor?: string;
}

// ============================================================
// Helpers internes
// ============================================================

function makeInitialValues(steps: FormStep[]): Record<string, Record<string, string>> {
  return Object.fromEntries(steps.map(s => [s.id, {}]));
}

// ============================================================
// MultiStepForm
// ============================================================

/**
 * MultiStepForm — formulaire multi-étapes piloté par l'IA.
 *
 * Au montage, enregistre 4 tools DomOS préfixés par formId :
 *   - fill_fields  : l'IA remplit des champs de l'étape courante
 *   - next_step    : l'IA avance à l'étape suivante
 *   - prev_step    : l'IA revient à l'étape précédente
 *   - get_state    : l'IA lit l'état courant (lecture seule, risk:'none')
 *
 * Les champs pré-remplis par l'IA affichent un badge "✨ IA" et
 * une bordure colorée. L'édition manuelle retire le badge.
 *
 * @example
 * ```tsx
 * const { MultiStepForm } = usePluginComponents<{
 *   MultiStepForm: typeof MultiStepForm
 * }>(FormFillerReactPlugin);
 *
 * <MultiStepForm
 *   formId="checkout"
 *   steps={[
 *     {
 *       id: 'contact',
 *       title: 'Contact',
 *       fields: [
 *         { name: 'email', label: 'Email', type: 'email', placeholder: 'alice@example.com', required: true },
 *         { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+33 6 12 34 56 78' },
 *       ],
 *     },
 *     {
 *       id: 'address',
 *       title: 'Adresse',
 *       fields: [
 *         { name: 'street', label: 'Rue', type: 'text', required: true },
 *         { name: 'city', label: 'Ville', type: 'text', required: true },
 *         { name: 'country', label: 'Pays', type: 'select', options: [
 *           { value: 'fr', label: 'France' },
 *           { value: 'be', label: 'Belgique' },
 *         ]},
 *       ],
 *     },
 *   ]}
 *   onSubmit={(values) => console.log('Soumis:', values)}
 * />
 * ```
 */
export function MultiStepForm({
  formId,
  steps,
  onSubmit,
  theme = 'dark',
  accentColor = '#7c3aed',
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [values, setValues] = React.useState<Record<string, Record<string, string>>>(
    () => makeInitialValues(steps),
  );
  const [aiFilledFields, setAiFilledFields] = React.useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = React.useState(false);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // ----------------------------------------------------------
  // Tool: fill_fields
  // Permet à l'IA de remplir des champs de l'étape COURANTE.
  // ----------------------------------------------------------
  useAgentTool(
    {
      name: `@domos-plugins/form-filler/${formId}/fill_fields`,
      description:
        `Pré-remplir des champs du formulaire "${formId}" à l'étape courante. ` +
        `Fournir un objet { nomChamp: valeur } pour les champs disponibles. ` +
        `Utilise get_state pour connaître les champs disponibles à l'étape courante.`,
      schema: z.object({
        fields: z
          .record(z.string())
          .describe(
            "Objet clé-valeur où chaque clé est un nom de champ et la valeur est la chaîne à insérer. " +
            "Exemple : { \"email\": \"alice@example.com\", \"phone\": \"+33612345678\" }",
          ),
      }),
      risk: 'low',
    },
    ({ fields }) => {
      const stepId = step.id;
      const knownNames = new Set(step.fields.map(f => f.name));
      const valid: Record<string, string> = {};
      const unknown: string[] = [];

      for (const [k, v] of Object.entries(fields)) {
        if (knownNames.has(k)) valid[k] = v;
        else unknown.push(k);
      }

      if (Object.keys(valid).length > 0) {
        setValues(prev => ({
          ...prev,
          [stepId]: { ...prev[stepId], ...valid },
        }));
        setAiFilledFields(prev => {
          const next = new Set(prev);
          Object.keys(valid).forEach(k => next.add(`${stepId}.${k}`));
          return next;
        });
      }

      return {
        success: true,
        stepId,
        filled: Object.keys(valid),
        ...(unknown.length > 0 && { ignored: unknown, warning: 'Champs inconnus à cette étape ignorés.' }),
        message: `${Object.keys(valid).length} champ(s) remplis à "${step.title}".`,
      };
    },
  );

  // ----------------------------------------------------------
  // Tool: next_step
  // ----------------------------------------------------------
  useAgentTool(
    {
      name: `@domos-plugins/form-filler/${formId}/next_step`,
      description:
        `Avancer à l'étape suivante du formulaire "${formId}". ` +
        `Retourne une erreur si l'utilisateur est déjà à la dernière étape.`,
      schema: z.object({}),
      risk: 'none',
    },
    () => {
      if (currentStep >= steps.length - 1) {
        return {
          success: false,
          message: `Déjà à la dernière étape "${step.title}" (${currentStep + 1}/${steps.length}).`,
        };
      }
      const nextStep = steps[currentStep + 1];
      setCurrentStep(s => s + 1);
      return {
        success: true,
        stepId: nextStep.id,
        stepTitle: nextStep.title,
        stepIndex: currentStep + 1,
        availableFields: nextStep.fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required ?? false,
        })),
        message: `Navigation vers l'étape "${nextStep.title}". ${nextStep.fields.length} champ(s) disponibles.`,
      };
    },
  );

  // ----------------------------------------------------------
  // Tool: prev_step
  // ----------------------------------------------------------
  useAgentTool(
    {
      name: `@domos-plugins/form-filler/${formId}/prev_step`,
      description:
        `Revenir à l'étape précédente du formulaire "${formId}". ` +
        `Retourne une erreur si déjà à la première étape.`,
      schema: z.object({}),
      risk: 'none',
    },
    () => {
      if (currentStep <= 0) {
        return {
          success: false,
          message: `Déjà à la première étape "${step.title}" (${currentStep + 1}/${steps.length}).`,
        };
      }
      const prevStep = steps[currentStep - 1];
      setCurrentStep(s => s - 1);
      return {
        success: true,
        stepId: prevStep.id,
        stepTitle: prevStep.title,
        stepIndex: currentStep - 1,
        message: `Retour à l'étape "${prevStep.title}".`,
      };
    },
  );

  // ----------------------------------------------------------
  // Tool: get_state  (lecture seule, risk:'none')
  // Donne à l'IA un snapshot complet : étape, champs, valeurs.
  // ----------------------------------------------------------
  useAgentTool(
    {
      name: `@domos-plugins/form-filler/${formId}/get_state`,
      description:
        `Lire l'état complet du formulaire "${formId}" : étape courante, ` +
        `champs disponibles et leur type, valeurs déjà remplies. ` +
        `Appeler avant fill_fields pour connaître les champs disponibles.`,
      schema: z.object({}),
      risk: 'none',
    },
    () => ({
      success: true,
      formId,
      currentStep: currentStep,
      currentStepId: step.id,
      currentStepTitle: step.title,
      totalSteps: steps.length,
      isFirst,
      isLast,
      availableFields: step.fields.map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        currentValue: values[step.id]?.[f.name] ?? '',
        ...(f.options && { options: f.options }),
      })),
      allValues: values,
    }),
  );

  // ----------------------------------------------------------
  // Handlers utilisateur
  // ----------------------------------------------------------
  const handleFieldChange = (stepId: string, fieldName: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [stepId]: { ...prev[stepId], [fieldName]: value },
    }));
    // L'édition manuelle retire le badge IA
    setAiFilledFields(prev => {
      const next = new Set(prev);
      next.delete(`${stepId}.${fieldName}`);
      return next;
    });
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep(s => s + 1);
    } else {
      setSubmitted(true);
      onSubmit?.(values);
    }
  };

  // ----------------------------------------------------------
  // Styles
  // ----------------------------------------------------------
  const isDark = theme === 'dark';

  const containerStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: isDark ? '#0f0f23' : '#ffffff',
    border: `1px solid ${isDark ? '#2a2a4a' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    color: isDark ? '#e2e8f0' : '#1a202c',
    boxSizing: 'border-box',
  };

  const progressOuter: React.CSSProperties = {
    height: '4px',
    background: isDark ? '#2a2a4a' : '#e2e8f0',
    borderRadius: '4px',
    marginBottom: '20px',
    overflow: 'hidden',
  };

  const progressInner: React.CSSProperties = {
    height: '100%',
    width: `${((currentStep + 1) / steps.length) * 100}%`,
    background: accentColor,
    borderRadius: '4px',
    transition: 'width 0.35s ease',
  };

  // Succès après soumission
  if (submitted) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Formulaire soumis !</div>
          <div style={{ fontSize: '13px', opacity: 0.6 }}>Toutes les étapes ont été complétées.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>

      {/* Indicateur d'étape + titre */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', opacity: 0.55, fontWeight: 500 }}>
          ÉTAPE {currentStep + 1} / {steps.length}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{step.title}</span>
      </div>

      {/* Barre de progression */}
      <div style={progressOuter}>
        <div style={progressInner} />
      </div>

      {/* Onglets des étapes — cliquables */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {steps.map((s, i) => {
          const isActive = i === currentStep;
          const isPast = i < currentStep;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 400,
                background: isActive
                  ? accentColor
                  : isPast
                  ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.08)')
                  : (isDark ? '#1a1a3e' : '#f1f5f9'),
                color: isActive ? '#fff' : isPast ? accentColor : (isDark ? '#9ca3af' : '#64748b'),
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isPast ? '✓ ' : `${i + 1}. `}{s.title}
            </button>
          );
        })}
      </div>

      {/* Champs de l'étape courante */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {step.fields.map(field => {
          const key = `${step.id}.${field.name}`;
          const isAiFilled = aiFilledFields.has(key);
          const fieldValue = values[step.id]?.[field.name] ?? '';

          const inputBase: React.CSSProperties = {
            width: '100%',
            padding: '9px 12px',
            borderRadius: '7px',
            border: `1.5px solid ${isAiFilled ? accentColor : isDark ? '#2a2a4a' : '#cbd5e1'}`,
            background: isAiFilled
              ? (isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.05)')
              : (isDark ? '#1a1a3e' : '#f8fafc'),
            color: isDark ? '#e2e8f0' : '#1a202c',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, background 0.2s',
            fontFamily: 'inherit',
          };

          return (
            <div key={field.name}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
              }}>
                {field.label}
                {field.required && (
                  <span style={{ color: '#ef4444', fontSize: '11px', lineHeight: 1 }}>*</span>
                )}
                {isAiFilled && (
                  <span style={{
                    fontSize: '11px',
                    background: accentColor,
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}>
                    ✨ IA
                  </span>
                )}
              </label>

              {field.type === 'select' ? (
                <select
                  value={fieldValue}
                  onChange={e => handleFieldChange(step.id, field.name, e.target.value)}
                  style={{ ...inputBase, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">— Choisir —</option>
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={fieldValue}
                  placeholder={field.placeholder}
                  rows={3}
                  onChange={e => handleFieldChange(step.id, field.name, e.target.value)}
                  style={{ ...inputBase, resize: 'vertical', minHeight: '80px' }}
                />
              ) : (
                <input
                  type={field.type}
                  value={fieldValue}
                  placeholder={field.placeholder}
                  onChange={e => handleFieldChange(step.id, field.name, e.target.value)}
                  style={inputBase}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={isFirst}
          style={{
            flex: 1,
            padding: '11px',
            borderRadius: '8px',
            border: `1.5px solid ${isDark ? '#2a2a4a' : '#e2e8f0'}`,
            background: 'transparent',
            color: isDark ? '#9ca3af' : '#64748b',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.35 : 1,
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'opacity 0.2s',
          }}
        >
          ← Précédent
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 2,
            padding: '11px',
            borderRadius: '8px',
            border: 'none',
            background: accentColor,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {isLast ? 'Soumettre ✓' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
