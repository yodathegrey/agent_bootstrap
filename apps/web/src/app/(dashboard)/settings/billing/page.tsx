"use client";

import { useState } from "react";

const currentPlan = {
  name: "Team",
  price: "$199/mo",
  renewalDate: "April 15, 2026",
  trialActive: false,
};

const usage = {
  agentRuns: { used: 6_842, limit: 10_000, label: "Agent Runs" },
  llmTokens: { used: 3_200_000, limit: 5_000_000, label: "LLM Tokens" },
  activeUsers: { used: 14, limit: 25, label: "Active Users" },
  agents: { used: 9, limit: 15, label: "Agents" },
};

const invoices = [
  { id: "INV-2026-003", date: "March 1, 2026", amount: "$199.00", status: "Paid" },
  { id: "INV-2026-002", date: "February 1, 2026", amount: "$214.60", status: "Paid" },
  { id: "INV-2026-001", date: "January 1, 2026", amount: "$199.00", status: "Paid" },
  { id: "INV-2025-012", date: "December 1, 2025", amount: "$227.40", status: "Paid" },
  { id: "INV-2025-011", date: "November 1, 2025", amount: "$199.00", status: "Paid" },
];

function ProgressBar({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number;
  label: string;
}) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {formatNumber(used)} / {formatNumber(limit)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            isCritical
              ? "bg-red-500"
              : isWarning
              ? "bg-yellow-500"
              : "bg-indigo-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Billing & Subscription
      </h1>

      {/* Current Plan */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Current Plan
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                {currentPlan.name}
              </span>
              <span className="text-gray-600">{currentPlan.price}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Next renewal: {currentPlan.renewalDate}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
            </button>
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Downgrade
            </button>
          </div>
        </div>
      </section>

      {/* Usage Dashboard */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Usage This Period
          </h2>
          <a
            href="/settings/billing/usage"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View detailed usage
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.values(usage).map((item) => (
            <ProgressBar
              key={item.label}
              used={item.used}
              limit={item.limit}
              label={item.label}
            />
          ))}
        </div>
      </section>

      {/* Payment Method */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Method
        </h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 bg-gray-800 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Visa ending in 4242
              </p>
              <p className="text-xs text-gray-500">Expires 12/2027</p>
            </div>
          </div>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Update
          </button>
        </div>
        {/* Stripe Elements placeholder */}
        <div
          id="stripe-card-element"
          className="mt-4 hidden"
          aria-label="Stripe Card Element will be mounted here"
        />
        <div className="mt-4">
          <a
            href="#"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Manage billing in Stripe Customer Portal
          </a>
        </div>
      </section>

      {/* Invoice History */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Invoice History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 pl-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900">
                    {invoice.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {invoice.date}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {invoice.amount}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to Enterprise
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Get unlimited users, unlimited agents, custom limits, dedicated
              support, and advanced compliance features. Contact our sales team
              to discuss your requirements.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <a
                href="/contact-sales"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
