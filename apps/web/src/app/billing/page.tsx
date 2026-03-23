"use client";

import { useState } from "react";

const tiers = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For individuals and small teams getting started with AI agents.",
    features: [
      "5 users",
      "3 agents",
      "1,000 agent runs / month",
      "500K LLM tokens / month",
      "Community support",
      "Basic analytics",
      "Email notifications",
    ],
    cta: "Start Free Trial",
    href: "/signup?plan=starter",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$199",
    period: "/mo",
    description: "For growing teams that need more agents, higher limits, and priority support.",
    features: [
      "25 users",
      "15 agents",
      "10,000 agent runs / month",
      "5M LLM tokens / month",
      "Priority support",
      "Advanced analytics",
      "Custom skills",
      "Webhook integrations",
      "SSO (SAML)",
    ],
    cta: "Start Free Trial",
    href: "/signup?plan=team",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced security, compliance, and scale requirements.",
    features: [
      "Unlimited users",
      "Unlimited agents",
      "Custom run limits",
      "Custom token limits",
      "Dedicated support & SLA",
      "Audit logs & compliance reports",
      "Data residency controls",
      "Custom LLM provider routing",
      "SSO + SCIM provisioning",
      "On-premises deployment option",
    ],
    cta: "Contact Sales",
    href: "/contact-sales",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "What happens after my free trial ends?",
    answer:
      "After your 14-day free trial, you can add a payment method to continue on your chosen plan. If you do not add a payment method, your agents will be paused but your data will be retained for 30 days.",
  },
  {
    question: "Can I upgrade or downgrade at any time?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time from your billing settings. When upgrading, you gain immediate access to higher limits. When downgrading, the change takes effect at the start of your next billing cycle.",
  },
  {
    question: "How does usage-based billing work?",
    answer:
      "Each plan includes a monthly allowance of agent runs and LLM tokens. If you exceed your allowance, overage charges are applied at the rates listed for your tier. You can monitor your usage in real time from the billing dashboard.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover). Enterprise customers can pay via invoice with net-30 terms.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "Yes. We use Stripe for payment processing. Your card details are collected directly by Stripe and never touch our servers. We are PCI SAQ-A compliant.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. You can cancel your subscription at any time. You will retain access to your plan features until the end of your current billing period. There are no cancellation fees.",
  },
];

export default function BillingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Trial Banner */}
      <div className="bg-indigo-600 text-white text-center py-3 px-4 text-sm font-medium">
        14-day free trial, no credit card required
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
          Choose the plan that fits your team. Start with a free trial and scale
          as you grow.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border ${
                tier.highlighted
                  ? "border-indigo-600 ring-2 ring-indigo-600 shadow-lg"
                  : "border-gray-200 shadow-sm"
              } p-8 flex flex-col`}
            >
              {tier.highlighted && (
                <span className="inline-flex self-start rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4">
                  Most Popular
                </span>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">
                  {tier.price}
                </span>
                <span className="ml-1 text-lg text-gray-500">
                  {tier.period}
                </span>
              </div>
              <p className="mt-4 text-gray-600">{tier.description}</p>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={tier.href}
                className={`mt-8 block w-full rounded-lg py-3 px-4 text-center text-sm font-semibold ${
                  tier.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-50 text-gray-900 border border-gray-300 hover:bg-gray-100"
                } transition-colors`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Feature Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 text-sm font-semibold text-gray-900">
                  Feature
                </th>
                <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">
                  Starter
                </th>
                <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">
                  Team
                </th>
                <th className="py-3 pl-4 text-sm font-semibold text-gray-900 text-center">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {[
                ["Users", "5", "25", "Unlimited"],
                ["Agents", "3", "15", "Unlimited"],
                ["Agent runs / month", "1,000", "10,000", "Custom"],
                ["LLM tokens / month", "500K", "5M", "Custom"],
                ["Overage rate (per 1K tokens)", "$0.01", "$0.008", "Negotiated"],
                ["Support", "Community", "Priority", "Dedicated + SLA"],
                ["Analytics", "Basic", "Advanced", "Advanced + Custom"],
                ["Custom skills", "---", "Yes", "Yes"],
                ["SSO", "---", "SAML", "SAML + SCIM"],
                ["Data residency controls", "---", "---", "Yes"],
                ["Audit logs", "---", "---", "Yes"],
              ].map(([feature, starter, team, enterprise]) => (
                <tr key={feature} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-medium">{feature}</td>
                  <td className="py-3 px-4 text-center">{starter}</td>
                  <td className="py-3 px-4 text-center">{team}</td>
                  <td className="py-3 pl-4 text-center">{enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() =>
                  setExpandedFaq(expandedFaq === index ? null : index)
                }
                className="w-full flex justify-between items-center px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-gray-900">
                  {faq.question}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform ${
                    expandedFaq === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
              {expandedFaq === index && (
                <div className="px-6 pb-4 text-sm text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
