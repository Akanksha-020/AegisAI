import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { classificationApi } from '../services/api'
import {
  AlertTriangle,
  BarChart2,
  CheckCircle,
  ClipboardList,
  Info,
  type LucideIcon,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import ComplianceChecklist, {
  ChecklistItem,
} from '../components/ComplianceChecklist'
import CopyButton from '../components/CopyButton'
import Skeleton from '../components/Skeleton'

type Tab = 'questionnaire' | 'results' | 'requirements'
type RiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable'

interface ClassificationResult {
  risk_level: string
  confidence: number
  reasoning?: string
  reasons: string[]
  requirements: string[]
  next_steps: string[]
}

interface RequirementContent {
  title: string
  description: string
  obligations: string[]
}

function buildClassificationReport(result: ClassificationResult): string {
  return [
    `Risk Level: ${result.risk_level}`,
    `Confidence: ${Math.round(result.confidence * 100)}%`,
    '',
    'Reasoning',
    result.reasoning || result.reasons.join('\n'),
    '',
    'Legal Requirements',
    ...result.requirements.map((req, index) => `${index + 1}. ${req}`),
    '',
    'Action Plan',
    ...result.next_steps.map((step, index) => `${index + 1}. ${step}`),
  ].join('\n')
}

const CHECKLIST_ITEMS: Record<string, ChecklistItem[]> = {
  high: [
    {
      id: 'tech-doc',
      label: 'Create Technical Documentation',
      article: 'Article 11',
      required: true,
    },
    {
      id: 'risk-assessment',
      label: 'Conduct Risk Assessment',
      article: 'Article 9',
      required: true,
    },
    {
      id: 'human-oversight',
      label: 'Establish Human Oversight',
      article: 'Article 14',
      required: true,
    },
    {
      id: 'conformity',
      label: 'EU Declaration of Conformity',
      article: 'Article 47',
      required: true,
    },
    {
      id: 'logging',
      label: 'Implement automatic logging',
      article: 'Article 12',
      required: true,
    },
  ],
  limited: [
    {
      id: 'transparency',
      label: 'Disclose AI interaction to users',
      article: 'Article 52',
      required: true,
    },
  ],
  minimal: [
    {
      id: 'best-practice',
      label: 'Follow voluntary AI best practices',
      required: false,
    },
  ],
  unacceptable: [],
}

const requirementContent: Record<string, RequirementContent> = {
  unacceptable: {
    title: 'Unacceptable Risk',
    description: 'This AI system is prohibited under Article 5 of the EU AI Act.',
    obligations: [
      'Cease deployment and operation of the AI system.',
      'Preserve records relating to design, deployment, use, and classification.',
      'Consult legal counsel before any further development or redeployment.',
    ],
  },
  high: {
    title: 'High Risk',
    description:
      'This AI system must meet the EU AI Act requirements for high-risk systems before being placed on the market or put into service.',
    obligations: [
      'Implement a quality management system (Art. 17).',
      'Prepare technical documentation (Art. 11 and Annex IV).',
      'Complete the applicable conformity assessment (Art. 43).',
      'Establish and maintain a risk management system (Art. 9).',
      'Apply data governance and data management practices (Art. 10).',
      'Provide transparency information and instructions for use (Art. 13).',
      'Enable effective human oversight (Art. 14).',
      'Ensure accuracy, robustness, and cybersecurity (Art. 15).',
      'Register the system in the EU database where required (Art. 49).',
      'Apply CE marking before placing the system on the market (Art. 48).',
      'Operate post-market monitoring (Art. 72).',
      'Report serious incidents as required (Art. 73).',
    ],
  },
  limited: {
    title: 'Limited Risk',
    description:
      'This AI system is subject to transparency obligations under Article 50 of the EU AI Act.',
    obligations: [
      'Disclose AI interaction to users (Art. 50(1)).',
      'Label AI-generated or manipulated content (Art. 50(4)).',
      'Inform persons exposed to emotion-recognition systems (Art. 50(3)).',
    ],
  },
  minimal: {
    title: 'Minimal Risk',
    description:
      'This AI system has no mandatory EU AI Act obligations based on the current classification.',
    obligations: [
      'No mandatory obligations apply.',
      'Document the classification reasoning.',
      'Re-evaluate the classification if the system scope or intended use changes.',
    ],
  },
}

export default function Classification() {
  const { systemId } = useParams()
  const [activeTab, setActiveTab] = useState<Tab>('questionnaire')
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [formData, setFormData] = useState({
    use_case_category: 'hr_recruitment',
    is_safety_component: false,
    affects_fundamental_rights: true,
    uses_biometric_data: false,
    makes_automated_decisions: true,
    hr_recruitment_screening: true,
    hr_promotion_termination: false,
    credit_worthiness: false,
    insurance_risk_assessment: false,
    law_enforcement: false,
    border_control: false,
    justice_system: false,
    interacts_with_humans: true,
    generates_synthetic_content: false,
    emotion_recognition: false,
    biometric_categorization: false,
    education_vocational_training: false,
  })

  const classifyMutation = useMutation({
    mutationFn: () => {
      if (systemId) {
        return classificationApi.classifyAndSave(parseInt(systemId), formData)
      }
      return classificationApi.classify(formData)
    },
    onSuccess: (data) => {
      setResult(data)
      setActiveTab('results')
    },
  })

  // Derive a live preliminary risk level from formData so the panel
  // updates in real-time as checkboxes are ticked, before the API call.
  const liveRiskLevel = useMemo((): string | null => {
    const {
      law_enforcement,
      border_control,
      justice_system,
      hr_recruitment_screening,
      hr_promotion_termination,
      credit_worthiness,
      insurance_risk_assessment,
      affects_fundamental_rights,
      makes_automated_decisions,
      is_safety_component,
      uses_biometric_data,
      biometric_categorization,
      emotion_recognition,
      interacts_with_humans,
      generates_synthetic_content,
    } = formData

    if (law_enforcement && uses_biometric_data && biometric_categorization) {
      return 'unacceptable'
    }

    const highRiskTriggers = [
      hr_recruitment_screening,
      hr_promotion_termination,
      credit_worthiness,
      insurance_risk_assessment,
      law_enforcement,
      border_control,
      justice_system,
      affects_fundamental_rights && makes_automated_decisions,
      is_safety_component,
    ]

    if (highRiskTriggers.some(Boolean)) {
      return 'high'
    }

    if (interacts_with_humans || generates_synthetic_content || emotion_recognition) {
      return 'limited'
    }

    return 'minimal'
  }, [formData])

  // Only treat explicitly opt-in fields as "interaction" - fields that default
  // to true would fire the preview immediately on page load before the user does anything.
  const hasInteracted = useMemo(() => {
    return (
      formData.hr_recruitment_screening ||
      formData.hr_promotion_termination ||
      formData.credit_worthiness ||
      formData.insurance_risk_assessment ||
      formData.law_enforcement ||
      formData.border_control ||
      formData.justice_system ||
      formData.is_safety_component ||
      formData.uses_biometric_data ||
      formData.biometric_categorization ||
      formData.emotion_recognition ||
      formData.generates_synthetic_content
    )
  }, [formData])

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'unacceptable':
        return <XCircle className="w-8 h-8 text-red-600" />
      case 'high':
        return <AlertTriangle className="w-8 h-8 text-orange-600" />
      case 'limited':
        return <Info className="w-8 h-8 text-yellow-600" />
      default:
        return <CheckCircle className="w-8 h-8 text-green-600" />
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'unacceptable':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'limited':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-green-50 border-green-200 text-green-800'
    }
  }

  const getRequirementContent = (level: string) =>
    requirementContent[level] || requirementContent.minimal

  const getRiskLevel = (level: string): RiskLevel => {
    if (
      level === 'minimal' ||
      level === 'limited' ||
      level === 'high' ||
      level === 'unacceptable'
    ) {
      return level
    }

    return 'minimal'
  }

  const renderTabButton = (
    tab: Tab,
    label: string,
    Icon: LucideIcon,
    locked: boolean
  ) => {
    const isActive = activeTab === tab

    return (
      <button
        type="button"
        onClick={() => {
          if (!locked) {
            setActiveTab(tab)
          }
        }}
        disabled={locked}
        className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        } ${locked ? 'opacity-50 cursor-not-allowed hover:border-transparent hover:text-gray-500' : ''}`}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        {locked && <Lock className="w-3.5 h-3.5" />}
      </button>
    )
  }

  const renderQuestionnaire = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Classification Questionnaire
      </h2>

      <form className="space-y-6">
        {/* Use Case Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Use Case
          </label>
          <select
            value={formData.use_case_category}
            onChange={(e) =>
              setFormData({ ...formData, use_case_category: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="hr_recruitment">HR / Recruitment</option>
            <option value="credit_scoring">Credit Scoring</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
            <option value="customer_service">Customer Service</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* High-Risk Indicators */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            High-Risk Indicators (Annex III)
          </h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.hr_recruitment_screening}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hr_recruitment_screening: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>CV Screening / Candidate Ranking</strong>
                <br />
                AI filters CVs or ranks candidates for recruitment
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.hr_promotion_termination}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hr_promotion_termination: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Promotion/Termination Decisions</strong>
                <br />
                AI influences employment status decisions
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.credit_worthiness}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credit_worthiness: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Credit Worthiness Assessment</strong>
                <br />
                AI evaluates creditworthiness or credit scoring
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.insurance_risk_assessment}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    insurance_risk_assessment: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Insurance Risk Assessment</strong>
                <br />
                AI evaluates risk for insurance pricing or eligibility
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.law_enforcement}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    law_enforcement: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Law Enforcement Use</strong>
                <br />
                Used by police or judicial authorities for decisions
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.border_control}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    border_control: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Border Control / Migration</strong>
                <br />
                Used for visa, asylum, or border management decisions
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.justice_system}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    justice_system: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Justice System / Legal Aid</strong>
                <br />
                Assists courts or legal processes with decisions
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.is_safety_component}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_safety_component: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Safety-Critical Component</strong>
                <br />
                Part of a product regulated under EU safety legislation
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.uses_biometric_data}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    uses_biometric_data: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Uses Biometric Data</strong>
                <br />
                Processes fingerprints, face scans, or other biometrics
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.biometric_categorization}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    biometric_categorization: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Biometric Categorization</strong>
                <br />
                Categorizes people by race, gender, or political views from biometrics
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.affects_fundamental_rights}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    affects_fundamental_rights: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Affects Fundamental Rights</strong>
                <br />
                Impacts employment, education, or essential services
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.makes_automated_decisions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    makes_automated_decisions: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Automated Decision Making</strong>
                <br />
                Makes decisions without meaningful human review
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.education_vocational_training}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    education_vocational_training: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Education & Vocational Training</strong>
                <br />
                AI determines access to or assigns persons to educational institutions
              </span>
            </label>
          </div>
        </div>

        {/* Transparency Requirements */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Transparency Indicators (Article 52)
          </h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.interacts_with_humans}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interacts_with_humans: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Direct Human Interaction</strong>
                <br />
                System interacts directly with users (chatbot, assistant)
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.emotion_recognition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emotion_recognition: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Emotion Recognition</strong>
                <br />
                System detects or analyzes emotions
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.generates_synthetic_content}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    generates_synthetic_content: e.target.checked,
                  })
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong>Synthetic Content Generation</strong>
                <br />
                Generates deepfakes, AI images, or synthetic media
              </span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => classifyMutation.mutate()}
          disabled={classifyMutation.isPending}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {classifyMutation.isPending ? 'Classifying...' : 'Classify Risk Level'}
        </button>
      </form>
    </div>
  )

  const renderResults = () => {
    if (classifyMutation.isPending && !result) {
      return (
        <div className="space-y-4">
          <Skeleton variant="card" count={1} />
        </div>
      )
    }

    if (result) {
      return (
        <div className={`rounded-2xl border-0 p-8 glass animate-in overflow-hidden relative group`}>
          <div
            className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${
              result.risk_level === 'unacceptable'
                ? 'bg-red-500'
                : result.risk_level === 'high'
                ? 'bg-orange-500'
                : result.risk_level === 'limited'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div className="flex items-center gap-5">
                <div
                  className={`p-4 rounded-2xl shadow-inner ${
                    result.risk_level === 'unacceptable'
                      ? 'bg-red-100'
                      : result.risk_level === 'high'
                      ? 'bg-orange-100'
                      : result.risk_level === 'limited'
                      ? 'bg-yellow-100'
                      : 'bg-green-100'
                  }`}
                >
                  {getRiskIcon(result.risk_level)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
                      {result.risk_level} Risk
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        result.risk_level === 'unacceptable'
                          ? 'bg-red-200 text-red-800'
                          : result.risk_level === 'high'
                          ? 'bg-orange-200 text-orange-800'
                          : result.risk_level === 'limited'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-green-200 text-green-800'
                      }`}
                    >
                      AI Act Classified
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          result.confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      {Math.round(result.confidence * 100)}% Confidence
                    </p>
                  </div>
                </div>
              </div>

              <CopyButton
                text={buildClassificationReport(result)}
                label="Copy Report"
                successMessage="Classification report copied!"
                className="shrink-0"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary-500 rounded-full"></span>
                    Why this classification?
                  </h3>
                  <ul className="space-y-3">
                    {result.reasons.map((reason, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-3 group/item">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 group-hover/item:scale-125 transition-transform" />
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary-500 rounded-full"></span>
                    Legal Requirements
                  </h3>
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    <ul className="space-y-3">
                      {result.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="font-medium">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary-500 rounded-full"></span>
                    Action Plan
                  </h3>
                  <div className="space-y-4">
                    {result.next_steps.map((step, i) => (
                      <div key={i} className="flex gap-4 group/step">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shadow-sm group-hover/step:border-primary-500 group-hover/step:bg-primary-500 group-hover/step:text-white transition-all">
                            {i + 1}
                          </div>
                          {i < result.next_steps.length - 1 && (
                            <div className="w-0.5 h-full bg-primary-50 my-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 pt-1.5 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {result.risk_level !== 'unacceptable' && (
              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Interactive Compliance Checklist</h3>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    {CHECKLIST_ITEMS[result.risk_level]?.length || 0} ITEMS REQUIRED
                  </span>
                </div>

                {systemId ? (
                  <ComplianceChecklist
                    systemId={Number(systemId)}
                    riskLevel={result.risk_level as 'minimal' | 'limited' | 'high' | 'unacceptable'}
                    items={CHECKLIST_ITEMS[result.risk_level] || []}
                  />
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Save this AI system first to track checklist progress.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (hasInteracted && liveRiskLevel) {
      return (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm animate-in">
          <div className="flex items-center gap-3 mb-6">
            {getRiskIcon(liveRiskLevel)}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
                  {liveRiskLevel} Risk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                  Preview
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Submit the form for full analysis and compliance roadmap
              </p>
            </div>
          </div>

          <div
            className={`rounded-xl p-4 mb-6 ${
              liveRiskLevel === 'unacceptable'
                ? 'bg-red-50 border border-red-100'
                : liveRiskLevel === 'high'
                ? 'bg-orange-50 border border-orange-100'
                : liveRiskLevel === 'limited'
                ? 'bg-yellow-50 border border-yellow-100'
                : 'bg-green-50 border border-green-100'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                liveRiskLevel === 'unacceptable'
                  ? 'text-red-800'
                  : liveRiskLevel === 'high'
                  ? 'text-orange-800'
                  : liveRiskLevel === 'limited'
                  ? 'text-yellow-800'
                  : 'text-green-800'
              }`}
            >
              {liveRiskLevel === 'unacceptable' && 'This system may be prohibited under EU AI Act Article 5. Review immediately.'}
              {liveRiskLevel === 'high' && 'High-risk systems require technical documentation, conformity assessment, and human oversight (Annex III).' }
              {liveRiskLevel === 'limited' && 'Limited-risk systems must meet transparency obligations under Article 52.'}
              {liveRiskLevel === 'minimal' && 'Minimal risk - no mandatory obligations, but voluntary best practices are recommended.'}
            </p>
          </div>

          <p className="text-xs text-gray-400 text-center">
            This is a real-time estimate based on your selections. Click <strong>Classify Risk Level</strong> for the full AI Act analysis.
          </p>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Classification</h3>
        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
          Complete the questionnaire to generate your AI Act risk profile and compliance roadmap.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-200 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-200 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-200 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  const renderRequirements = () => {
    if (!result) {
      return null
    }

    const content = getRequirementContent(result.risk_level)
    const riskLevel = getRiskLevel(result.risk_level)

    return (
      <div className="space-y-6">
        <div className={`rounded-xl border p-6 ${getRiskColor(result.risk_level)}`}>
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{content.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{content.description}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">EU AI Act Obligations</h3>
          <ol className="space-y-3">
            {content.obligations.map((obligation, i) => (
              <li key={obligation} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {i + 1}
                </span>
                <span>{obligation}</span>
              </li>
            ))}
          </ol>
        </div>

        {riskLevel !== 'unacceptable' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Interactive Compliance Checklist
              </h3>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                {CHECKLIST_ITEMS[riskLevel]?.length || 0} ITEMS REQUIRED
              </span>
            </div>

            <ComplianceChecklist
              systemId={Number(systemId || 0)}
              riskLevel={riskLevel}
              items={CHECKLIST_ITEMS[riskLevel] || []}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Classification</h1>
          <p className="text-gray-600">
            Determine your AI system's risk level under EU AI Act
          </p>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {renderTabButton('questionnaire', 'Questionnaire', ClipboardList, false)}
            {renderTabButton('results', 'Results', BarChart2, !result)}
            {renderTabButton('requirements', 'Requirements', ShieldCheck, !result)}
          </div>
        </div>
      </div>

      {activeTab === 'questionnaire' && renderQuestionnaire()}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'requirements' && renderRequirements()}
    </div>
  )
}
